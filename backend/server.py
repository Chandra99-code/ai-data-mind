"""DataMind AI - Backend API"""
import os
import io
import json
import uuid
import logging
import asyncio
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

import jwt as pyjwt
import bcrypt
import httpx
import numpy as np
import pandas as pd
from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Request, Response, Cookie, Header
from fastapi.responses import StreamingResponse, JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pydantic import BaseModel, EmailStr, Field, ConfigDict

from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier, IsolationForest
from sklearn.cluster import KMeans
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import (
    mean_squared_error, r2_score, mean_absolute_error,
    accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
)

from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
EMERGENT_LLM_KEY = os.environ['EMERGENT_LLM_KEY']
UPLOAD_DIR = Path(os.environ['UPLOAD_DIR'])
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("datamind")

app = FastAPI(title="DataMind AI")
api = APIRouter(prefix="/api")


def now_utc(): return datetime.now(timezone.utc)
def new_id(prefix): return f"{prefix}_{uuid.uuid4().hex[:12]}"
def hash_pw(pw): return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()
def verify_pw(pw, hashed):
    try: return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception: return False

def make_jwt(user_id):
    return pyjwt.encode({"user_id": user_id, "exp": now_utc() + timedelta(days=7), "iat": now_utc()}, JWT_SECRET, algorithm="HS256")

def decode_jwt(token):
    try:
        p = pyjwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return p.get("user_id")
    except Exception:
        return None


async def get_current_user(request: Request, session_token: Optional[str] = Cookie(default=None), authorization: Optional[str] = Header(default=None)):
    if authorization and authorization.startswith("Bearer "):
        uid = decode_jwt(authorization.split(" ", 1)[1])
        if uid:
            u = await db.users.find_one({"user_id": uid}, {"_id": 0})
            if u: return u
    tok = session_token or request.cookies.get("session_token")
    if tok:
        s = await db.user_sessions.find_one({"session_token": tok}, {"_id": 0})
        if s:
            exp = s["expires_at"]
            if isinstance(exp, str): exp = datetime.fromisoformat(exp)
            if exp.tzinfo is None: exp = exp.replace(tzinfo=timezone.utc)
            if exp >= now_utc():
                u = await db.users.find_one({"user_id": s["user_id"]}, {"_id": 0})
                if u: return u
    raise HTTPException(status_code=401, detail="Not authenticated")


class SignupIn(BaseModel):
    email: EmailStr; password: str = Field(min_length=6); name: str

class LoginIn(BaseModel):
    email: EmailStr; password: str

class ChatMessageIn(BaseModel):
    message: str; dataset_id: Optional[str] = None; conversation_id: Optional[str] = None

class MLRequestIn(BaseModel):
    dataset_id: str; target: str; task: str; features: Optional[List[str]] = None

class ReportIn(BaseModel):
    dataset_id: str; title: str; sections: List[Dict[str, Any]] = []

class CleanIn(BaseModel):
    dataset_id: str
    drop_duplicates: bool = True
    fill_numeric: str = "median"
    fill_categorical: str = "mode"
    drop_empty_cols: bool = True
    remove_outliers: bool = False


# ---------- Auth ----------
@api.post("/auth/signup")
async def signup(body: SignupIn):
    if await db.users.find_one({"email": body.email.lower()}, {"_id": 0}):
        raise HTTPException(400, "Email already registered")
    uid = new_id("user")
    doc = {"user_id": uid, "email": body.email.lower(), "name": body.name,
           "password_hash": hash_pw(body.password), "picture": None, "plan": "free",
           "provider": "email", "created_at": now_utc().isoformat()}
    await db.users.insert_one(doc)
    doc.pop("password_hash", None); doc.pop("_id", None)
    return {"token": make_jwt(uid), "user": doc}


@api.post("/auth/login")
async def login(body: LoginIn):
    u = await db.users.find_one({"email": body.email.lower()}, {"_id": 0})
    if not u or not u.get("password_hash") or not verify_pw(body.password, u["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    u.pop("password_hash", None)
    return {"token": make_jwt(u["user_id"]), "user": u}


@api.post("/auth/google/session")
async def google_session(request: Request, response: Response):
    sid = request.headers.get("X-Session-ID")
    if not sid: raise HTTPException(400, "Missing X-Session-ID")
    async with httpx.AsyncClient(timeout=10.0) as h:
        r = await h.get("https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data", headers={"X-Session-ID": sid})
    if r.status_code != 200:
        raise HTTPException(401, "Invalid session")
    d = r.json()
    email = d["email"].lower()
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        uid = existing["user_id"]
        await db.users.update_one({"user_id": uid}, {"$set": {"name": d.get("name"), "picture": d.get("picture")}})
    else:
        uid = new_id("user")
        await db.users.insert_one({"user_id": uid, "email": email, "name": d.get("name"),
                                    "picture": d.get("picture"), "provider": "google",
                                    "plan": "free", "created_at": now_utc().isoformat()})
    st = d["session_token"]
    await db.user_sessions.insert_one({"user_id": uid, "session_token": st,
                                         "expires_at": (now_utc() + timedelta(days=7)).isoformat(),
                                         "created_at": now_utc().isoformat()})
    response.set_cookie("session_token", st, httponly=True, secure=True, samesite="none", path="/", max_age=7*24*3600)
    u = await db.users.find_one({"user_id": uid}, {"_id": 0, "password_hash": 0})
    return {"user": u}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    user.pop("password_hash", None)
    return user


@api.post("/auth/logout")
async def logout(response: Response, session_token: Optional[str] = Cookie(default=None)):
    if session_token: await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


# ---------- Data helpers ----------
def _read_df(path: Path, filename: str) -> pd.DataFrame:
    l = filename.lower()
    if l.endswith(".csv"): return pd.read_csv(path)
    if l.endswith((".xlsx", ".xls")): return pd.read_excel(path)
    if l.endswith(".json"): return pd.read_json(path)
    if l.endswith(".parquet"): return pd.read_parquet(path)
    raise HTTPException(400, "Unsupported file format")


def _infer_schema(df):
    out = []
    for c in df.columns:
        s = df[c]
        if pd.api.types.is_numeric_dtype(s): kind = "numeric"
        elif pd.api.types.is_datetime64_any_dtype(s): kind = "datetime"
        elif pd.api.types.is_bool_dtype(s): kind = "boolean"
        else: kind = "categorical"
        out.append({"name": str(c), "dtype": str(s.dtype), "kind": kind,
                    "missing": int(s.isna().sum()), "unique": int(s.nunique(dropna=True))})
    return out


def _sanitize(v):
    if v is None: return None
    if isinstance(v, float) and (np.isnan(v) or np.isinf(v)): return None
    if isinstance(v, (np.integer,)): return int(v)
    if isinstance(v, (np.floating,)):
        return None if (np.isnan(v) or np.isinf(v)) else float(v)
    if isinstance(v, (np.bool_,)): return bool(v)
    if isinstance(v, pd.Timestamp): return v.isoformat()
    return v


def _preview(df, n=20):
    rows = df.head(n).to_dict(orient="records")
    return [{k: _sanitize(v) for k, v in r.items()} for r in rows]


async def _load_df_for(user_id, dataset_id):
    doc = await db.datasets.find_one({"dataset_id": dataset_id, "user_id": user_id})
    if not doc: raise HTTPException(404, "Dataset not found")
    df = _read_df(Path(doc["path"]), doc["name"])
    return df, doc


# ---------- Datasets ----------
@api.post("/datasets/upload")
async def upload_dataset(file: UploadFile = File(...), user=Depends(get_current_user)):
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 50MB)")
    ds_id = new_id("ds")
    ext = Path(file.filename).suffix
    dest = UPLOAD_DIR / f"{ds_id}{ext}"
    with open(dest, "wb") as f: f.write(content)
    try:
        df = _read_df(dest, file.filename)
    except Exception as e:
        dest.unlink(missing_ok=True)
        raise HTTPException(400, f"Failed to parse file: {e}")
    doc = {"dataset_id": ds_id, "user_id": user["user_id"], "name": file.filename,
           "path": str(dest), "rows": int(len(df)), "cols": int(len(df.columns)),
           "size_bytes": len(content), "schema": _infer_schema(df),
           "created_at": now_utc().isoformat()}
    await db.datasets.insert_one(doc)
    await db.notifications.insert_one({"notif_id": new_id("n"), "user_id": user["user_id"],
        "type": "upload", "title": f"Dataset uploaded: {file.filename}",
        "body": f"{len(df)} rows × {len(df.columns)} columns", "read": False,
        "created_at": now_utc().isoformat()})
    doc.pop("_id", None); doc["preview"] = _preview(df, 10)
    return doc


@api.get("/datasets")
async def list_datasets(user=Depends(get_current_user)):
    return await db.datasets.find({"user_id": user["user_id"]}, {"_id": 0, "path": 0}).sort("created_at", -1).to_list(100)


@api.get("/datasets/{dataset_id}")
async def get_dataset(dataset_id: str, user=Depends(get_current_user)):
    doc = await db.datasets.find_one({"dataset_id": dataset_id, "user_id": user["user_id"]}, {"_id": 0})
    if not doc: raise HTTPException(404, "Not found")
    df = _read_df(Path(doc["path"]), doc["name"])
    doc.pop("path", None); doc["preview"] = _preview(df, 50)
    return doc


@api.delete("/datasets/{dataset_id}")
async def delete_dataset(dataset_id: str, user=Depends(get_current_user)):
    doc = await db.datasets.find_one({"dataset_id": dataset_id, "user_id": user["user_id"]})
    if not doc: raise HTTPException(404, "Not found")
    Path(doc["path"]).unlink(missing_ok=True)
    await db.datasets.delete_one({"dataset_id": dataset_id})
    return {"ok": True}


# ---------- EDA ----------
@api.get("/datasets/{dataset_id}/eda")
async def eda(dataset_id: str, user=Depends(get_current_user)):
    df, doc = await _load_df_for(user["user_id"], dataset_id)
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = df.select_dtypes(include=["object", "category", "bool"]).columns.tolist()
    summary = {}
    for c in numeric_cols:
        s = df[c].dropna()
        if len(s) == 0: continue
        summary[c] = {"count": int(s.count()), "mean": _sanitize(s.mean()),
                      "std": _sanitize(s.std()), "min": _sanitize(s.min()),
                      "q25": _sanitize(s.quantile(0.25)), "median": _sanitize(s.median()),
                      "q75": _sanitize(s.quantile(0.75)), "max": _sanitize(s.max())}
    missing = {c: int(df[c].isna().sum()) for c in df.columns}
    corr = {}
    if len(numeric_cols) >= 2:
        cm = df[numeric_cols].corr().fillna(0)
        corr = {"columns": numeric_cols,
                "matrix": [[_sanitize(cm.iloc[i, j]) for j in range(len(numeric_cols))]
                           for i in range(len(numeric_cols))]}
    distributions = {}
    for c in numeric_cols[:8]:
        s = df[c].dropna()
        if len(s) == 0: continue
        hist, edges = np.histogram(s, bins=20)
        distributions[c] = {"bins": [_sanitize(e) for e in edges.tolist()],
                            "counts": [int(x) for x in hist.tolist()]}
    categories = {}
    for c in cat_cols[:6]:
        vc = df[c].astype(str).value_counts().head(10)
        categories[c] = [{"label": str(k), "count": int(v)} for k, v in vc.items()]
    duplicates = int(df.duplicated().sum())
    outliers = {}
    for c in numeric_cols[:10]:
        s = df[c].dropna()
        if len(s) < 10: continue
        q1, q3 = s.quantile(0.25), s.quantile(0.75)
        iqr = q3 - q1
        outliers[c] = int(((s < q1 - 1.5*iqr) | (s > q3 + 1.5*iqr)).sum())
    return {"dataset_id": dataset_id, "rows": int(len(df)), "cols": int(len(df.columns)),
            "numeric_cols": numeric_cols, "categorical_cols": cat_cols,
            "summary": summary, "missing": missing, "duplicates": duplicates,
            "outliers": outliers, "correlation": corr,
            "distributions": distributions, "categories": categories}


# ---------- Cleaning ----------
@api.post("/clean")
async def clean_dataset(body: CleanIn, user=Depends(get_current_user)):
    df, doc = await _load_df_for(user["user_id"], body.dataset_id)
    before = {"rows": int(len(df)), "cols": int(len(df.columns)),
              "missing": int(df.isna().sum().sum()), "duplicates": int(df.duplicated().sum())}
    if body.drop_empty_cols: df = df.dropna(axis=1, how="all")
    if body.drop_duplicates: df = df.drop_duplicates()
    for c in df.columns:
        if df[c].isna().any():
            if pd.api.types.is_numeric_dtype(df[c]):
                if body.fill_numeric == "median": df[c] = df[c].fillna(df[c].median())
                elif body.fill_numeric == "mean": df[c] = df[c].fillna(df[c].mean())
                elif body.fill_numeric == "zero": df[c] = df[c].fillna(0)
            else:
                if body.fill_categorical == "mode":
                    m = df[c].mode()
                    if len(m) > 0: df[c] = df[c].fillna(m[0])
                elif body.fill_categorical == "unknown":
                    df[c] = df[c].fillna("Unknown")
    if body.remove_outliers:
        for c in df.select_dtypes(include=[np.number]).columns:
            s = df[c]; q1, q3 = s.quantile(0.25), s.quantile(0.75); iqr = q3 - q1
            df = df[(s >= q1 - 1.5*iqr) & (s <= q3 + 1.5*iqr)]
    after = {"rows": int(len(df)), "cols": int(len(df.columns)),
             "missing": int(df.isna().sum().sum()), "duplicates": int(df.duplicated().sum())}
    new_ds_id = new_id("ds")
    dest = UPLOAD_DIR / f"{new_ds_id}.csv"
    df.to_csv(dest, index=False)
    await db.datasets.insert_one({"dataset_id": new_ds_id, "user_id": user["user_id"],
        "name": f"{doc['name']} (cleaned)", "path": str(dest),
        "rows": int(len(df)), "cols": int(len(df.columns)),
        "size_bytes": dest.stat().st_size, "schema": _infer_schema(df),
        "parent_id": body.dataset_id, "created_at": now_utc().isoformat()})
    return {"before": before, "after": after, "new_dataset_id": new_ds_id, "preview": _preview(df, 20)}


# ---------- Chat ----------
def _dataset_context(doc, df):
    lines = [f"Dataset: {doc['name']}", f"Shape: {len(df)} rows × {len(df.columns)} columns", "Columns:"]
    for col in df.columns[:30]:
        s = df[col]
        dtype = "num" if pd.api.types.is_numeric_dtype(s) else "cat"
        sample = s.dropna().astype(str).head(3).tolist()
        lines.append(f"  - {col} ({dtype}): missing={int(s.isna().sum())}, unique={int(s.nunique())}, sample={sample}")
    nc = df.select_dtypes(include=[np.number]).columns.tolist()
    if nc:
        stats = df[nc].describe().round(3).to_dict()
        try:
            lines.append("\nNumeric summary: " + json.dumps({k: {kk: _sanitize(vv) for kk, vv in v.items()} for k, v in stats.items()})[:2000])
        except Exception:
            pass
    return "\n".join(lines)


@api.post("/chat/stream")
async def chat_stream(body: ChatMessageIn, user=Depends(get_current_user)):
    conv_id = body.conversation_id or new_id("conv")
    system = ("You are DataMind AI, an elite senior data scientist. "
              "Answer with sharp insight, cite specific columns and statistics, "
              "suggest visualizations, and when relevant propose next steps (ML, forecasting, cleaning). "
              "Be concise, structured (short bullets or numbered steps), executive-friendly. Use Markdown.")
    ctx = ""
    if body.dataset_id:
        try:
            df, doc = await _load_df_for(user["user_id"], body.dataset_id)
            ctx = "\n\nCONTEXT (dataset attached):\n" + _dataset_context(doc, df)
        except Exception as e:
            ctx = f"\n\n(Could not load dataset: {e})"
    user_text = body.message + ctx

    await db.chat_messages.insert_one({"msg_id": new_id("m"), "conversation_id": conv_id,
        "user_id": user["user_id"], "role": "user", "content": body.message,
        "dataset_id": body.dataset_id, "created_at": now_utc().isoformat()})

    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=conv_id, system_message=system)\
        .with_model("anthropic", "claude-sonnet-4-5-20250929")

    async def gen():
        yield f"data: {json.dumps({'type': 'conversation', 'conversation_id': conv_id})}\n\n"
        buf = []
        try:
            async for ev in chat.stream_message(UserMessage(text=user_text)):
                if isinstance(ev, TextDelta):
                    buf.append(ev.content)
                    yield f"data: {json.dumps({'type': 'delta', 'content': ev.content})}\n\n"
                elif isinstance(ev, StreamDone):
                    break
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
        await db.chat_messages.insert_one({"msg_id": new_id("m"), "conversation_id": conv_id,
            "user_id": user["user_id"], "role": "assistant", "content": "".join(buf),
            "dataset_id": body.dataset_id, "created_at": now_utc().isoformat()})
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@api.get("/chat/conversations")
async def list_conversations(user=Depends(get_current_user)):
    pipeline = [
        {"$match": {"user_id": user["user_id"]}},
        {"$sort": {"created_at": -1}},
        {"$group": {"_id": "$conversation_id", "last_message": {"$first": "$content"},
                    "updated_at": {"$first": "$created_at"}, "count": {"$sum": 1}}},
        {"$sort": {"updated_at": -1}}, {"$limit": 30},
    ]
    convs = await db.chat_messages.aggregate(pipeline).to_list(30)
    return [{"conversation_id": c["_id"], "last_message": c["last_message"],
             "updated_at": c["updated_at"], "count": c["count"]} for c in convs]


@api.get("/chat/{conversation_id}")
async def get_conversation(conversation_id: str, user=Depends(get_current_user)):
    return await db.chat_messages.find(
        {"conversation_id": conversation_id, "user_id": user["user_id"]}, {"_id": 0}
    ).sort("created_at", 1).to_list(500)


# ---------- ML ----------
def _prep_ml_data(df, target, features):
    cols = [c for c in (features or df.columns) if c in df.columns and c != target]
    X = df[cols].copy()
    y = df[target].copy() if target in df.columns else None
    for c in X.columns:
        if not pd.api.types.is_numeric_dtype(X[c]):
            X[c] = LabelEncoder().fit_transform(X[c].astype(str))
    X = X.fillna(X.median(numeric_only=True)).fillna(0)
    return X, y, cols


@api.post("/ml/train")
async def ml_train(body: MLRequestIn, user=Depends(get_current_user)):
    df, doc = await _load_df_for(user["user_id"], body.dataset_id)
    task = body.task.lower()

    if task == "clustering":
        X, _, feats = _prep_ml_data(df, "__none__", body.features)
        Xs = StandardScaler().fit_transform(X)
        k = min(4, max(2, len(X) // 20 or 2))
        m = KMeans(n_clusters=k, n_init=10, random_state=42).fit(Xs)
        sizes = pd.Series(m.labels_).value_counts().to_dict()
        return {"task": "clustering", "k": k, "features": feats,
                "labels_preview": m.labels_.tolist()[:200],
                "cluster_sizes": {str(k): int(v) for k, v in sizes.items()},
                "inertia": float(m.inertia_)}

    if body.target not in df.columns:
        raise HTTPException(400, f"Target '{body.target}' not in dataset")
    X, y, feats = _prep_ml_data(df, body.target, body.features)

    if task == "regression":
        if not pd.api.types.is_numeric_dtype(y):
            raise HTTPException(400, "Target must be numeric for regression")
        y = y.fillna(y.median())
        Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42)
        m = RandomForestRegressor(n_estimators=100, random_state=42).fit(Xtr, ytr)
        pred = m.predict(Xte)
        imp = sorted([{"feature": f, "importance": float(i)} for f, i in zip(feats, m.feature_importances_)],
                     key=lambda x: x["importance"], reverse=True)[:15]
        return {"task": "regression",
                "metrics": {"rmse": float(np.sqrt(mean_squared_error(yte, pred))),
                            "r2": float(r2_score(yte, pred)),
                            "mae": float(mean_absolute_error(yte, pred))},
                "feature_importance": imp,
                "predictions": [{"actual": _sanitize(a), "predicted": _sanitize(p)}
                                for a, p in list(zip(yte.tolist(), pred.tolist()))[:100]]}

    if task == "classification":
        y_enc = LabelEncoder().fit_transform(y.fillna("unknown").astype(str))
        strat = y_enc if len(set(y_enc)) > 1 else None
        Xtr, Xte, ytr, yte = train_test_split(X, y_enc, test_size=0.2, random_state=42, stratify=strat)
        m = RandomForestClassifier(n_estimators=100, random_state=42).fit(Xtr, ytr)
        pred = m.predict(Xte)
        imp = sorted([{"feature": f, "importance": float(i)} for f, i in zip(feats, m.feature_importances_)],
                     key=lambda x: x["importance"], reverse=True)[:15]
        return {"task": "classification",
                "metrics": {"accuracy": float(accuracy_score(yte, pred)),
                            "precision": float(precision_score(yte, pred, average="weighted", zero_division=0)),
                            "recall": float(recall_score(yte, pred, average="weighted", zero_division=0)),
                            "f1": float(f1_score(yte, pred, average="weighted", zero_division=0))},
                "confusion_matrix": confusion_matrix(yte, pred).tolist(),
                "feature_importance": imp}

    if task == "forecasting":
        if not pd.api.types.is_numeric_dtype(y):
            raise HTTPException(400, "Target must be numeric for forecasting")
        s = y.dropna().reset_index(drop=True)
        n = len(s)
        if n < 10:
            raise HTTPException(400, "Need at least 10 points for forecasting")
        Xf = np.arange(n).reshape(-1, 1)
        m = LinearRegression().fit(Xf, s.values)
        horizon = min(24, max(6, n // 4))
        fc = m.predict(np.arange(n, n + horizon).reshape(-1, 1)).tolist()
        return {"task": "forecasting",
                "history": [_sanitize(v) for v in s.tolist()],
                "forecast": [_sanitize(v) for v in fc], "horizon": horizon,
                "slope": float(m.coef_[0]), "intercept": float(m.intercept_)}

    raise HTTPException(400, f"Unknown task '{task}'")


# ---------- Reports ----------
@api.post("/reports")
async def create_report(body: ReportIn, user=Depends(get_current_user)):
    rid = new_id("rep")
    doc = {"report_id": rid, "user_id": user["user_id"], "dataset_id": body.dataset_id,
           "title": body.title, "sections": body.sections,
           "created_at": now_utc().isoformat()}
    await db.reports.insert_one(doc); doc.pop("_id", None); return doc


@api.get("/reports")
async def list_reports(user=Depends(get_current_user)):
    return await db.reports.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)


@api.get("/reports/{report_id}")
async def get_report(report_id: str, user=Depends(get_current_user)):
    doc = await db.reports.find_one({"report_id": report_id, "user_id": user["user_id"]}, {"_id": 0})
    if not doc: raise HTTPException(404, "Not found")
    return doc


@api.delete("/reports/{report_id}")
async def delete_report(report_id: str, user=Depends(get_current_user)):
    await db.reports.delete_one({"report_id": report_id, "user_id": user["user_id"]})
    return {"ok": True}


# ---------- Notifications ----------
@api.get("/notifications")
async def notifications(user=Depends(get_current_user)):
    return await db.notifications.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(30)


@api.post("/notifications/read-all")
async def notifications_read_all(user=Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["user_id"]}, {"$set": {"read": True}})
    return {"ok": True}


# ---------- Autonomous AI Insights ----------
@api.get("/datasets/{dataset_id}/insights")
async def dataset_insights(dataset_id: str, user=Depends(get_current_user)):
    df, doc = await _load_df_for(user["user_id"], dataset_id)
    ctx = _dataset_context(doc, df)
    system = ("You are DataMind AI, an autonomous senior data scientist. "
              "Return ONLY a JSON array (no prose, no markdown fences) of 6-10 concise insights. "
              "Each item: {\"title\": str, \"insight\": str, "
              "\"category\": one of ['quality','trend','anomaly','correlation','opportunity','risk'], "
              "\"impact\": one of ['low','medium','high']}.")
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"insights_{dataset_id}",
                   system_message=system).with_model("anthropic", "claude-sonnet-4-5-20250929")
    buf = []
    try:
        async for ev in chat.stream_message(UserMessage(text=ctx)):
            if isinstance(ev, TextDelta): buf.append(ev.content)
            elif isinstance(ev, StreamDone): break
    except Exception as e:
        logger.exception("insights fail")
        raise HTTPException(500, str(e))
    text = "".join(buf).strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"): text = text[4:]
    try:
        items = json.loads(text)
    except Exception:
        try:
            items = json.loads(text[text.index("["):text.rindex("]")+1])
        except Exception:
            items = [{"title": "AI Analysis", "insight": text[:300], "category": "opportunity", "impact": "medium"}]
    return {"dataset_id": dataset_id, "insights": items}


@api.get("/")
async def root(): return {"service": "DataMind AI", "status": "ok", "time": now_utc().isoformat()}


app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=True,
                   allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
                   allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
async def ensure_indexes():
    await db.users.create_index("user_id", unique=True)
    await db.users.create_index("email", unique=True)
    await db.datasets.create_index("dataset_id", unique=True)
    await db.datasets.create_index("user_id")
    await db.user_sessions.create_index("session_token", unique=True)
    await db.chat_messages.create_index([("conversation_id", 1), ("created_at", 1)])
    await db.reports.create_index("report_id", unique=True)
    await db.notifications.create_index([("user_id", 1), ("created_at", -1)])
    logger.info("DataMind AI backend ready")


@app.on_event("shutdown")
async def shutdown_db(): client.close()

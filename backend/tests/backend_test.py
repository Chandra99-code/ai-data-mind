"""DataMind AI - Backend integration tests"""
import os
import io
import json
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ai-analyst-hub-18.preview.emergentagent.com').rstrip('/')
# Read backend URL from frontend/.env for correctness
try:
    with open('/app/frontend/.env') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip().rstrip('/')
except Exception:
    pass

API = f"{BASE_URL}/api"

UNIQUE = uuid.uuid4().hex[:8]
EMAIL = f"test_{UNIQUE}@datamind.ai"
PASSWORD = "Test1234!"
NAME = "Test User"

CSV_DATA = """sepal_length,sepal_width,petal_length,petal_width,species
5.1,3.5,1.4,0.2,setosa
4.9,3.0,1.4,0.2,setosa
4.7,3.2,1.3,0.2,setosa
4.6,3.1,1.5,0.2,setosa
5.0,3.6,1.4,0.2,setosa
7.0,3.2,4.7,1.4,versicolor
6.4,3.2,4.5,1.5,versicolor
6.9,3.1,4.9,1.5,versicolor
5.5,2.3,4.0,1.3,versicolor
6.5,2.8,4.6,1.5,versicolor
6.3,3.3,6.0,2.5,virginica
5.8,2.7,5.1,1.9,virginica
7.1,3.0,5.9,2.1,virginica
6.3,2.9,5.6,1.8,virginica
6.5,3.0,5.8,2.2,virginica
7.6,3.0,6.6,2.1,virginica
4.9,2.5,4.5,1.7,virginica
7.3,2.9,6.3,1.8,virginica
6.7,2.5,5.8,1.8,virginica
7.2,3.6,6.1,2.5,virginica
"""

state = {}


@pytest.fixture(scope="session")
def token():
    if "token" in state:
        return state["token"]
    r = requests.post(f"{API}/auth/signup", json={"email": EMAIL, "password": PASSWORD, "name": NAME}, timeout=30)
    assert r.status_code == 200, f"signup failed: {r.status_code} {r.text}"
    d = r.json()
    assert "token" in d and "user" in d
    state["token"] = d["token"]
    state["user_id"] = d["user"]["user_id"]
    return d["token"]


@pytest.fixture(scope="session")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ---- Health / root ----
def test_root():
    r = requests.get(f"{API}/", timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d.get("service") == "DataMind AI"
    assert d.get("status") == "ok"


# ---- Auth ----
def test_signup_creates_user(token):
    assert token
    assert token.count(".") == 2  # JWT format


def test_login_success():
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert "token" in d and d["user"]["email"] == EMAIL


def test_login_wrong_password():
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": "wrong-pw-xyz"}, timeout=15)
    assert r.status_code == 401


def test_me(auth_headers):
    r = requests.get(f"{API}/auth/me", headers=auth_headers, timeout=15)
    assert r.status_code == 200
    assert r.json()["email"] == EMAIL


def test_logout(auth_headers):
    r = requests.post(f"{API}/auth/logout", headers=auth_headers, timeout=15)
    assert r.status_code == 200
    assert r.json().get("ok") is True


# ---- Datasets ----
def test_upload_dataset(auth_headers):
    files = {"file": ("iris.csv", io.BytesIO(CSV_DATA.encode()), "text/csv")}
    r = requests.post(f"{API}/datasets/upload", files=files, headers=auth_headers, timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "dataset_id" in d
    assert d["rows"] == 20 and d["cols"] == 5
    assert isinstance(d["schema"], list) and len(d["schema"]) == 5
    assert "preview" in d
    state["dataset_id"] = d["dataset_id"]


def test_list_datasets(auth_headers):
    r = requests.get(f"{API}/datasets", headers=auth_headers, timeout=15)
    assert r.status_code == 200
    lst = r.json()
    assert any(x["dataset_id"] == state["dataset_id"] for x in lst)


def test_get_dataset(auth_headers):
    r = requests.get(f"{API}/datasets/{state['dataset_id']}", headers=auth_headers, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["dataset_id"] == state["dataset_id"]
    assert "preview" in d and len(d["preview"]) > 0


# ---- EDA ----
def test_eda(auth_headers):
    r = requests.get(f"{API}/datasets/{state['dataset_id']}/eda", headers=auth_headers, timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    for k in ["summary", "missing", "correlation", "distributions", "categories", "duplicates", "outliers"]:
        assert k in d, f"missing key {k}"
    assert "sepal_length" in d["summary"]


# ---- Cleaning ----
def test_clean(auth_headers):
    r = requests.post(f"{API}/clean", json={"dataset_id": state["dataset_id"]}, headers=auth_headers, timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "before" in d and "after" in d and "new_dataset_id" in d
    state["clean_ds_id"] = d["new_dataset_id"]


# ---- ML ----
def test_ml_regression(auth_headers):
    r = requests.post(f"{API}/ml/train", json={"dataset_id": state["dataset_id"], "task": "regression", "target": "sepal_length"}, headers=auth_headers, timeout=60)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["task"] == "regression"
    assert "rmse" in d["metrics"] and "r2" in d["metrics"]
    assert isinstance(d["feature_importance"], list) and len(d["feature_importance"]) > 0


def test_ml_classification(auth_headers):
    r = requests.post(f"{API}/ml/train", json={"dataset_id": state["dataset_id"], "task": "classification", "target": "species"}, headers=auth_headers, timeout=60)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["task"] == "classification"
    assert "accuracy" in d["metrics"]


def test_ml_clustering(auth_headers):
    r = requests.post(f"{API}/ml/train", json={"dataset_id": state["dataset_id"], "task": "clustering", "target": ""}, headers=auth_headers, timeout=60)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["task"] == "clustering"
    assert "k" in d and "cluster_sizes" in d


def test_ml_forecasting(auth_headers):
    r = requests.post(f"{API}/ml/train", json={"dataset_id": state["dataset_id"], "task": "forecasting", "target": "sepal_length"}, headers=auth_headers, timeout=60)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["task"] == "forecasting"
    assert len(d["forecast"]) > 0


# ---- Chat streaming ----
def test_chat_stream(auth_headers):
    payload = {"message": "Say hello in 1 short sentence.", "dataset_id": state["dataset_id"]}
    with requests.post(f"{API}/chat/stream", json=payload, headers=auth_headers, stream=True, timeout=90) as r:
        assert r.status_code == 200, r.text
        delta_count = 0
        done = False
        conv_id = None
        for line in r.iter_lines(decode_unicode=True):
            if not line or not line.startswith("data: "):
                continue
            evt = json.loads(line[6:])
            t = evt.get("type")
            if t == "conversation":
                conv_id = evt.get("conversation_id")
            elif t == "delta":
                delta_count += 1
            elif t == "done":
                done = True
                break
            elif t == "error":
                pytest.fail(f"chat stream error: {evt.get('error')}")
        assert conv_id, "no conversation event"
        assert delta_count >= 1, "no delta events"
        assert done, "no done event"
        state["conv_id"] = conv_id


def test_chat_conversations(auth_headers):
    time.sleep(1)
    r = requests.get(f"{API}/chat/conversations", headers=auth_headers, timeout=15)
    assert r.status_code == 200
    lst = r.json()
    assert any(c["conversation_id"] == state.get("conv_id") for c in lst)


def test_chat_get_conversation(auth_headers):
    r = requests.get(f"{API}/chat/{state['conv_id']}", headers=auth_headers, timeout=15)
    assert r.status_code == 200
    msgs = r.json()
    assert len(msgs) >= 2


# ---- Insights ----
def test_insights(auth_headers):
    r = requests.get(f"{API}/datasets/{state['dataset_id']}/insights", headers=auth_headers, timeout=120)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "insights" in d and isinstance(d["insights"], list) and len(d["insights"]) >= 1


# ---- Reports ----
def test_report_crud(auth_headers):
    r = requests.post(f"{API}/reports", json={"dataset_id": state["dataset_id"], "title": "Test Report", "sections": [{"type": "summary", "text": "hi"}]}, headers=auth_headers, timeout=15)
    assert r.status_code == 200
    rid = r.json()["report_id"]

    r = requests.get(f"{API}/reports", headers=auth_headers, timeout=15)
    assert r.status_code == 200
    assert any(x["report_id"] == rid for x in r.json())

    r = requests.get(f"{API}/reports/{rid}", headers=auth_headers, timeout=15)
    assert r.status_code == 200
    assert r.json()["report_id"] == rid

    r = requests.delete(f"{API}/reports/{rid}", headers=auth_headers, timeout=15)
    assert r.status_code == 200


# ---- Notifications ----
def test_notifications(auth_headers):
    r = requests.get(f"{API}/notifications", headers=auth_headers, timeout=15)
    assert r.status_code == 200
    lst = r.json()
    assert isinstance(lst, list) and len(lst) >= 1
    assert any(n.get("type") == "upload" for n in lst)

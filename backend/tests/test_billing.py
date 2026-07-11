"""DataMind AI - Billing/Subscription (Razorpay) tests

Covers: /api/billing/{plans,subscription,subscribe,verify,change-plan,cancel,invoices,webhook}
and plan gating on /api/ml/train. Razorpay live calls with the current test keys
are expected to return 401 -> our endpoint should surface 502 gracefully.
"""
import io
import os
import uuid
import pytest
import requests
from pymongo import MongoClient

# Load backend URL from frontend/.env
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
try:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
except Exception:
    pass
API = f"{BASE_URL}/api"

# Load Mongo config from backend/.env
_env = {}
with open("/app/backend/.env") as f:
    for line in f:
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            _env[k.strip()] = v.strip().strip('"').strip("'")
MONGO_URL = _env["MONGO_URL"]
DB_NAME = _env["DB_NAME"]

UNIQUE = uuid.uuid4().hex[:8]
EMAIL = f"test_billing_{UNIQUE}@datamind.ai"
PASSWORD = "Test1234!"
NAME = "Billing Test User"

CSV_DATA = (
    "a,b,c,target\n"
    + "\n".join(f"{i},{i*2},{i%3},{i%2}" for i in range(1, 41))
    + "\n"
)


@pytest.fixture(scope="module")
def mongo():
    c = MongoClient(MONGO_URL)
    yield c[DB_NAME]
    c.close()


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/signup", json={"email": EMAIL, "password": PASSWORD, "name": NAME}, timeout=30)
    assert r.status_code in (200, 201), r.text
    tok = r.json().get("token") or r.json().get("access_token")
    assert tok, r.text
    return tok


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def user_id(mongo):
    u = mongo.users.find_one({"email": EMAIL})
    assert u, "user not found in db"
    return u["user_id"]


# ---------- plans / subscription ----------
def test_plans_public():
    r = requests.get(f"{API}/billing/plans", timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    plans = {p["key"]: p for p in data["plans"]}
    assert set(plans.keys()) == {"free", "pro", "business"}
    assert plans["free"]["amount"] == 0
    assert plans["pro"]["amount"] == 999
    assert plans["business"]["amount"] == 2499
    assert data["razorpay_key_id"]
    assert data["configured"] is True


def test_subscription_fresh_user(auth_headers):
    r = requests.get(f"{API}/billing/subscription", headers=auth_headers, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["plan_key"] == "free"
    assert d["subscription"] is None


# ---------- subscribe (razorpay live calls) ----------
def test_subscribe_free_rejected(auth_headers):
    r = requests.post(f"{API}/billing/subscribe", headers=auth_headers, json={"plan_key": "free"}, timeout=20)
    assert r.status_code == 400
    assert "Invalid paid plan" in r.text


def test_subscribe_pro_razorpay_error(auth_headers):
    """With invalid Razorpay test keys, expect graceful 502."""
    r = requests.post(f"{API}/billing/subscribe", headers=auth_headers, json={"plan_key": "pro"}, timeout=30)
    # We accept 502 (Razorpay error) or 200 (if keys valid); NOT 500.
    assert r.status_code in (200, 502), f"expected graceful error, got {r.status_code}: {r.text}"
    if r.status_code == 502:
        assert "Razorpay" in r.text or "error" in r.text.lower()


# ---------- verify ----------
def test_verify_bogus_signature(auth_headers):
    r = requests.post(
        f"{API}/billing/verify",
        headers=auth_headers,
        json={"razorpay_payment_id": "pay_fake", "razorpay_subscription_id": "sub_fake", "razorpay_signature": "bogus"},
        timeout=15,
    )
    assert r.status_code == 400
    assert "Invalid payment signature" in r.text


# ---------- change-plan / cancel ----------
def test_change_plan_free_downgrade(auth_headers, mongo, user_id):
    r = requests.post(f"{API}/billing/change-plan", headers=auth_headers, json={"plan_key": "free"}, timeout=20)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("ok") is True
    u = mongo.users.find_one({"user_id": user_id})
    assert (u.get("plan") or "free") == "free"


def test_cancel_without_subscription(auth_headers):
    r = requests.post(f"{API}/billing/cancel", headers=auth_headers, json={"at_cycle_end": True}, timeout=15)
    assert r.status_code == 404
    assert "No active subscription" in r.text


# ---------- invoices ----------
def test_invoices_empty(auth_headers):
    r = requests.get(f"{API}/billing/invoices", headers=auth_headers, timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json().get("items"), list)


# ---------- webhook ----------
def test_webhook_garbage_json():
    r = requests.post(
        f"{API}/billing/webhook",
        data=b"not-json{{{",
        headers={"Content-Type": "application/json"},
        timeout=15,
    )
    assert r.status_code == 400


def test_webhook_subscription_activated(mongo, user_id):
    """Simulate a subscription.activated webhook and verify user.plan updated."""
    sub_id = f"sub_test_{uuid.uuid4().hex[:10]}"
    # Insert a subscription doc mapping to our test user
    mongo.subscriptions.insert_one({
        "subscription_id": sub_id,
        "user_id": user_id,
        "plan_key": "pro",
        "status": "created",
        "amount_paise": 99900,
        "currency": "INR",
        "created_at": "2026-01-01T00:00:00+00:00",
    })
    try:
        # Ensure clean starting plan
        mongo.users.update_one({"user_id": user_id}, {"$set": {"plan": "free"}})
        payload = {
            "event": "subscription.activated",
            "payload": {"subscription": {"entity": {"id": sub_id, "status": "active"}}},
        }
        r = requests.post(f"{API}/billing/webhook", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json().get("received") is True

        # Verify user.plan updated
        u = mongo.users.find_one({"user_id": user_id})
        assert u.get("plan") == "pro", f"plan not updated: {u.get('plan')}"

        # Verify webhook stored
        evt = mongo.webhook_events.find_one({"payload.payload.subscription.entity.id": sub_id})
        assert evt is not None
    finally:
        mongo.subscriptions.delete_one({"subscription_id": sub_id})
        mongo.webhook_events.delete_many({"payload.payload.subscription.entity.id": sub_id})


# ---------- plan gating on /api/ml/train ----------
@pytest.fixture(scope="module")
def uploaded_dataset(auth_headers, mongo, user_id):
    # Ensure plan is free at first
    mongo.users.update_one({"user_id": user_id}, {"$set": {"plan": "free"}})
    files = {"file": ("iris.csv", io.BytesIO(CSV_DATA.encode()), "text/csv")}
    r = requests.post(f"{API}/datasets/upload", headers=auth_headers, files=files, timeout=30)
    assert r.status_code in (200, 201), r.text
    ds_id = r.json().get("dataset_id")
    assert ds_id
    return ds_id


def test_ml_train_gated_on_free(auth_headers, uploaded_dataset, mongo, user_id):
    mongo.users.update_one({"user_id": user_id}, {"$set": {"plan": "free"}})
    r = requests.post(
        f"{API}/ml/train",
        headers=auth_headers,
        json={"dataset_id": uploaded_dataset, "target": "target", "task": "classification"},
        timeout=30,
    )
    assert r.status_code == 402, r.text
    assert "Upgrade required" in r.text


def test_ml_train_allowed_on_pro(auth_headers, uploaded_dataset, mongo, user_id):
    mongo.users.update_one({"user_id": user_id}, {"$set": {"plan": "pro"}})
    try:
        r = requests.post(
            f"{API}/ml/train",
            headers=auth_headers,
            json={"dataset_id": uploaded_dataset, "target": "target", "task": "classification"},
            timeout=60,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("task") == "classification"
    finally:
        mongo.users.update_one({"user_id": user_id}, {"$set": {"plan": "free"}})


# Cleanup on teardown
@pytest.fixture(scope="module", autouse=True)
def _cleanup(mongo, request):
    yield
    u = mongo.users.find_one({"email": EMAIL})
    if u:
        uid = u["user_id"]
        mongo.subscriptions.delete_many({"user_id": uid})
        mongo.datasets.delete_many({"user_id": uid})
        mongo.notifications.delete_many({"user_id": uid})
        mongo.user_sessions.delete_many({"user_id": uid})
        mongo.users.delete_one({"user_id": uid})

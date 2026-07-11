"""Backend tests for new auth features: signup verify token, login lockout,
forgot password, reset password, verify email, change password, resend verification.

Fetches tokens directly from MongoDB (db.email_tokens) rather than email inbox.
"""
import os
import uuid
import pytest
import requests
from pymongo import MongoClient
from dotenv import load_dotenv

# Load backend env to get MONGO_URL / DB_NAME
load_dotenv('/app/backend/.env')

BASE_URL = None
with open('/app/frontend/.env') as f:
    for line in f:
        if line.startswith('REACT_APP_BACKEND_URL='):
            BASE_URL = line.split('=', 1)[1].strip().rstrip('/')

API = f"{BASE_URL}/api"
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']

mc = MongoClient(MONGO_URL)
mdb = mc[DB_NAME]


def _mk_email():
    return f"test_{uuid.uuid4().hex[:10]}@datamind.ai"


PASSWORD = "Test1234!"


@pytest.fixture()
def fresh_user():
    email = _mk_email()
    r = requests.post(f"{API}/auth/signup",
                      json={"email": email, "password": PASSWORD, "name": "Flow Tester"},
                      timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    return {"email": email, "token": d["token"], "user_id": d["user"]["user_id"]}


# -------- Signup: creates verify token & user email_verified=False --------
def test_signup_creates_verify_token_and_unverified_user(fresh_user):
    u = mdb.users.find_one({"user_id": fresh_user["user_id"]})
    assert u is not None
    assert u.get("email_verified") is False

    tok = mdb.email_tokens.find_one({"user_id": fresh_user["user_id"], "type": "verify"})
    assert tok is not None
    assert tok.get("used") is False
    assert tok.get("email") == fresh_user["email"]
    assert "expires_at" in tok


# -------- Login lockout after 5 failed attempts --------
def test_login_lockout_after_5_failed_attempts(fresh_user):
    email = fresh_user["email"]
    detail_messages = []
    for i in range(5):
        r = requests.post(f"{API}/auth/login",
                          json={"email": email, "password": "wrong-pass!"}, timeout=15)
        assert r.status_code == 401, f"attempt {i+1}: {r.status_code} {r.text}"
        detail_messages.append(r.json().get("detail", ""))

    # First 4 should mention "attempt(s) left"; 5th should mention "Locked"
    for i in range(4):
        assert "attempt" in detail_messages[i].lower(), f"attempt {i+1} msg: {detail_messages[i]}"
    assert "lock" in detail_messages[4].lower(), f"5th msg: {detail_messages[4]}"

    # 6th attempt even with CORRECT password → 423 locked
    r = requests.post(f"{API}/auth/login",
                      json={"email": email, "password": PASSWORD}, timeout=15)
    assert r.status_code == 423, f"expected 423, got {r.status_code} {r.text}"
    assert "lock" in r.json().get("detail", "").lower()


# -------- Forgot password (valid) --------
def test_forgot_password_creates_reset_token(fresh_user):
    r = requests.post(f"{API}/auth/forgot-password",
                      json={"email": fresh_user["email"]}, timeout=30)
    assert r.status_code == 200
    assert r.json().get("ok") is True

    tok = mdb.email_tokens.find_one({"user_id": fresh_user["user_id"], "type": "reset"})
    assert tok is not None
    assert tok.get("used") is False


# -------- Forgot password (unknown email) - no enumeration --------
def test_forgot_password_unknown_email_still_ok():
    r = requests.post(f"{API}/auth/forgot-password",
                      json={"email": f"nobody_{uuid.uuid4().hex[:6]}@nowhere.io"}, timeout=15)
    assert r.status_code == 200
    assert r.json().get("ok") is True


# -------- Reset password flow --------
def test_reset_password_then_login_and_reuse_fails(fresh_user):
    # Request reset
    r = requests.post(f"{API}/auth/forgot-password",
                      json={"email": fresh_user["email"]}, timeout=15)
    assert r.status_code == 200

    tok_doc = mdb.email_tokens.find_one(
        {"user_id": fresh_user["user_id"], "type": "reset", "used": False},
        sort=[("created_at", -1)]
    )
    assert tok_doc is not None
    token = tok_doc["token"]

    new_pw = "Reset9876!"
    r = requests.post(f"{API}/auth/reset-password",
                      json={"token": token, "new_password": new_pw}, timeout=15)
    assert r.status_code == 200, r.text
    assert r.json().get("ok") is True

    # Login with new password
    r = requests.post(f"{API}/auth/login",
                      json={"email": fresh_user["email"], "password": new_pw}, timeout=15)
    assert r.status_code == 200, r.text
    assert "token" in r.json()

    # Old password now fails
    r = requests.post(f"{API}/auth/login",
                      json={"email": fresh_user["email"], "password": PASSWORD}, timeout=15)
    assert r.status_code == 401

    # Reusing same reset token → 400
    r = requests.post(f"{API}/auth/reset-password",
                      json={"token": token, "new_password": "AnotherPw123!"}, timeout=15)
    assert r.status_code == 400


# -------- Verify email --------
def test_verify_email_flow(fresh_user):
    tok_doc = mdb.email_tokens.find_one(
        {"user_id": fresh_user["user_id"], "type": "verify", "used": False}
    )
    assert tok_doc is not None
    token = tok_doc["token"]

    r = requests.post(f"{API}/auth/verify-email", json={"token": token}, timeout=15)
    assert r.status_code == 200, r.text
    assert r.json().get("ok") is True

    u = mdb.users.find_one({"user_id": fresh_user["user_id"]})
    assert u.get("email_verified") is True

    # Reuse should fail
    r = requests.post(f"{API}/auth/verify-email", json={"token": token}, timeout=15)
    assert r.status_code == 400


def test_verify_email_bad_token():
    r = requests.post(f"{API}/auth/verify-email", json={"token": "not-a-real-token"}, timeout=15)
    assert r.status_code == 400


# -------- Change password --------
def test_change_password_wrong_current_returns_401(fresh_user):
    r = requests.post(f"{API}/auth/change-password",
                      json={"current_password": "wrong-current", "new_password": "NewValid1!"},
                      headers={"Authorization": f"Bearer {fresh_user['token']}"},
                      timeout=15)
    assert r.status_code == 401


def test_change_password_success_and_login(fresh_user):
    new_pw = "Changed4567!"
    r = requests.post(f"{API}/auth/change-password",
                      json={"current_password": PASSWORD, "new_password": new_pw},
                      headers={"Authorization": f"Bearer {fresh_user['token']}"},
                      timeout=15)
    assert r.status_code == 200, r.text
    assert r.json().get("ok") is True

    # New password works
    r = requests.post(f"{API}/auth/login",
                      json={"email": fresh_user["email"], "password": new_pw}, timeout=15)
    assert r.status_code == 200

    # Old password no longer works
    r = requests.post(f"{API}/auth/login",
                      json={"email": fresh_user["email"], "password": PASSWORD}, timeout=15)
    assert r.status_code == 401


# -------- Resend verification --------
def test_resend_verification_creates_new_verify_token(fresh_user):
    before = mdb.email_tokens.count_documents(
        {"user_id": fresh_user["user_id"], "type": "verify"}
    )
    r = requests.post(f"{API}/auth/resend-verification",
                      json={"email": fresh_user["email"]}, timeout=15)
    assert r.status_code == 200
    assert r.json().get("ok") is True

    after = mdb.email_tokens.count_documents(
        {"user_id": fresh_user["user_id"], "type": "verify"}
    )
    assert after == before + 1


def test_resend_verification_unknown_email_still_ok():
    r = requests.post(f"{API}/auth/resend-verification",
                      json={"email": f"ghost_{uuid.uuid4().hex[:6]}@ghost.io"}, timeout=15)
    assert r.status_code == 200
    assert r.json().get("ok") is True

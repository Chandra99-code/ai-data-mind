"""Tests for Google link/unlink + set-password endpoints (iteration 3)."""
import os
import sys
import uuid
import time
import asyncio
import pytest
import requests

sys.path.insert(0, "/app/backend")
sys.path.insert(0, "/app")

from pymongo import MongoClient  # noqa: E402
from dotenv import load_dotenv  # noqa: E402

load_dotenv("/app/backend/.env")

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else "https://ai-analyst-hub-18.preview.emergentagent.com"
# Prefer preview URL for external test
BASE_URL = "https://ai-analyst-hub-18.preview.emergentagent.com"

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]


def _unique_email(tag):
    return f"TEST_{tag}_{uuid.uuid4().hex[:10]}@datamind.ai"


@pytest.fixture(scope="module")
def signed_up_user():
    email = _unique_email("fresh")
    password = "TestPass123!"
    r = requests.post(f"{BASE_URL}/api/auth/signup", json={"email": email, "password": password, "name": "Fresh"})
    assert r.status_code == 200, r.text
    data = r.json()
    return {"email": email, "password": password, "token": data["token"], "user_id": data["user"]["user_id"]}


@pytest.fixture(scope="module")
def db():
    client = MongoClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


# ---- /api/auth/me ----
def test_me_returns_providers_and_has_password(signed_up_user):
    r = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {signed_up_user['token']}"})
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["providers"] == ["email"]
    assert j["has_password"] is True
    assert j["email_verified"] is False


# ---- set-password on already-has-password ----
def test_set_password_blocks_if_already_set(signed_up_user):
    r = requests.post(
        f"{BASE_URL}/api/auth/set-password",
        json={"new_password": "AnotherOne1"},
        headers={"Authorization": f"Bearer {signed_up_user['token']}"},
    )
    assert r.status_code == 400
    assert "already set" in r.json().get("detail", "").lower()


# ---- unlink-google idempotency on email-only user ----
def test_unlink_google_on_email_only_user(signed_up_user):
    r = requests.post(
        f"{BASE_URL}/api/auth/unlink-google",
        headers={"Authorization": f"Bearer {signed_up_user['token']}"},
    )
    # User has password, so should succeed idempotently (no google to remove).
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["ok"] is True
    assert j["user"]["providers"] == ["email"]


# ---- link-google guards ----
def test_link_google_missing_session_id(signed_up_user):
    r = requests.post(
        f"{BASE_URL}/api/auth/link-google",
        headers={"Authorization": f"Bearer {signed_up_user['token']}"},
    )
    assert r.status_code == 400
    assert "session" in r.json().get("detail", "").lower()


def test_link_google_bogus_session(signed_up_user):
    r = requests.post(
        f"{BASE_URL}/api/auth/link-google",
        headers={
            "Authorization": f"Bearer {signed_up_user['token']}",
            "X-Session-ID": "totally-bogus-session-id-xyz",
        },
    )
    assert r.status_code == 401
    assert "invalid google session" in r.json().get("detail", "").lower()


# ---- Google-only user simulation (direct mongo insert + minted JWT) ----
@pytest.fixture(scope="module")
def google_only_user(db):
    from backend.server import make_jwt  # noqa: WPS433
    from datetime import datetime, timezone
    mongo_db = db
    uid = f"user_{uuid.uuid4().hex[:12]}"
    email = _unique_email("gonly").lower()
    doc = {
        "user_id": uid, "email": email, "name": "G Only",
        "picture": None, "provider": "google", "providers": ["google"],
        "email_verified": True, "google_linked_at": datetime.now(timezone.utc).isoformat(),
        "plan": "free", "created_at": datetime.now(timezone.utc).isoformat(),
    }
    mongo_db.users.insert_one(doc)
    token = make_jwt(uid)
    yield {"user_id": uid, "email": email, "token": token}
    # cleanup
    mongo_db.users.delete_one({"user_id": uid})


def test_google_only_unlink_blocked_without_password(google_only_user):
    r = requests.post(
        f"{BASE_URL}/api/auth/unlink-google",
        headers={"Authorization": f"Bearer {google_only_user['token']}"},
    )
    assert r.status_code == 400
    assert "password first" in r.json().get("detail", "").lower()


def test_google_only_set_password_then_unlink(google_only_user):
    # (a) set-password
    r = requests.post(
        f"{BASE_URL}/api/auth/set-password",
        json={"new_password": "NewPass1"},
        headers={"Authorization": f"Bearer {google_only_user['token']}"},
    )
    assert r.status_code == 200, r.text
    assert r.json().get("ok") is True

    # verify providers/has_password via /me
    r2 = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {google_only_user['token']}"})
    assert r2.status_code == 200
    me = r2.json()
    assert set(me["providers"]) == {"google", "email"}
    assert me["has_password"] is True

    # (b) unlink now works
    r3 = requests.post(
        f"{BASE_URL}/api/auth/unlink-google",
        headers={"Authorization": f"Bearer {google_only_user['token']}"},
    )
    assert r3.status_code == 200, r3.text
    assert r3.json()["user"]["providers"] == ["email"]

    # (c) idempotent - unlink again still ok
    r4 = requests.post(
        f"{BASE_URL}/api/auth/unlink-google",
        headers={"Authorization": f"Bearer {google_only_user['token']}"},
    )
    assert r4.status_code == 200
    assert r4.json()["user"]["providers"] == ["email"]

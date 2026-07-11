"""Iteration 6 — Team Collaboration, Comments, Boardroom Export, Databricks."""
import io
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
try:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break
except Exception:
    pass
API = f"{BASE_URL}/api"

U = uuid.uuid4().hex[:8]
EMAIL_A = f"iter6a_{U}@datamind.ai"
EMAIL_B = f"iter6b_{U}@datamind.ai"
EMAIL_C = f"iter6c_{U}@datamind.ai"   # never signs up (pending invite path)
PW = "Test1234!"


def _signup(email, name="Iter6"):
    r = requests.post(f"{API}/auth/signup", json={"email": email, "password": PW, "name": name}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def token_a():
    return _signup(EMAIL_A, "UserA")


@pytest.fixture(scope="session")
def token_b():
    return _signup(EMAIL_B, "UserB")


@pytest.fixture(scope="session")
def hdr_a(token_a):
    return {"Authorization": f"Bearer {token_a}"}


@pytest.fixture(scope="session")
def hdr_b(token_b):
    return {"Authorization": f"Bearer {token_b}"}


# --- Workspaces: auto personal ---
def test_workspaces_auto_personal_idempotent(hdr_a):
    r1 = requests.get(f"{API}/workspaces", headers=hdr_a, timeout=15)
    assert r1.status_code == 200, r1.text
    items = r1.json()
    assert len(items) == 1
    ws = items[0]
    assert ws["role"] == "owner"
    assert ws["member_count"] == 1
    assert ws.get("personal") is True

    r2 = requests.get(f"{API}/workspaces", headers=hdr_a, timeout=15)
    assert r2.status_code == 200
    assert len(r2.json()) == 1  # idempotent


def test_create_named_workspace(hdr_a):
    r = requests.post(f"{API}/workspaces", json={"name": "TEST_team"}, headers=hdr_a, timeout=15)
    assert r.status_code == 200, r.text
    ws = r.json()
    assert ws["name"] == "TEST_team"
    assert ws["personal"] is False
    assert len(ws["members"]) == 1 and ws["members"][0]["role"] == "owner"
    # list now shows >= 2
    items = requests.get(f"{API}/workspaces", headers=hdr_a, timeout=15).json()
    assert any(w["workspace_id"] == ws["workspace_id"] for w in items)
    pytest.shared_ws = ws["workspace_id"]


def test_invite_pending_and_active_and_duplicate(hdr_a, token_b):
    ws_id = pytest.shared_ws
    # Pending invite (email not signed up)
    r = requests.post(f"{API}/workspaces/{ws_id}/members",
                      json={"email": EMAIL_C, "role": "viewer"}, headers=hdr_a, timeout=20)
    assert r.status_code == 200, r.text
    m = r.json()["member"]
    assert m["status"] == "pending"
    assert m["user_id"].startswith("invite_")

    # Invalid role
    r = requests.post(f"{API}/workspaces/{ws_id}/members",
                      json={"email": f"x_{U}@d.ai", "role": "boss"}, headers=hdr_a, timeout=15)
    assert r.status_code == 400

    # Active invite (user B exists) — signup ensured via fixture
    r = requests.post(f"{API}/workspaces/{ws_id}/members",
                      json={"email": EMAIL_B, "role": "viewer"}, headers=hdr_a, timeout=20)
    assert r.status_code == 200, r.text
    m = r.json()["member"]
    assert m["status"] == "active"

    # Duplicate for existing user -> 400
    r = requests.post(f"{API}/workspaces/{ws_id}/members",
                      json={"email": EMAIL_B, "role": "editor"}, headers=hdr_a, timeout=15)
    assert r.status_code == 400


def test_viewer_cannot_invite(hdr_b):
    ws_id = pytest.shared_ws
    r = requests.post(f"{API}/workspaces/{ws_id}/members",
                      json={"email": f"other_{U}@d.ai", "role": "viewer"}, headers=hdr_b, timeout=15)
    assert r.status_code == 403


def test_role_change_and_owner_protection(hdr_a):
    ws_id = pytest.shared_ws
    ws = requests.get(f"{API}/workspaces", headers=hdr_a, timeout=15).json()
    ws = next(w for w in ws if w["workspace_id"] == ws_id)
    owner_uid = ws["owner_user_id"]
    b_member = next(m for m in ws["members"] if m["email"] == EMAIL_B)

    # Owner cannot be demoted
    r = requests.post(f"{API}/workspaces/{ws_id}/members/{owner_uid}/role",
                      json={"role": "viewer"}, headers=hdr_a, timeout=15)
    assert r.status_code == 400

    # Promote viewer B -> admin
    r = requests.post(f"{API}/workspaces/{ws_id}/members/{b_member['user_id']}/role",
                      json={"role": "admin"}, headers=hdr_a, timeout=15)
    assert r.status_code == 200


def test_remove_member_owner_protection(hdr_a):
    ws_id = pytest.shared_ws
    ws = requests.get(f"{API}/workspaces", headers=hdr_a, timeout=15).json()
    ws = next(w for w in ws if w["workspace_id"] == ws_id)
    owner_uid = ws["owner_user_id"]
    b_member = next(m for m in ws["members"] if m["email"] == EMAIL_B)

    # Cannot remove owner
    r = requests.delete(f"{API}/workspaces/{ws_id}/members/{owner_uid}", headers=hdr_a, timeout=15)
    assert r.status_code == 400

    # Remove B ok
    r = requests.delete(f"{API}/workspaces/{ws_id}/members/{b_member['user_id']}", headers=hdr_a, timeout=15)
    assert r.status_code == 200


# --- Comments ---
def test_comments_flow_and_mentions_and_delete_perms(hdr_a, hdr_b):
    body = f"Great work @{EMAIL_B}"
    r = requests.post(f"{API}/comments",
                      json={"entity_type": "boardroom", "entity_id": "brd_test", "body": body},
                      headers=hdr_a, timeout=15)
    assert r.status_code == 200, r.text
    doc = r.json()
    assert EMAIL_B.lower() in [m.lower() for m in doc["mentions"]]
    cid = doc["comment_id"]

    # List
    r = requests.get(f"{API}/comments", params={"entity_type": "boardroom", "entity_id": "brd_test"},
                     headers=hdr_a, timeout=15)
    assert r.status_code == 200
    assert any(c["comment_id"] == cid for c in r.json())

    # Notification for B
    n = requests.get(f"{API}/notifications", headers=hdr_b, timeout=15)
    assert n.status_code == 200
    items = n.json() if isinstance(n.json(), list) else n.json().get("items", n.json().get("notifications", []))
    assert any(x.get("type") == "mention" for x in items), items

    # Non-author delete -> 403
    r = requests.delete(f"{API}/comments/{cid}", headers=hdr_b, timeout=15)
    assert r.status_code == 403

    # Author delete -> ok
    r = requests.delete(f"{API}/comments/{cid}", headers=hdr_a, timeout=15)
    assert r.status_code == 200


# --- Boardroom export ---
BOARDROOM_DATA = {
    "title": "Q4 Briefing",
    "summary": "Strong quarter.",
    "sections": [{"role": "Operations", "highlights": ["A", "B"]}],
    "action_plan": [{"owner": "Alice", "action": "Ship X", "due": "2026-02-01", "priority": "P0"}],
}


def test_boardroom_export_docx(hdr_a):
    r = requests.post(f"{API}/copilot/boardroom/export",
                      json={"format": "docx", "data": BOARDROOM_DATA}, headers=hdr_a, timeout=30)
    assert r.status_code == 200, r.text
    assert r.headers["content-type"].startswith(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    assert len(r.content) > 500


def test_boardroom_export_pptx(hdr_a):
    r = requests.post(f"{API}/copilot/boardroom/export",
                      json={"format": "pptx", "data": BOARDROOM_DATA}, headers=hdr_a, timeout=30)
    assert r.status_code == 200, r.text
    assert r.headers["content-type"].startswith(
        "application/vnd.openxmlformats-officedocument.presentationml.presentation")
    assert len(r.content) > 500


def test_boardroom_export_invalid(hdr_a):
    r = requests.post(f"{API}/copilot/boardroom/export",
                      json={"format": "txt", "data": BOARDROOM_DATA}, headers=hdr_a, timeout=15)
    assert r.status_code == 400


# --- Integrations: databricks ---
def test_integrations_has_databricks(hdr_a):
    r = requests.get(f"{API}/integrations", headers=hdr_a, timeout=15)
    assert r.status_code == 200
    conns = {c["key"]: c for c in r.json()["connectors"]}
    assert "databricks" in conns
    assert conns["databricks"]["category"] == "warehouse"
    assert conns["databricks"]["status"] == "coming_soon"


# --- Boardroom LLM: action_plan + Operations ---
CSV = ("a,b,c\n" + "\n".join(f"{i},{i*2},{i%3}" for i in range(1, 21)) + "\n")


def test_boardroom_llm_shape(hdr_a):
    files = {"file": ("t.csv", io.BytesIO(CSV.encode()), "text/csv")}
    r = requests.post(f"{API}/datasets/upload", files=files, headers=hdr_a, timeout=30)
    assert r.status_code == 200, r.text
    ds = r.json()["dataset_id"]
    r = requests.post(f"{API}/copilot/boardroom", json={"dataset_id": ds}, headers=hdr_a, timeout=60)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "sections" in d
    assert "action_plan" in d or "actions" in d

"""DataMind AI — Iteration 5 tests for the Enterprise BI upgrade
(Command Center, Copilot suite, Agents, Automations, Integrations, Power BI).

Uses a fresh signup per session and a small iris CSV for LLM endpoints.
"""
import io
import os
import json
import uuid
import time
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

UNIQUE = uuid.uuid4().hex[:8]
EMAIL = f"iter5_{UNIQUE}@datamind.ai"
PASSWORD = "Test1234!"

CSV_DATA = (
    "sepal_length,sepal_width,petal_length,petal_width,species\n"
    "5.1,3.5,1.4,0.2,setosa\n4.9,3.0,1.4,0.2,setosa\n4.7,3.2,1.3,0.2,setosa\n"
    "4.6,3.1,1.5,0.2,setosa\n5.0,3.6,1.4,0.2,setosa\n7.0,3.2,4.7,1.4,versicolor\n"
    "6.4,3.2,4.5,1.5,versicolor\n6.9,3.1,4.9,1.5,versicolor\n5.5,2.3,4.0,1.3,versicolor\n"
    "6.5,2.8,4.6,1.5,versicolor\n6.3,3.3,6.0,2.5,virginica\n5.8,2.7,5.1,1.9,virginica\n"
    "7.1,3.0,5.9,2.1,virginica\n6.3,2.9,5.6,1.8,virginica\n6.5,3.0,5.8,2.2,virginica\n"
)

state = {}


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/signup",
                      json={"email": EMAIL, "password": PASSWORD, "name": "Iter5"}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def dataset_id(headers):
    if "dataset_id" in state:
        return state["dataset_id"]
    files = {"file": ("iris.csv", io.BytesIO(CSV_DATA.encode()), "text/csv")}
    r = requests.post(f"{API}/datasets/upload", files=files, headers=headers, timeout=30)
    assert r.status_code == 200, r.text
    state["dataset_id"] = r.json()["dataset_id"]
    return state["dataset_id"]


# ------- Agents -------
def test_agents_list_returns_nine(headers):
    r = requests.get(f"{API}/agents", headers=headers, timeout=15)
    assert r.status_code == 200
    d = r.json()
    keys = {a["key"] for a in d["agents"]}
    expected = {"copilot", "ceo", "sales", "finance", "marketing", "hr", "inventory", "ds", "pbi"}
    assert expected.issubset(keys), f"missing keys: {expected - keys}"
    for a in d["agents"]:
        assert a.get("label") and a.get("emoji")


# ------- Command Center -------
def test_command_center(headers, dataset_id):
    r = requests.get(f"{API}/command-center", headers=headers, timeout=20)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "kpis" in d and len(d["kpis"]) == 8
    kpi_keys = {k["key"] for k in d["kpis"]}
    assert kpi_keys == {"revenue", "profit", "customers", "churn", "forecast", "confidence", "risk", "health"}
    for k in d["kpis"]:
        assert "value" in k and "delta" in k and "unit" in k
        assert isinstance(k["trend"], list) and len(k["trend"]) == 6
    stats = d["stats"]
    for s in ["datasets", "rows_analyzed", "conversations", "reports"]:
        assert s in stats
    assert "latest_dataset" in d and d["latest_dataset"] is not None
    assert "plan" in d


# ------- Copilot suite -------
def test_copilot_analyze(headers, dataset_id):
    r = requests.post(f"{API}/copilot/analyze", json={"dataset_id": dataset_id},
                      headers=headers, timeout=90)
    assert r.status_code == 200, r.text
    d = r.json()
    for k in ["executive_summary", "root_cause_analysis", "trends", "risks",
              "opportunities", "recommendations", "forecast", "health_score"]:
        assert k in d, f"missing {k}"
    assert isinstance(d["forecast"], dict) and "summary" in d["forecast"]
    assert isinstance(d["health_score"], dict) and "score" in d["health_score"]


def test_copilot_detective(headers, dataset_id):
    r = requests.post(f"{API}/copilot/detective", json={"dataset_id": dataset_id},
                      headers=headers, timeout=90)
    assert r.status_code == 200, r.text
    d = r.json()
    for k in ["case_title", "summary", "findings", "evidence", "stats"]:
        assert k in d
    assert isinstance(d["findings"], list)
    assert isinstance(d["stats"], dict) and "rows" in d["stats"]


def test_copilot_story(headers, dataset_id):
    r = requests.post(f"{API}/copilot/story", json={"dataset_id": dataset_id},
                      headers=headers, timeout=90)
    assert r.status_code == 200, r.text
    d = r.json()
    for k in ["headline", "story", "tags"]:
        assert k in d


def test_copilot_whatif_no_dataset(headers):
    r = requests.post(f"{API}/copilot/whatif",
                      json={"scenario": "increase price 10%", "horizon_months": 6},
                      headers=headers, timeout=90)
    assert r.status_code == 200, r.text
    d = r.json()
    for k in ["scenario", "assumptions", "impact", "upside", "downside", "projection", "verdict"]:
        assert k in d
    assert d["verdict"].get("rating") in {"recommended", "neutral", "risky"}


def test_copilot_boardroom(headers, dataset_id):
    r = requests.post(f"{API}/copilot/boardroom", json={"dataset_id": dataset_id},
                      headers=headers, timeout=90)
    assert r.status_code == 200, r.text
    d = r.json()
    for k in ["title", "summary", "sections", "actions"]:
        assert k in d


# ------- Chat with agent (CEO) -------
def test_chat_with_ceo_agent(headers):
    payload = {"message": "hi", "agent": "ceo"}
    with requests.post(f"{API}/chat/stream", json=payload, headers=headers,
                       stream=True, timeout=90) as r:
        assert r.status_code == 200, r.text
        delta = 0
        done = False
        for line in r.iter_lines(decode_unicode=True):
            if not line or not line.startswith("data: "):
                continue
            evt = json.loads(line[6:])
            t = evt.get("type")
            if t == "delta":
                delta += 1
            elif t == "done":
                done = True
                break
            elif t == "error":
                pytest.fail(f"stream error: {evt.get('error')}")
        assert delta >= 1 and done


# ------- Integrations -------
def test_integrations(headers):
    r = requests.get(f"{API}/integrations", headers=headers, timeout=15)
    assert r.status_code == 200
    conns = {c["key"]: c for c in r.json()["connectors"]}
    for k in ["csv", "excel", "json", "parquet"]:
        assert conns[k]["status"] == "connected"
    for k in ["gsheets", "sql", "postgres", "mongodb", "snowflake", "bigquery", "tableau", "looker"]:
        assert conns[k]["status"] == "coming_soon", f"{k} = {conns[k]['status']}"
    # Power BI: awaiting_credentials unless AZURE_CLIENT_ID is set
    if os.environ.get("AZURE_CLIENT_ID"):
        assert conns["powerbi"]["status"] == "connect_available"
    else:
        assert conns["powerbi"]["status"] == "awaiting_credentials"


def test_powerbi_status(headers):
    r = requests.get(f"{API}/powerbi/status", headers=headers, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["configured"] is False
    assert "AZURE_CLIENT_ID" in d["message"] or "credentials" in d["message"].lower()


# ------- Automations CRUD -------
def test_automation_crud(headers):
    body = {"name": "TEST_auto", "trigger": "schedule", "action": "email_report", "enabled": True}
    r = requests.post(f"{API}/automations", json=body, headers=headers, timeout=15)
    assert r.status_code == 200, r.text
    a = r.json()
    aid = a["automation_id"]
    assert a["enabled"] is True
    assert a["status"] == "scheduled"

    r = requests.get(f"{API}/automations", headers=headers, timeout=15)
    assert r.status_code == 200
    assert any(x["automation_id"] == aid for x in r.json())

    r = requests.post(f"{API}/automations/{aid}/toggle", headers=headers, timeout=15)
    assert r.status_code == 200
    assert r.json()["enabled"] is False

    r = requests.post(f"{API}/automations/{aid}/toggle", headers=headers, timeout=15)
    assert r.json()["enabled"] is True

    r = requests.delete(f"{API}/automations/{aid}", headers=headers, timeout=15)
    assert r.status_code == 200
    r = requests.get(f"{API}/automations", headers=headers, timeout=15)
    assert not any(x["automation_id"] == aid for x in r.json())

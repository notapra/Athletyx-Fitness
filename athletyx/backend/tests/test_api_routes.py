"""HTTP route integration tests — no live server required (TestClient)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_health_ok(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "nutrition" in data["features"]
    assert res.headers.get("x-request-id")


def test_nutrition_search_requires_query(client):
    res = client.get("/api/nutrition/search", params={"q": ""})
    assert res.status_code == 400


def test_nutrition_search_shape(client, monkeypatch):
    async def fake_search(q, page_size=12):
        return [{"fdc_id": 1, "name": "Oats", "brand": ""}]

    monkeypatch.setattr("backend.main.search_foods", fake_search)
    res = client.get("/api/nutrition/search", params={"q": "oats"})
    assert res.status_code == 200
    body = res.json()
    assert isinstance(body["results"], list)
    assert body["results"][0]["name"] == "Oats"


def test_coach_rejects_empty_message(client):
    res = client.post("/api/coach", json={"message": ""})
    assert res.status_code == 422


def test_coach_requires_auth_when_enabled(client, monkeypatch):
    monkeypatch.setenv("REQUIRE_AUTH", "true")
    res = client.post("/api/coach", json={"message": "hello", "profile": {}, "goals": []})
    assert res.status_code == 401


def test_mcp_session_requires_auth_when_enabled(client, monkeypatch):
    monkeypatch.setenv("REQUIRE_AUTH", "true")
    res = client.get("/api/mcp/session")
    assert res.status_code == 401


def test_coach_cache_stats(client):
    res = client.get("/api/coach/cache-stats")
    assert res.status_code == 200


def test_chat_route(client):
    res = client.post("/api/chat", json={"message": "hello"})
    assert res.status_code == 200
    assert res.json().get("content")

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


def test_mcp_session_requires_bearer_even_when_auth_optional(client, monkeypatch):
    monkeypatch.setenv("REQUIRE_AUTH", "false")
    res = client.get("/api/mcp/session")
    assert res.status_code == 401


def test_mcp_session_accepts_bearer_when_auth_optional(client, monkeypatch):
    async def fake_verify(token: str):
        assert token == "test-jwt"
        return {"id": "user-1", "email": "user@example.com"}

    monkeypatch.setenv("REQUIRE_AUTH", "false")
    monkeypatch.setattr("backend.auth_middleware.verify_supabase_jwt", fake_verify)
    res = client.get("/api/mcp/session", headers={"Authorization": "Bearer test-jwt"})
    assert res.status_code == 200
    body = res.json()
    assert body["user_id"] == "user-1"
    assert body["email"] == "user@example.com"
    assert "healthkit" in [d["domain"] for d in body["domains"]]


def test_nutrition_search_builtin_chicken(client):
    res = client.get("/api/nutrition/search", params={"q": "chicken"})
    assert res.status_code == 200
    body = res.json()
    assert body["results"]
    assert body["results"][0].get("source") == "builtin"


def test_nutrition_search_usda_fallback(client, monkeypatch):
    async def fake_search(q, page_size=12):
        return [{"fdc_id": 99, "name": "Rare branded item", "brand": "Test", "source": "usda"}]

    monkeypatch.setenv("USDA_FDC_API_KEY", "test-key")
    monkeypatch.setattr("backend.main.search_foods", fake_search)
    res = client.get("/api/nutrition/search", params={"q": "zzznomatch"})
    assert res.status_code == 200
    assert res.json()["api_configured"] is True
    assert res.json()["results"][0]["source"] == "usda"


def test_coach_cache_stats(client):
    res = client.get("/api/coach/cache-stats")
    assert res.status_code == 200


def test_chat_route(client):
    res = client.post("/api/chat", json={"message": "hello"})
    assert res.status_code == 200
    assert res.json().get("content")

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


def test_form_vision_requires_images(client):
    res = client.post("/api/form-vision", json={"images": []})
    assert res.status_code == 422


def test_form_vision_unavailable_without_key(client, monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    res = client.post(
        "/api/form-vision",
        json={"images": ["aaaa"], "logged_exercise": "Squat", "catalog": ["Squat"]},
    )
    assert res.status_code == 503


def test_form_vision_success_mocked(client, monkeypatch):
    from backend.form_vision_service import FormVisionResult

    monkeypatch.setenv("GEMINI_API_KEY", "test-key")

    def fake_analyze(images, **kwargs):
        assert len(images) >= 1
        return FormVisionResult(
            detected_exercise="Deadlift",
            confidence=0.91,
            matches_logged=False,
            form_score="needs_work",
            faults=["Hips rising faster than the bar"],
            cues=["Keep the bar close; drive the floor away"],
            summary="Looks like a deadlift, not a squat.",
            powered_by="Gemini (test)",
        )

    monkeypatch.setattr("backend.main.analyze_form_vision", fake_analyze)
    monkeypatch.setattr("backend.main.gemini_available", lambda: True)

    res = client.post(
        "/api/form-vision",
        json={
            "images": ["YWFhYQ=="],
            "logged_exercise": "Squat",
            "catalog": ["Squat", "Deadlift", "Bench Press"],
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["detected_exercise"] == "Deadlift"
    assert body["matches_logged"] is False
    assert body["cues"]
    assert body["confidence"] == 0.91


def test_form_vision_requires_auth_when_enabled(client, monkeypatch):
    monkeypatch.setenv("REQUIRE_AUTH", "true")
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr("backend.main.gemini_available", lambda: True)
    res = client.post(
        "/api/form-vision",
        json={"images": ["YWFhYQ=="], "logged_exercise": "Squat"},
    )
    assert res.status_code == 401


def test_health_includes_gemini_flag(client, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data.get("gemini_available") is True
    assert "live_form_vision" in data["features"]

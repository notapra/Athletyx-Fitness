from backend.coaching_service import (
    _should_web_search,
    _uri_to_title,
    _web_search_enabled,
    serpapi_available,
)


def test_should_web_search_detects_research_queries():
    assert _should_web_search("What does science say about RPE?") is True
    assert _should_web_search("log 3 sets bench") is False


def test_web_search_skipped_without_serpapi_key(monkeypatch):
    monkeypatch.delenv("SERPAPI_API_KEY", raising=False)
    monkeypatch.setenv("SERPAPI_ENABLED", "false")
    assert serpapi_available() is False
    assert _web_search_enabled("What does science say about RPE?", None) is False
    assert _web_search_enabled("What does science say about RPE?", True) is False


def test_web_search_requires_explicit_enable(monkeypatch):
    monkeypatch.setenv("SERPAPI_API_KEY", "test-key")
    monkeypatch.setenv("SERPAPI_ENABLED", "false")
    assert serpapi_available() is False
    monkeypatch.setenv("SERPAPI_ENABLED", "true")
    assert serpapi_available() is True


def test_uri_to_title_known_resources():
    title = _uri_to_title("athletyx://legal/health-disclaimer")
    assert title == "Health Disclaimer"

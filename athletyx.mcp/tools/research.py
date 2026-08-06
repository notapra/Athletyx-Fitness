"""Web and document search tools with user personalization context."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

import httpx

from auth import get_authenticated_user_id
from db import fetch_consents, fetch_personalization_context

_SERPAPI_URL = "https://serpapi.com/search.json"
_CONTENT = Path(__file__).resolve().parent.parent / "content"

# Indexed MCP resources for context-aware search
_DOC_INDEX: list[tuple[str, str]] = []


def _load_doc_index() -> list[tuple[str, str]]:
    global _DOC_INDEX
    if _DOC_INDEX:
        return _DOC_INDEX

    from resources import _LEGAL, _POLICIES

    for uri, text in {**_LEGAL, **_POLICIES}.items():
        _DOC_INDEX.append((uri, text))

    catalog_path = _CONTENT / "exercises.json"
    if catalog_path.exists():
        _DOC_INDEX.append(("athletyx://exercises/catalog", catalog_path.read_text(encoding="utf-8")))

    guide_path = _CONTENT / "personalization-guide.md"
    if guide_path.exists():
        _DOC_INDEX.append(("athletyx://coaching/personalization-guide", guide_path.read_text(encoding="utf-8")))

    research_dir = _CONTENT / "research"
    if research_dir.is_dir():
        for path in sorted(research_dir.glob("*.md")):
            uri = f"athletyx://research/{path.stem}"
            _DOC_INDEX.append((uri, path.read_text(encoding="utf-8")))

    return _DOC_INDEX


def _tokenize(text: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9]+", text.lower()) if len(t) > 2}


def _best_snippet(query: str, body: str, size: int = 520) -> str:
    """Prefer the paragraph that best matches the query (not just the file header)."""
    tokens = _tokenize(query)
    blocks = [b.strip() for b in re.split(r"\n\s*\n", body) if b.strip()]
    if not blocks:
        return body[:size].replace("\n", " ").strip()

    def block_score(block: str) -> float:
        lower = block.lower()
        score = sum(2.0 for t in tokens if t in lower)
        if lower.startswith("## key findings") or "key findings" in lower[:80]:
            score += 3.0
        if lower.startswith("## coach application"):
            score += 2.5
        return score

    ranked = sorted(blocks, key=block_score, reverse=True)
    snippet = ranked[0]
    # Prefer findings + coach application when both score
    if len(ranked) > 1 and block_score(ranked[1]) >= block_score(ranked[0]) * 0.7:
        combo = f"{ranked[0]}\n\n{ranked[1]}"
        if len(combo) <= size + 80:
            snippet = combo
    clean = snippet.replace("\n", " ").strip()
    return clean[:size] + ("…" if len(clean) > size else "")


def _score_document(query: str, uri: str, body: str, search_context: str) -> tuple[float, list[str]]:
    query_tokens = _tokenize(query)
    context_tokens = _tokenize(search_context)
    body_lower = body.lower()
    score = 0.0
    reasons: list[str] = []

    for token in query_tokens:
        if token in body_lower:
            score += 2.0

    # Boost docs relevant to user's injuries/restrictions mentioned in query or profile
    for token in context_tokens:
        if token in body_lower:
            score += 0.5

    # Penalize docs that mention restricted movements when those appear in profile context
    restriction_markers = ["overhead press", "deadlift", "deep knee", "pistol squat", "injury", "pain"]
    for marker in restriction_markers:
        if marker in search_context.lower() and marker in body_lower:
            score += 1.0
            reasons.append(f"Relevant to profile context: '{marker}'")

    if "/research/" in uri:
        score += 1.5
        reasons.append("Peer-reviewed research brief")

    if uri.endswith("health-disclaimer") or uri.endswith("safety-rails"):
        score += 0.5
        reasons.append("Safety/policy document")

    return score, reasons


def rank_documents(query: str, search_context: str, limit: int = 5) -> list[dict]:
    results: list[dict] = []
    for uri, body in _load_doc_index():
        score, reasons = _score_document(query, uri, body, search_context)
        if score <= 0:
            continue
        snippet = _best_snippet(query, body)
        results.append(
            {
                "uri": uri,
                "score": round(score, 2),
                "snippet": snippet,
                "relevance_notes": reasons,
            }
        )

    results.sort(key=lambda r: r["score"], reverse=True)
    return results[: max(1, min(limit, 10))]


def _serpapi_api_key() -> str:
    return os.getenv("SERPAPI_API_KEY", "").strip()


def search_via_serpapi(
    query: str,
    *,
    engine: str = "duckduckgo",
    num: int = 8,
    location: str | None = None,
    hl: str | None = None,
    gl: str | None = None,
    google_domain: str | None = None,
) -> dict:
    """
    SerpAPI web search — https://serpapi.com/search.json
    API key from SERPAPI_API_KEY env only (never commit keys to the repo).
    """
    api_key = _serpapi_api_key()
    if not api_key:
        raise RuntimeError(
            "SERPAPI_API_KEY not set. Copy athletyx.mcp/.env.example to .env and add your key."
        )

    params: dict[str, str | int] = {
        "engine": engine,
        "q": query,
        "api_key": api_key,
    }
    if location:
        params["location"] = location
    if hl:
        params["hl"] = hl
    if gl:
        params["gl"] = gl
    if google_domain:
        params["google_domain"] = google_domain

    with httpx.Client(timeout=30.0) as client:
        response = client.get(_SERPAPI_URL, params=params)
        response.raise_for_status()
        payload = response.json()

    organic = []
    for item in payload.get("organic_results", [])[:num]:
        organic.append(
            {
                "title": item.get("title"),
                "link": item.get("link"),
                "snippet": item.get("snippet"),
            }
        )

    return {
        "engine": engine,
        "query": query,
        "results": organic,
        "related_searches": payload.get("related_searches", [])[:5],
        "result_count": len(organic),
        "search_information": payload.get("search_information"),
    }


def search_duckduckgo_via_serpapi(query: str, num: int = 8) -> dict:
    return search_via_serpapi(query, engine="duckduckgo", num=num)


def register(mcp) -> None:
    from tools.helpers import fail, ok, safe_execute

    @mcp.tool()
    def get_personalization_context() -> dict:
        """Return age, injuries, effort limits, and coaching directives for the authenticated user."""

        def _run():
            user_id = get_authenticated_user_id()
            ctx = fetch_personalization_context(user_id)
            if ctx is None:
                return fail("User context unavailable.")
            return ok(ctx)

        return safe_execute(_run)

    @mcp.tool()
    def search_documents_with_context(query: str, limit: int = 5) -> dict:
        """
        Search Athletyx resources (policies, exercise catalog, safety guides)
        ranked by query match and the user's personal factors (age, injuries, restrictions).
        """

        def _run():
            user_id = get_authenticated_user_id()
            ctx = fetch_personalization_context(user_id)
            if ctx is None:
                return fail("User context unavailable.")
            search_context = ctx["search_context"]
            hits = rank_documents(query, search_context, limit)
            return ok(
                {
                    "query": query,
                    "personalization_applied": search_context,
                    "results": hits,
                }
            )

        return safe_execute(_run)

    @mcp.tool()
    def search_web_serpapi(
        query: str,
        engine: str = "duckduckgo",
        num_results: int = 8,
        location: str | None = None,
        hl: str | None = None,
        gl: str | None = None,
    ) -> dict:
        """
        Search the web via SerpAPI (https://serpapi.com/search.json).
        engine: duckduckgo (default) or google. For google, pass location/hl/gl as needed.
        Query is enriched with user personal factors. Key from SERPAPI_API_KEY in .env only.
        """

        def _run():
            user_id = get_authenticated_user_id()
            consents = fetch_consents(user_id)
            if not consents.ai_coaching:
                return fail("AI coaching consent required for web research. Call update_consent first.")

            if not _serpapi_api_key():
                return fail(
                    "SERPAPI_API_KEY not set. Copy athletyx.mcp/.env.example to .env (gitignored)."
                )

            ctx = fetch_personalization_context(user_id)
            if ctx is None:
                return fail("User context unavailable.")

            enriched_query = f"{query} ({ctx['search_context']})"
            safe_num = max(1, min(num_results, 15))
            loc = location or os.getenv("SERPAPI_LOCATION")
            lang = hl or os.getenv("SERPAPI_HL", "en")
            region = gl or os.getenv("SERPAPI_GL", "us")
            data = search_via_serpapi(
                enriched_query,
                engine=engine.strip().lower(),
                num=safe_num,
                location=loc,
                hl=lang,
                gl=region,
                google_domain="google.com" if engine.strip().lower() == "google" else None,
            )
            data["original_query"] = query
            data["personalization_applied"] = ctx["search_context"]
            return ok(data)

        return safe_execute(_run)

    @mcp.tool()
    def search_web_duckduckgo(query: str, num_results: int = 8) -> dict:
        """DuckDuckGo via SerpAPI. Alias for search_web_serpapi(engine=duckduckgo)."""

        def _run():
            user_id = get_authenticated_user_id()
            consents = fetch_consents(user_id)
            if not consents.ai_coaching:
                return fail("AI coaching consent required for web research. Call update_consent first.")
            if not _serpapi_api_key():
                return fail(
                    "SERPAPI_API_KEY not set. Copy athletyx.mcp/.env.example to .env (gitignored)."
                )
            ctx = fetch_personalization_context(user_id)
            if ctx is None:
                return fail("User context unavailable.")
            enriched_query = f"{query} ({ctx['search_context']})"
            safe_num = max(1, min(num_results, 15))
            data = search_duckduckgo_via_serpapi(enriched_query, safe_num)
            data["original_query"] = query
            data["personalization_applied"] = ctx["search_context"]
            return ok(data)

        return safe_execute(_run)

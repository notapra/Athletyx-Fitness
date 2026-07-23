"""
IronLog ↔ Athletyx coaching — RAG document search + SerpAPI web research + optional OpenAI.

Loads API keys from PRIVATE.env (repo root). Never expose keys to the browser.
"""

from __future__ import annotations

import importlib.util
import os
import re
import sys
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv

_REPO_ROOT = Path(__file__).resolve().parents[2]
_MCP_ROOT = _REPO_ROOT / "athletyx.mcp"

load_dotenv(_REPO_ROOT / "PRIVATE.env")
load_dotenv(_MCP_ROOT / ".env")


def _load_mcp_module(module_name: str, relative_path: str):
    """Load athletyx.mcp modules without permanently shadowing athletyx/tools."""
    path = _MCP_ROOT / relative_path
    mcp = str(_MCP_ROOT)
    inserted = mcp not in sys.path
    if inserted:
        sys.path.insert(0, mcp)
    try:
        spec = importlib.util.spec_from_file_location(f"athletyx_mcp_{module_name}", path)
        if spec is None or spec.loader is None:
            raise ImportError(f"Cannot load MCP module at {path}")
        mod = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = mod
        spec.loader.exec_module(mod)
        return mod
    finally:
        if inserted and mcp in sys.path:
            sys.path.remove(mcp)


_personalization = _load_mcp_module("personalization", "personalization.py")
_research = _load_mcp_module("research", "tools/research.py")
build_personalization_context_from_profile = _personalization.build_personalization_context_from_profile
rank_documents = _research.rank_documents
search_via_serpapi = _research.search_via_serpapi


def _purge_mcp_tools_namespace() -> None:
    """research.py imports mcp.tools.* — remove so athletyx/tools stays importable."""
    tools_mod = sys.modules.get("tools")
    tools_file = (getattr(tools_mod, "__file__", "") or "").replace("\\", "/")
    if "athletyx.mcp" in tools_file:
        for key in list(sys.modules):
            if key == "tools" or key.startswith("tools."):
                del sys.modules[key]


_purge_mcp_tools_namespace()

from contextlib import contextmanager  # noqa: E402


@contextmanager
def _mcp_import_path():
    """Expose athletyx.mcp on sys.path for RAG doc loading during coach requests."""
    mcp = str(_MCP_ROOT)
    inserted = mcp not in sys.path
    if inserted:
        sys.path.insert(0, mcp)
    try:
        yield
    finally:
        _purge_mcp_tools_namespace()
        if inserted and mcp in sys.path:
            sys.path.remove(mcp)


from backend.query_cache import get_cached_response, save_cached_response  # noqa: E402

_WEB_RESEARCH_RE = re.compile(
    r"\b(research|study|studies|evidence|science|safe|alternative|injury|rehab|"
    r"protocol|latest|compare|vs\.?|what does|how to|best exercise)\b",
    re.I,
)


def _openai_key() -> str:
    return os.getenv("OPENAI_API_KEY", "").strip()


def _serpapi_available() -> bool:
    flag = os.getenv("SERPAPI_ENABLED", "false").lower()
    if flag not in ("1", "true", "yes"):
        return False
    return bool(os.getenv("SERPAPI_API_KEY", "").strip())


def serpapi_available() -> bool:
    return _serpapi_available()


def _should_web_search(message: str) -> bool:
    return bool(_WEB_RESEARCH_RE.search(message))


def _web_search_enabled(message: str, use_web_search: bool | None) -> bool:
    """Run SerpAPI/DDG only when explicitly allowed and API key is configured."""
    if use_web_search is False:
        return False
    if not _serpapi_available():
        return False
    if use_web_search is True:
        return True
    return _should_web_search(message)


def _format_rag_block(hits: list[dict]) -> str:
    if not hits:
        return ""
    lines = ["ATHLETYX KNOWLEDGE BASE (ranked for this user):"]
    for hit in hits:
        lines.append(f"- [{hit['uri']}] (score {hit['score']}): {hit['snippet']}")
    return "\n".join(lines)


def _uri_to_title(uri: str) -> str:
    labels = {
        "athletyx://legal/health-disclaimer": "Health Disclaimer",
        "athletyx://legal/privacy-policy": "Privacy Policy",
        "athletyx://legal/terms-of-service": "Terms of Service",
        "athletyx://legal/ai-disclosure": "AI Disclosure",
        "athletyx://privacy/data-categories": "Data Categories",
        "athletyx://privacy/retention-policy": "Retention Policy",
        "athletyx://guardian/policy": "Goal Guardian Policy",
        "athletyx://ai/safety-rails": "AI Safety Rails",
        "athletyx://exercises/catalog": "Exercise Catalog",
        "athletyx://analytics/methodology": "Analytics Methodology",
        "athletyx://coaching/personalization-guide": "Personalization Guide",
    }
    return labels.get(uri, uri.replace("athletyx://", "").replace("/", " · "))


def _build_citations(doc_hits: list[dict], web_data: dict | None) -> list[dict]:
    citations: list[dict] = []
    for hit in doc_hits:
        citations.append(
            {
                "type": "document",
                "id": hit.get("uri"),
                "title": _uri_to_title(hit.get("uri", "")),
                "snippet": hit.get("snippet"),
                "score": hit.get("score"),
                "source": "Athletyx RAG",
            }
        )
    if web_data:
        for item in (web_data.get("results") or [])[:6]:
            link = item.get("link")
            title = item.get("title") or "Web result"
            citations.append(
                {
                    "type": "web",
                    "id": link or title,
                    "title": title,
                    "snippet": item.get("snippet"),
                    "url": link,
                    "source": "DuckDuckGo (SerpAPI)",
                }
            )
    return citations


def _format_web_block(data: dict) -> str:
    results = data.get("results") or []
    if not results:
        return ""
    lines = ["WEB RESEARCH (SerpAPI / DuckDuckGo, personalized query):"]
    for item in results[:5]:
        title = item.get("title") or "Untitled"
        snippet = item.get("snippet") or ""
        link = item.get("link") or ""
        lines.append(f"- {title}: {snippet} ({link})")
    return "\n".join(lines)


def _build_system_prompt(
    message: str,
    analysis: dict | None,
    personalization: dict,
    rag_block: str,
    web_block: str,
) -> str:
    directives = "\n".join(f"- {d}" for d in personalization.get("coaching_directives", []))
    stats = (analysis or {}).get("stats") or {}
    recovery = (analysis or {}).get("recovery") or {}

    return f"""You are IronCoach inside IronLog, powered by Athletyx personalization + RAG + web research.
You are NOT a doctor. Include a brief disclaimer when giving training advice.

USER PERSONALIZATION:
{personalization.get("search_context", "")}

COACHING DIRECTIVES:
{directives or "- Use conservative defaults"}

TRAINING SNAPSHOT:
- Sessions (30d): {stats.get("totalWorkouts", "n/a")}
- Readiness: {recovery.get("readiness", "n/a")}%
- Recovery score: {recovery.get("recoveryScore", "n/a")}/100

{rag_block}

{web_block}

Rules:
- Respect movement_restrictions and injury_history absolutely.
- Cite Athletyx resources or web snippets when relevant.
- Stay concise (2-5 sentences) unless user asks for detail.
- Use lbs for weights unless user uses kg.

USER QUESTION: {message}
"""


def _fallback_reply(
    message: str,
    personalization: dict,
    doc_hits: list[dict],
    web_block: str = "",
) -> str:
    """Evidence-based coach when OPENAI_API_KEY is not set — answers from RAG hits."""
    directives = personalization.get("coaching_directives") or []
    factors = personalization.get("personal_factors") or {}
    injuries = factors.get("injury_history") or []
    restrictions = factors.get("movement_restrictions") or []

    lower = (message or "").lower()
    topic_uri_hints = []
    if any(w in lower for w in ("protein", "nutrition", "diet", "calorie", "eat")):
        topic_uri_hints = ["protein-issn"]
    elif any(w in lower for w in ("deload", "taper", "overreach")):
        topic_uri_hints = ["deloading"]
    elif any(w in lower for w in ("sleep", "recover", "recovery", "fatigue", "tired")):
        topic_uri_hints = ["sleep-recovery"]
    elif any(w in lower for w in ("shoulder", "injury", "pain", "overhead", "ohp")):
        topic_uri_hints = ["injury-shoulder-safety"]
    elif any(w in lower for w in ("bench", "squat", "strength", "hypertrophy", "train today", "workout")):
        topic_uri_hints = ["resistance-training-acsm"]

    research_hits = [h for h in (doc_hits or []) if "/research/" in (h.get("uri") or "")]
    top = None
    for hint in topic_uri_hints:
        top = next((h for h in research_hits if hint in (h.get("uri") or "")), None)
        if top:
            break
    if top is None:
        top = research_hits[0] if research_hits else ((doc_hits or [None])[0])

    snippet = (top or {}).get("snippet") or ""
    uri = (top or {}).get("uri") or ""

    # Pull a compact factual line from the best-matching research brief
    fact = ""
    if snippet:
        for sentence in re.split(r"(?<=[.!?])\s+", snippet):
            if any(ch.isdigit() for ch in sentence) or "not" in sentence.lower() or "do not" in sentence.lower():
                fact = sentence.strip()
                if len(fact) > 40:
                    break
        if not fact:
            fact = snippet[:280].strip()

    injury_note = ""
    if injuries or restrictions:
        bits = []
        if injuries:
            bits.append(f"injuries on file: {', '.join(map(str, injuries))}")
        if restrictions:
            bits.append(f"restrictions: {', '.join(map(str, restrictions))}")
        injury_note = " Respecting your profile (" + "; ".join(bits) + ")."

    if any(w in lower for w in ("protein", "nutrition", "diet", "calorie", "eat")):
        lead = (
            "For muscle gain, evidence-based targets are about **1.4–2.0 g protein/kg/day** "
            "(~**0.64–0.91 g/lb**), with meals of ~20–40 g protein across the day."
        )
    elif any(w in lower for w in ("deload", "taper", "overreach")):
        lead = (
            "A deload is usually ~**5–7 days** of reduced volume (often every **4–8 weeks**, "
            "or sooner if performance stalls / joints feel beat up) — keep showing up, cut sets/reps."
        )
    elif any(w in lower for w in ("sleep", "recover", "recovery", "fatigue", "tired")):
        lead = (
            "Sleep loss reliably hurts training quality and raises perceived effort; "
            "aim for about **7–9 hours**. ~6 hours is usually not enough for hard sessions."
        )
    elif any(w in lower for w in ("shoulder", "injury", "pain", "overhead", "ohp")):
        lead = (
            "Do **not** load heavy overhead pressing through shoulder pain — "
            "get clearance and use pain-free alternatives until symptoms settle."
        )
    elif any(w in lower for w in ("bench", "squat", "strength", "hypertrophy", "train today", "workout")):
        lead = (
            "Progress comes from consistent exposure (≥~2×/week per muscle), progressive overload, "
            "and enough weekly volume — absolute failure every set is not required."
        )
    else:
        lead = directives[0] if directives else "Train consistently, progress gradually, and recover well."

    cite = f" Sources: {uri}." if uri else ""
    detail = f" From Athletyx research notes: {fact}" if fact else ""
    web_hint = " Web research also available when SerpAPI is enabled." if web_block else ""
    disclaimer = " Not medical advice."

    return f"{lead}{injury_note}{detail}{cite}{web_hint}{disclaimer}"


async def _call_openai(system_prompt: str, user_message: str) -> str:
    api_key = _openai_key()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not set")

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                "temperature": 0.6,
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


async def coach_with_athletyx(
    message: str,
    profile: dict,
    goals: list[dict] | None = None,
    analysis: dict | None = None,
    *,
    use_web_search: bool | None = None,
) -> dict[str, Any]:
    """
    Full Athletyx pipeline: personalization → RAG → optional SerpAPI → LLM or fallback.
    """
    text = (message or "").strip()
    if not text:
        return {"content": "Ask me about training, recovery, or injuries.", "sources": {}}

    cached, cache_meta = get_cached_response(text, profile, goals)
    if cached:
        cached["cache"] = cache_meta
        return cached

    with _mcp_import_path():
        personalization = build_personalization_context_from_profile(profile, goals)
        search_context = personalization["search_context"]

        doc_hits = rank_documents(text, search_context, limit=5)
        rag_block = _format_rag_block(doc_hits)

        web_data: dict | None = None
        web_block = ""
        serpapi_ok = _serpapi_available()
        do_web = _web_search_enabled(text, use_web_search)
        if do_web:
            try:
                enriched = f"{text} ({search_context})"
                web_data = search_via_serpapi(enriched, engine="duckduckgo", num=6)
                web_block = _format_web_block(web_data)
            except Exception as exc:
                web_block = f"(Web search unavailable: {exc})"

        system_prompt = _build_system_prompt(text, analysis, personalization, rag_block, web_block)

        if _openai_key():
            try:
                content = await _call_openai(system_prompt, text)
            except Exception as exc:
                content = _fallback_reply(text, personalization, doc_hits, web_block)
                content += f"\n\n_(LLM error: {exc})_"
        else:
            content = _fallback_reply(text, personalization, doc_hits, web_block)

        result = {
            "content": content,
            "powered_by": "Athletyx",
            "personalization_applied": search_context,
            "citations": _build_citations(doc_hits, web_data),
            "search_trace": {
                "personalized": True,
                "rag_hits": len(doc_hits),
                "web_search_available": serpapi_ok,
                "web_search_requested": do_web,
                "web_search_used": bool(web_data),
                "web_engine": "duckduckgo" if web_data else None,
                "cache_hit": False,
            },
            "sources": {
                "documents": doc_hits,
                "web": web_data,
            },
            "tool_used": "athletyx_rag_coach",
        }
    save_meta = save_cached_response(text, profile, goals, result)
    result["cache"] = {**cache_meta, **save_meta, "cache_hit": False}
    return result

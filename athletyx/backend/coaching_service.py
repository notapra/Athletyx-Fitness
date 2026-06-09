"""
IronLog ↔ Athletyx coaching — RAG document search + SerpAPI web research + optional OpenAI.

Loads API keys from PRIVATE.env (repo root). Never expose keys to the browser.
"""

from __future__ import annotations

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

if str(_MCP_ROOT) not in sys.path:
    sys.path.insert(0, str(_MCP_ROOT))

from personalization import build_personalization_context_from_profile  # noqa: E402
from tools.research import rank_documents, search_via_serpapi  # noqa: E402

_WEB_RESEARCH_RE = re.compile(
    r"\b(research|study|studies|evidence|science|safe|alternative|injury|rehab|"
    r"protocol|latest|compare|vs\.?|what does|how to|best exercise)\b",
    re.I,
)


def _openai_key() -> str:
    return os.getenv("OPENAI_API_KEY", "").strip()


def _should_web_search(message: str) -> bool:
    return bool(_WEB_RESEARCH_RE.search(message))


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


def _fallback_reply(message: str, personalization: dict, rag_block: str, web_block: str) -> str:
    """Offline coach when OPENAI_API_KEY is not set."""
    directives = personalization.get("coaching_directives") or []
    top_directive = directives[0] if directives else "Train consistently and recover well."
    rag_hint = ""
    if rag_block:
        rag_hint = " I checked Athletyx safety guides and your exercise catalog for this."
    web_hint = ""
    if web_block:
        web_hint = " I also pulled recent web research tailored to your profile."
    return (
        f"{top_directive}{rag_hint}{web_hint} "
        f"Regarding your question: focus on form, progressive overload within your effort limits, "
        f"and ask again with OPENAI_API_KEY in PRIVATE.env for full LLM coaching."
    )


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

    personalization = build_personalization_context_from_profile(profile, goals)
    search_context = personalization["search_context"]

    doc_hits = rank_documents(text, search_context, limit=5)
    rag_block = _format_rag_block(doc_hits)

    web_data: dict | None = None
    web_block = ""
    do_web = use_web_search if use_web_search is not None else _should_web_search(text)
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
            content = _fallback_reply(text, personalization, rag_block, web_block)
            content += f"\n\n_(LLM error: {exc})_"
    else:
        content = _fallback_reply(text, personalization, rag_block, web_block)

    return {
        "content": content,
        "powered_by": "Athletyx",
        "personalization_applied": search_context,
        "citations": _build_citations(doc_hits, web_data),
        "search_trace": {
            "personalized": True,
            "rag_hits": len(doc_hits),
            "web_search_used": do_web,
            "web_engine": "duckduckgo" if web_data else None,
        },
        "sources": {
            "documents": doc_hits,
            "web": web_data,
        },
        "tool_used": "athletyx_rag_coach",
    }

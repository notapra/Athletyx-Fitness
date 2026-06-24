"""
Persistent cache for Athletyx coach responses — avoids repeat OpenAI/SerpAPI calls.

Cache key = SHA256(normalized query + profile fingerprint).
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import threading
import time
from pathlib import Path
from typing import Any

_CACHE_DIR = Path(os.getenv("COACH_CACHE_DIR", str(Path(__file__).resolve().parent / ".cache")))
_CACHE_FILE = _CACHE_DIR / "coach_responses.json"
_LOG_FILE = _CACHE_DIR / "coach_cache_log.jsonl"
_LOCK = threading.Lock()

_DEFAULT_TTL_HOURS = int(os.getenv("COACH_CACHE_TTL_HOURS", "168"))
_WEB_TTL_HOURS = int(os.getenv("COACH_CACHE_WEB_TTL_HOURS", "24"))
_MAX_ENTRIES = int(os.getenv("COACH_CACHE_MAX_ENTRIES", "500"))


def _enabled() -> bool:
    return os.getenv("COACH_CACHE_ENABLED", "true").lower() not in ("0", "false", "no")


def _normalize_query(text: str) -> str:
    t = (text or "").strip().lower()
    t = re.sub(r"\s+", " ", t)
    return t


def _profile_fingerprint(profile: dict | None, goals: list | None) -> str:
    p = profile or {}
    pf = (p.get("ai_preferences") or {}).get("personal_factors") or {}
    parts = [
        str(p.get("fitness_goal") or ""),
        str(p.get("experience_level") or ""),
        str(p.get("units") or "lbs"),
        str(p.get("age") or ""),
        ",".join(sorted(pf.get("injuries") or [])),
        ",".join(sorted(pf.get("movement_restrictions") or [])),
        str(pf.get("effort_level") or ""),
        str(len(goals or [])),
    ]
    return "|".join(parts)


def make_cache_key(message: str, profile: dict | None, goals: list | None) -> str:
    raw = f"{_normalize_query(message)}::{_profile_fingerprint(profile, goals)}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _load_store() -> dict[str, Any]:
    if not _CACHE_FILE.exists():
        return {"entries": {}, "stats": {"hits": 0, "misses": 0, "saves": 0}}
    try:
        return json.loads(_CACHE_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {"entries": {}, "stats": {"hits": 0, "misses": 0, "saves": 0}}


def _save_store(store: dict[str, Any]) -> None:
    _CACHE_DIR.mkdir(parents=True, exist_ok=True)
    _CACHE_FILE.write_text(json.dumps(store, indent=0), encoding="utf-8")


def _append_log(event: dict[str, Any]) -> None:
    _CACHE_DIR.mkdir(parents=True, exist_ok=True)
    event = {**event, "ts": time.time()}
    with _LOG_FILE.open("a", encoding="utf-8") as f:
        f.write(json.dumps(event, ensure_ascii=False) + "\n")


def _is_expired(entry: dict[str, Any]) -> bool:
    ttl_hours = entry.get("ttl_hours") or _DEFAULT_TTL_HOURS
    created = entry.get("created_at") or 0
    return (time.time() - created) > ttl_hours * 3600


def _evict_if_needed(entries: dict[str, Any]) -> None:
    if len(entries) <= _MAX_ENTRIES:
        return
    ranked = sorted(entries.items(), key=lambda kv: kv[1].get("last_hit_at") or kv[1].get("created_at", 0))
    for key, _ in ranked[: len(entries) - _MAX_ENTRIES]:
        del entries[key]


def get_cached_response(
    message: str,
    profile: dict | None,
    goals: list | None,
) -> tuple[dict[str, Any] | None, dict[str, Any]]:
    """Return (cached coach payload, cache_meta)."""
    meta: dict[str, Any] = {"cache_enabled": _enabled()}
    if not _enabled():
        return None, meta

    key = make_cache_key(message, profile, goals)
    meta["cache_key"] = key[:16]

    with _LOCK:
        store = _load_store()
        entry = store["entries"].get(key)

        if not entry or _is_expired(entry):
            store["stats"]["misses"] = store["stats"].get("misses", 0) + 1
            _save_store(store)
            _append_log({"event": "miss", "key": key[:16], "query": _normalize_query(message)[:120]})
            meta["cache_hit"] = False
            return None, meta

        entry["hit_count"] = entry.get("hit_count", 0) + 1
        entry["last_hit_at"] = time.time()
        store["entries"][key] = entry
        store["stats"]["hits"] = store["stats"].get("hits", 0) + 1
        _save_store(store)

    _append_log(
        {
            "event": "hit",
            "key": key[:16],
            "query": _normalize_query(message)[:120],
            "hit_count": entry["hit_count"],
        }
    )

    meta["cache_hit"] = True
    meta["cache_hit_count"] = entry["hit_count"]
    meta["cached_at"] = entry.get("created_at")

    response = dict(entry["response"])
    response["from_cache"] = True
    if response.get("search_trace") is not None:
        response["search_trace"] = {
            **response["search_trace"],
            "cache_hit": True,
        }
    return response, meta


def save_cached_response(
    message: str,
    profile: dict | None,
    goals: list | None,
    response: dict[str, Any],
) -> dict[str, Any]:
    """Store coach response for future reuse."""
    meta: dict[str, Any] = {"cache_enabled": _enabled()}
    if not _enabled():
        return meta

    key = make_cache_key(message, profile, goals)
    web_used = (response.get("search_trace") or {}).get("web_search_used")
    ttl = _WEB_TTL_HOURS if web_used else _DEFAULT_TTL_HOURS

    with _LOCK:
        store = _load_store()
        store["entries"][key] = {
            "query_normalized": _normalize_query(message),
            "response": response,
            "created_at": time.time(),
            "last_hit_at": time.time(),
            "hit_count": 0,
            "ttl_hours": ttl,
            "web_search_used": bool(web_used),
        }
        _evict_if_needed(store["entries"])
        store["stats"]["saves"] = store["stats"].get("saves", 0) + 1
        _save_store(store)

    _append_log({"event": "save", "key": key[:16], "query": _normalize_query(message)[:120], "ttl_hours": ttl})
    meta["cache_saved"] = True
    meta["cache_key"] = key[:16]
    return meta


def get_cache_stats() -> dict[str, Any]:
    with _LOCK:
        store = _load_store()
    return {
        "entries": len(store.get("entries", {})),
        **store.get("stats", {}),
    }

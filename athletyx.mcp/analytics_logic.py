"""Training analytics computed from workout sessions (Phase 2 MCP)."""

from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path
from typing import Any

_EXERCISES_PATH = Path(__file__).resolve().parent / "content" / "exercises.json"


def _load_exercise_muscle_map() -> dict[str, str]:
    try:
        catalog = json.loads(_EXERCISES_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    mapping: dict[str, str] = {}
    for item in catalog:
        name = str(item.get("name") or "").strip().lower()
        group = str(item.get("muscleGroup") or "Other")
        if name:
            mapping[name] = group
    return mapping


def _session_volume(session_detail: dict[str, Any]) -> float:
    total = 0.0
    for ex in session_detail.get("exercises") or []:
        for s in ex.get("sets") or []:
            total += float(s.get("weight") or 0) * float(s.get("reps") or 0)
    return total


def _flatten_sets(session_detail: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    session = session_detail.get("session") or {}
    date = session.get("created_at") or session.get("started_at")
    for ex in session_detail.get("exercises") or []:
        name = ex.get("exercise_name") or "Unknown"
        for s in ex.get("sets") or []:
            rows.append(
                {
                    "exercise": name,
                    "weight": float(s.get("weight") or 0),
                    "reps": float(s.get("reps") or 0),
                    "date": date,
                }
            )
    return rows


def compute_training_analytics(session_details: list[dict[str, Any]]) -> dict[str, Any]:
    total_sets = 0
    total_volume = 0.0
    exercise_counts: dict[str, int] = defaultdict(int)

    for detail in session_details:
        rows = _flatten_sets(detail)
        total_sets += len(rows)
        total_volume += _session_volume(detail)
        for row in rows:
            key = str(row["exercise"]).strip().lower()
            if key:
                exercise_counts[key] += 1

    most_trained = None
    most_count = 0
    for name, count in exercise_counts.items():
        if count > most_count:
            most_count = count
            most_trained = name

    return {
        "total_workouts": len(session_details),
        "total_sets": total_sets,
        "total_volume": round(total_volume, 2),
        "most_trained_exercise": most_trained.title() if most_trained else None,
        "exercise_set_counts": dict(sorted(exercise_counts.items(), key=lambda x: -x[1])[:20]),
    }


def compute_personal_records(session_details: list[dict[str, Any]]) -> list[dict[str, Any]]:
    best: dict[str, dict[str, Any]] = {}
    for detail in session_details:
        for row in _flatten_sets(detail):
            key = str(row["exercise"]).strip().lower()
            weight = float(row["weight"] or 0)
            if not key or weight <= 0:
                continue
            prev = best.get(key)
            if prev is None or weight > float(prev["weight"]):
                best[key] = {
                    "exercise": row["exercise"],
                    "weight": weight,
                    "date": row.get("date"),
                }
    return sorted(best.values(), key=lambda r: -float(r["weight"]))


def compute_muscle_heat_map(session_details: list[dict[str, Any]]) -> dict[str, Any]:
    muscle_map = _load_exercise_muscle_map()
    counts: dict[str, int] = defaultdict(int)
    for detail in session_details:
        for row in _flatten_sets(detail):
            key = str(row["exercise"]).strip().lower()
            group = muscle_map.get(key, "Other")
            counts[group] += 1
    total = sum(counts.values()) or 1
    return {
        "set_counts_by_muscle": dict(sorted(counts.items(), key=lambda x: -x[1])),
        "relative": {k: round(v / total, 3) for k, v in counts.items()},
        "total_sets": sum(counts.values()),
    }


def score_goal_alignment(
    contract: dict[str, Any] | None,
    recent_message: str | None = None,
) -> dict[str, Any]:
    """Lightweight guardian drift heuristic (mirrors client Goal Guardian intent)."""
    text = (recent_message or "").lower()
    primary = str((contract or {}).get("primary_goal") or "").lower()
    constraints = [str(c).lower() for c in ((contract or {}).get("constraints") or [])]

    training_hits = sum(
        1
        for w in (
            "workout",
            "train",
            "lift",
            "set",
            "rep",
            "protein",
            "volume",
            "recovery",
            "goal",
        )
        if w in text
    )
    off_topic_hits = sum(
        1 for w in ("politics", "crypto", "celebrity", "homework", "movie") if w in text
    )

    drift = 0
    reasons: list[str] = []
    if text and training_hits == 0 and len(text.split()) > 8:
        drift += 35
        reasons.append("Message lacks training keywords")
    if off_topic_hits:
        drift += 25 * off_topic_hits
        reasons.append("Off-topic keywords detected")
    if primary and text and primary.split()[0] not in text and training_hits == 0:
        drift += 15
        reasons.append("No reference to primary goal")
    for c in constraints:
        if c and any(tok in text for tok in c.split() if len(tok) > 3) and "ignore" in text:
            drift += 20
            reasons.append(f"Possible constraint conflict: {c}")

    drift = min(100, drift)
    if drift < 30:
        status = "aligned"
    elif drift <= 60:
        status = "soft_warning"
    else:
        status = "high_drift"

    return {
        "drift_score": drift,
        "status": status,
        "aligned": drift < 30,
        "reasons": reasons,
        "primary_goal": (contract or {}).get("primary_goal"),
    }

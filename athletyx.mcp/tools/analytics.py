"""Phase 2 MCP analytics tools."""

from __future__ import annotations

from auth import get_authenticated_user_id
from analytics_logic import (
    compute_muscle_heat_map,
    compute_personal_records,
    compute_training_analytics,
)
from db import fetch_workout_session_detail, fetch_workout_sessions
from tools.helpers import ok, safe_execute


def _load_session_details(user_id, limit: int = 50) -> list[dict]:
    summaries = fetch_workout_sessions(user_id, limit=limit)
    details = []
    for s in summaries:
        detail = fetch_workout_session_detail(user_id, s.id)
        if detail is None:
            continue
        details.append(detail.model_dump())
    return details


def register(mcp) -> None:
    @mcp.tool()
    def get_training_analytics(limit: int = 50) -> dict:
        """Aggregate workouts, sets, volume, and most-trained exercise for the user."""

        def _run():
            user_id = get_authenticated_user_id()
            details = _load_session_details(user_id, limit)
            return ok(compute_training_analytics(details))

        return safe_execute(_run)

    @mcp.tool()
    def get_personal_records(limit: int = 50) -> dict:
        """Return personal records (max weight per exercise) from recent sessions."""

        def _run():
            user_id = get_authenticated_user_id()
            details = _load_session_details(user_id, limit)
            return ok(compute_personal_records(details))

        return safe_execute(_run)

    @mcp.tool()
    def get_muscle_heat_map(limit: int = 50) -> dict:
        """Muscle-group set distribution for heat-map style coaching insights."""

        def _run():
            user_id = get_authenticated_user_id()
            details = _load_session_details(user_id, limit)
            return ok(compute_muscle_heat_map(details))

        return safe_execute(_run)

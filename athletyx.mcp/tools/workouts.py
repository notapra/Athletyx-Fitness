"""Workout session MCP tools."""

from __future__ import annotations

import json
from pathlib import Path

from auth import get_authenticated_user_id
from db import (
    create_workout_session,
    fetch_workout_session_detail,
    fetch_workout_sessions,
    log_exercise_sets,
)
from tools.helpers import fail, ok, safe_execute
from tools.workout_logic import parse_raw_workout_log

_CONTENT = Path(__file__).resolve().parent.parent / "content" / "exercises.json"


def register(mcp) -> None:
    @mcp.tool()
    def get_workout_sessions(limit: int = 20) -> dict:
        """List recent workout sessions for the authenticated user."""

        def _run():
            user_id = get_authenticated_user_id()
            sessions = fetch_workout_sessions(user_id, limit)
            return ok([s.model_dump() for s in sessions])

        return safe_execute(_run)

    @mcp.tool()
    def get_workout_session_detail(session_id: int) -> dict:
        """Get a workout session with exercises and sets."""

        def _run():
            user_id = get_authenticated_user_id()
            detail = fetch_workout_session_detail(user_id, session_id)
            if detail is None:
                return fail(f"Session {session_id} not found.")
            return ok(detail.model_dump())

        return safe_execute(_run)

    @mcp.tool(name="create_workout_session")
    def create_workout_session_tool(split: str, notes: str = "", duration: int = 0) -> dict:
        """Create a new workout session. Audited."""

        def _run():
            user_id = get_authenticated_user_id()
            session = create_workout_session(user_id, split, notes, duration)
            return ok(session.model_dump(), "Workout session created.")

        return safe_execute(_run)

    @mcp.tool(name="log_exercise_sets")
    def log_exercise_sets_tool(
        session_id: int,
        exercise_name: str,
        sets: list[dict],
        muscle_group: str | None = None,
    ) -> dict:
        """Log sets for an exercise in a session. Audited. Each set: {reps, weight}."""

        def _run():
            user_id = get_authenticated_user_id()
            entry = log_exercise_sets(user_id, session_id, exercise_name, sets, muscle_group)
            if entry is None:
                return fail(f"Session {session_id} not found or access denied.")
            return ok(entry.model_dump(), "Sets logged.")

        return safe_execute(_run)

    @mcp.tool()
    def parse_raw_workout_log(raw_text: str) -> dict:
        """Parse natural-language workout text into structured confirmation."""

        def _run():
            get_authenticated_user_id()
            return ok(parse_raw_workout_log(raw_text))

        return safe_execute(_run)

    @mcp.tool()
    def search_exercise_library(
        query: str = "",
        muscle_group: str = "all",
        movement_type: str = "all",
        limit: int = 20,
    ) -> dict:
        """Search the exercise catalog (public reference data)."""
        catalog = json.loads(_CONTENT.read_text(encoding="utf-8"))
        q = query.strip().lower()
        safe_limit = max(1, min(limit, 50))
        results = []
        for item in catalog:
            if q and q not in item["name"].lower() and q not in item["muscleGroup"].lower():
                continue
            if muscle_group != "all" and item["muscleGroup"] != muscle_group:
                continue
            if movement_type != "all" and item["movementType"] != movement_type:
                continue
            results.append(item)
            if len(results) >= safe_limit:
                break
        return ok(results)

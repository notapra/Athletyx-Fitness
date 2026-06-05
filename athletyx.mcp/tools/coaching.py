"""AI coaching MCP tools."""

from __future__ import annotations

from auth import get_authenticated_user_id
from db import fetch_consents
from tools.helpers import fail, ok, safe_execute
from tools.workout_logic import generate_workout_routine


def register(mcp) -> None:
    @mcp.tool(name="generate_workout_routine")
    def generate_workout_routine_tool(goal: str, split: str) -> dict:
        """Generate a markdown workout routine. Requires ai_coaching consent."""

        def _run():
            user_id = get_authenticated_user_id()
            consents = fetch_consents(user_id)
            if not consents.ai_coaching:
                return fail("AI coaching consent required. Call update_consent first.")
            routine = generate_workout_routine(goal, split)
            return ok({"routine_markdown": routine})

        return safe_execute(_run)

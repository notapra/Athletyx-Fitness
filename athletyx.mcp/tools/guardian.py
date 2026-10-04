"""Phase 2 MCP Goal Guardian tools."""

from __future__ import annotations

from analytics_logic import score_goal_alignment
from auth import get_authenticated_user_id
from db import (
    build_goal_contract,
    fetch_guardian_history,
    record_guardian_check,
)
from tools.helpers import fail, ok, safe_execute


def register(mcp) -> None:
    @mcp.tool()
    def run_guardian_check(message: str | None = None) -> dict:
        """
        Run a Goal Guardian alignment check against the user's goal contract.
        Optionally pass the latest chat/message text for drift scoring.
        """

        def _run():
            user_id = get_authenticated_user_id()
            contract = build_goal_contract(user_id)
            if contract is None:
                return fail("No profile/goal contract found for user.")
            result = score_goal_alignment(contract.model_dump(), message)
            record_guardian_check(
                user_id,
                check_type="scheduled" if not message else "post_response",
                drift_score=result["drift_score"],
                aligned=result["aligned"],
                coach_excerpt=(message or "")[:280] or None,
                payload=result,
            )
            return ok(result, "Guardian check complete.")

        return safe_execute(_run)

    @mcp.tool()
    def get_guardian_history(limit: int = 25) -> dict:
        """Return recent Goal Guardian checks for the authenticated user."""

        def _run():
            user_id = get_authenticated_user_id()
            rows = fetch_guardian_history(user_id, limit=limit)
            return ok(rows)

        return safe_execute(_run)

    @mcp.tool()
    def get_guardian_reminder_policy() -> dict:
        """Return reminder caps/cooldowns used by Goal Guardian scheduling."""
        return ok(
            {
                "reminder_caps": {"per_day": 2, "per_week": 5},
                "cooldown_hours": 4,
                "drift_threshold": 60,
                "resource": "athletyx://guardian/policy",
            }
        )

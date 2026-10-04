"""Phase 2 MCP account compliance tools."""

from __future__ import annotations

from auth import get_authenticated_user_id
from db import export_user_data, request_account_deletion
from tools.helpers import ok, safe_execute


def register(mcp) -> None:
    @mcp.tool()
    def export_user_data() -> dict:
        """Export the authenticated user's profile, workouts, goals, chat, and related data."""

        def _run():
            user_id = get_authenticated_user_id()
            payload = export_user_data(user_id)
            return ok(payload, "Export ready.")

        return safe_execute(_run)

    @mcp.tool()
    def request_account_deletion() -> dict:
        """
        Request account deletion (App Store / Play compliance).
        Schedules purge according to retention policy (typically 30 days).
        """

        def _run():
            user_id = get_authenticated_user_id()
            result = request_account_deletion(user_id)
            return ok(result, "Deletion requested.")

        return safe_execute(_run)

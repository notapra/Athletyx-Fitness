"""Compliance and audit MCP tools."""

from __future__ import annotations

from auth import get_authenticated_user_id
from db import fetch_audit_log
from tools.helpers import ok, safe_execute


def register(mcp) -> None:
    @mcp.tool()
    def get_audit_log(limit: int = 50) -> dict:
        """Return mutation audit trail for the authenticated user."""

        def _run():
            user_id = get_authenticated_user_id()
            entries = fetch_audit_log(user_id, limit)
            return ok([e.model_dump() for e in entries])

        return safe_execute(_run)

"""Phase 2 MCP chat history tools."""

from __future__ import annotations

from auth import get_authenticated_user_id
from db import append_chat_message, fetch_chat_history
from tools.helpers import fail, ok, safe_execute


def register(mcp) -> None:
    @mcp.tool()
    def get_chat_history(limit: int = 50) -> dict:
        """Return IronCoach / AI chat history for the authenticated user."""

        def _run():
            user_id = get_authenticated_user_id()
            rows = fetch_chat_history(user_id, limit=limit)
            return ok(rows)

        return safe_execute(_run)

    @mcp.tool()
    def append_chat_message(role: str, message: str) -> dict:
        """
        Append a chat message (role: user | assistant | system).
        Audited for account export / compliance.
        """

        def _run():
            role_norm = (role or "").strip().lower()
            if role_norm not in ("user", "assistant", "system"):
                return fail("role must be user, assistant, or system")
            text = (message or "").strip()
            if not text:
                return fail("message is required")
            user_id = get_authenticated_user_id()
            row = append_chat_message(user_id, role_norm, text)
            return ok(row, "Message appended.")

        return safe_execute(_run)

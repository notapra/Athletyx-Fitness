"""User scoping and admin gates for app-store-grade MCP access."""

from __future__ import annotations

import os


class AuthError(Exception):
    """Raised when a tool violates user scope or admin policy."""


def is_admin() -> bool:
    return os.getenv("ATHLETYX_ADMIN", "false").lower() in ("1", "true", "yes")


def get_authenticated_user_id() -> int:
    """Return the user ID the MCP client is acting on behalf of."""
    raw = os.getenv("ATHLETYX_USER_ID", "").strip()
    if not raw:
        raise AuthError(
            "ATHLETYX_USER_ID is required. Set it in the MCP client env block."
        )
    try:
        user_id = int(raw)
    except ValueError as exc:
        raise AuthError("ATHLETYX_USER_ID must be a positive integer.") from exc
    if user_id < 1:
        raise AuthError("ATHLETYX_USER_ID must be a positive integer.")
    return user_id


def require_self_or_admin(target_user_id: int) -> int:
    """Allow access only to the authenticated user unless admin."""
    actor = get_authenticated_user_id()
    if actor != target_user_id and not is_admin():
        raise AuthError("Access denied: you may only access your own user data.")
    return actor


def require_admin() -> None:
    if not is_admin():
        raise AuthError("Access denied: admin privileges required.")

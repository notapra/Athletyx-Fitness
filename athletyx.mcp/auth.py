"""User scoping, JWT validation, admin gates, and per-user rate limits."""

from __future__ import annotations

import os
import time
import uuid
from collections import defaultdict
from dataclasses import dataclass
from typing import Any

import httpx

from mcp_types import UserId

RATE_LIMIT = int(os.getenv("MCP_RATE_LIMIT_PER_HOUR", "120"))
RATE_WINDOW = 3600
_rate_buckets: dict[str, list[float]] = defaultdict(list)

_jwt_user_cache: dict[str, tuple[float, dict[str, Any]]] = {}
_JWT_CACHE_TTL = 60.0


class AuthError(Exception):
    """Raised when a tool violates user scope or admin policy."""


@dataclass(frozen=True)
class AuthContext:
    user_id: UserId
    email: str | None
    is_admin: bool
    auth_method: str  # "jwt" | "legacy_env"
    access_token: str | None = None


def _require_auth() -> bool:
    return os.getenv("MCP_REQUIRE_AUTH", "false").lower() in ("1", "true", "yes")


def _supabase_url() -> str:
    return os.getenv("SUPABASE_URL", "").strip().rstrip("/")


def _supabase_anon() -> str:
    return os.getenv("SUPABASE_ANON_KEY", "").strip()


def is_admin() -> bool:
    return get_auth_context().is_admin


def _legacy_admin_flag() -> bool:
    return os.getenv("ATHLETYX_ADMIN", "false").lower() in ("1", "true", "yes")


def _verify_supabase_jwt(token: str) -> dict[str, Any]:
    cached = _jwt_user_cache.get(token)
    now = time.time()
    if cached and now - cached[0] < _JWT_CACHE_TTL:
        return cached[1]

    url = _supabase_url()
    anon = _supabase_anon()
    if not url or not anon:
        raise AuthError("JWT auth requires SUPABASE_URL and SUPABASE_ANON_KEY.")

    with httpx.Client(timeout=10.0) as client:
        resp = client.get(
            f"{url}/auth/v1/user",
            headers={"Authorization": f"Bearer {token}", "apikey": anon},
        )
    if resp.status_code != 200:
        raise AuthError("Invalid or expired MCP JWT.")

    user = resp.json()
    _jwt_user_cache[token] = (now, user)
    return user


def _user_is_admin(user: dict[str, Any]) -> bool:
    meta = user.get("app_metadata") or {}
    role = (meta.get("role") or meta.get("athletyx_role") or "").lower()
    return role in ("admin", "service_role")


def _parse_legacy_user_id() -> int | None:
    raw = os.getenv("ATHLETYX_USER_ID", "").strip()
    if not raw:
        return None
    try:
        user_id = int(raw)
    except ValueError as exc:
        raise AuthError("ATHLETYX_USER_ID must be a positive integer.") from exc
    if user_id < 1:
        raise AuthError("ATHLETYX_USER_ID must be a positive integer.")
    return user_id


def _check_rate_limit(actor_key: str) -> None:
    now = time.time()
    bucket = _rate_buckets[actor_key]
    _rate_buckets[actor_key] = [t for t in bucket if now - t < RATE_WINDOW]
    if len(_rate_buckets[actor_key]) >= RATE_LIMIT:
        raise AuthError("MCP rate limit exceeded for this user. Try again later.")
    _rate_buckets[actor_key].append(now)


def get_access_token() -> str:
    """Return the Supabase access token for PostgREST (JWT mode only)."""
    ctx = get_auth_context()
    if not ctx.access_token:
        raise AuthError("No access token available in legacy auth mode.")
    return ctx.access_token


def get_auth_context() -> AuthContext:
    """
    Resolve the authenticated actor for this MCP process.

    Production (MCP_REQUIRE_AUTH=true):
      - Requires ATHLETYX_MCP_JWT (Supabase access token)
      - user_id is the Supabase auth UUID (profiles.id)

    Development (MCP_REQUIRE_AUTH=false):
      - Requires ATHLETYX_USER_ID integer (local Postgres users table)
    """
    if _require_auth():
        token = os.getenv("ATHLETYX_MCP_JWT", "").strip()
        if not token:
            raise AuthError(
                "ATHLETYX_MCP_JWT is required when MCP_REQUIRE_AUTH=true. "
                "Obtain a Supabase session token from IronLog Settings → MCP access."
            )
        user = _verify_supabase_jwt(token)
        user_id = user.get("id")
        if not user_id:
            raise AuthError("JWT payload missing user id.")
        try:
            uuid.UUID(str(user_id))
        except ValueError as exc:
            raise AuthError("JWT user id must be a UUID.") from exc

        actor_key = str(user_id)
        _check_rate_limit(actor_key)
        return AuthContext(
            user_id=str(user_id),
            email=user.get("email"),
            is_admin=_user_is_admin(user),
            auth_method="jwt",
            access_token=token,
        )

    legacy_id = _parse_legacy_user_id()
    if legacy_id is None:
        raise AuthError(
            "ATHLETYX_USER_ID is required in development mode. "
            "Set MCP_REQUIRE_AUTH=true and ATHLETYX_MCP_JWT for production JWT auth."
        )
    _check_rate_limit(f"legacy:{legacy_id}")
    return AuthContext(
        user_id=legacy_id,
        email=None,
        is_admin=_legacy_admin_flag(),
        auth_method="legacy_env",
        access_token=None,
    )


def get_authenticated_user_id() -> UserId:
    """Return the user ID the MCP client is acting on behalf of."""
    return get_auth_context().user_id


def require_self_or_admin(target_user_id: UserId) -> UserId:
    """Allow access only to the authenticated user unless admin."""
    actor = get_auth_context()
    if str(actor.user_id) != str(target_user_id) and not actor.is_admin:
        raise AuthError("Access denied: you may only access your own user data.")
    return actor.user_id


def require_admin() -> None:
    if not get_auth_context().is_admin:
        raise AuthError("Access denied: admin privileges required.")

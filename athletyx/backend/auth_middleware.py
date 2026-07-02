"""Supabase JWT validation and rate limiting for production Coach API."""

from __future__ import annotations

import os
import time
from collections import defaultdict
from typing import Any

import httpx
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

_bearer = HTTPBearer(auto_error=False)

_jwks_cache: dict[str, Any] | None = None
_rate_buckets: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT = int(os.getenv("COACH_RATE_LIMIT_PER_HOUR", "30"))
RATE_WINDOW = 3600


def _supabase_url() -> str | None:
    return os.getenv("SUPABASE_URL", "").strip().rstrip("/") or None


def _require_auth() -> bool:
    return os.getenv("REQUIRE_AUTH", "false").lower() in ("1", "true", "yes")


async def _fetch_jwks() -> dict[str, Any]:
    global _jwks_cache
    if _jwks_cache:
        return _jwks_cache
    url = _supabase_url()
    if not url:
        return {}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(f"{url}/auth/v1/.well-known/jwks.json")
        resp.raise_for_status()
        _jwks_cache = resp.json()
        return _jwks_cache


async def verify_supabase_jwt(token: str) -> dict[str, Any]:
    """Validate JWT via Supabase auth user endpoint."""
    url = _supabase_url()
    anon = os.getenv("SUPABASE_ANON_KEY", "").strip()
    if not url or not anon:
        raise HTTPException(status_code=503, detail="Auth not configured on server")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{url}/auth/v1/user",
                headers={"Authorization": f"Bearer {token}", "apikey": anon},
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid or expired token")
            return resp.json()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="Auth provider unavailable") from exc


def check_rate_limit(user_id: str) -> None:
    now = time.time()
    bucket = _rate_buckets[user_id]
    _rate_buckets[user_id] = [t for t in bucket if now - t < RATE_WINDOW]
    if len(_rate_buckets[user_id]) >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Coach rate limit exceeded")
    _rate_buckets[user_id].append(now)


async def get_current_user(
    request: Request,
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict[str, Any] | None:
    if not _require_auth():
        return None
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Authorization required")
    user = await verify_supabase_jwt(creds.credentials)
    check_rate_limit(user.get("id", "unknown"))
    request.state.user = user
    return user


def get_cors_origins() -> list[str]:
    raw = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,capacitor://localhost,https://localhost",
    )
    return [o.strip() for o in raw.split(",") if o.strip()]

"""
Post-v1 MCP production auth — validate Supabase JWT for agent tooling.

Usage (stdio MCP with JWT):
  ATHLETYX_MCP_JWT=<supabase_access_token> python -m athletyx.mcp
"""

from __future__ import annotations

import os

import httpx


def verify_mcp_jwt(token: str | None = None) -> dict | None:
    """Return Supabase user payload when token is valid; None when auth disabled."""
    if os.getenv("MCP_REQUIRE_AUTH", "false").lower() not in ("1", "true", "yes"):
        return None

    token = (token or os.getenv("ATHLETYX_MCP_JWT", "")).strip()
    url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    anon = os.getenv("SUPABASE_ANON_KEY", "").strip()
    if not token or not url or not anon:
        raise PermissionError("MCP JWT auth required but not configured")

    resp = httpx.get(
        f"{url}/auth/v1/user",
        headers={"Authorization": f"Bearer {token}", "apikey": anon},
        timeout=10.0,
    )
    if resp.status_code != 200:
        raise PermissionError("Invalid MCP JWT")
    return resp.json()

"""MCP session helpers for per-user Cursor / Claude Desktop configuration."""

from __future__ import annotations

import os
from typing import Any


def build_mcp_session_payload(user: dict[str, Any], access_token: str) -> dict[str, Any]:
    """Return env vars and domain server list for the authenticated user."""
    user_id = user.get("id")
    email = user.get("email")
    domains = ["identity", "workouts", "goals", "coaching", "research", "compliance"]

    base_env = {
        "MCP_REQUIRE_AUTH": "true",
        "ATHLETYX_DB_BACKEND": "supabase",
        "ATHLETYX_MCP_JWT": access_token,
        "SUPABASE_URL": os.getenv("SUPABASE_URL", "").strip(),
        "SUPABASE_ANON_KEY": os.getenv("SUPABASE_ANON_KEY", "").strip(),
        "MCP_RATE_LIMIT_PER_HOUR": os.getenv("MCP_RATE_LIMIT_PER_HOUR", "120"),
    }

    serp_key = os.getenv("SERPAPI_API_KEY", "").strip()
    if serp_key:
        base_env["SERPAPI_API_KEY"] = serp_key

    return {
        "user_id": user_id,
        "email": email,
        "auth_mode": "supabase_jwt",
        "instructions": (
            "Use your Supabase access token as ATHLETYX_MCP_JWT. "
            "Tokens expire — refresh from IronLog Settings → MCP access after sign-in. "
            "Each domain is a separate MCP server so tool counts stay under client limits."
        ),
        "shared_env": {k: v for k, v in base_env.items() if k != "ATHLETYX_MCP_JWT"},
        "access_token": access_token,
        "domains": [
            {
                "domain": domain,
                "server_name": f"athletyx-{domain}",
                "env": {**base_env, "ATHLETYX_MCP_DOMAIN": domain},
            }
            for domain in domains
        ],
        "public_server": {
            "server_name": "athletyx-public",
            "env": {
                "ATHLETYX_MCP_DOMAIN": "public",
                "ATHLETYX_DB_BACKEND": "supabase",
            },
        },
        "cursor_example": {
            "mcpServers": {
                f"athletyx-{domains[0]}": {
                    "command": "python",
                    "args": ["path/to/athletyx.mcp/server.py"],
                    "env": {**base_env, "ATHLETYX_MCP_DOMAIN": domains[0]},
                }
            }
        },
    }

"""
Athletyx MCP Server — app-store grade tools, resources, and prompts.

Phase 3 production auth:
  MCP_REQUIRE_AUTH=true
  ATHLETYX_MCP_JWT=<supabase access token>
  ATHLETYX_DB_BACKEND=supabase
  SUPABASE_URL / SUPABASE_ANON_KEY

Development (local Postgres integer users):
  ATHLETYX_USER_ID=1
  ATHLETYX_DB_BACKEND=local

Domain split (optional): ATHLETYX_MCP_DOMAIN=identity|workouts|goals|coaching|research|compliance|analytics|guardian|chat|account|healthkit|all|public
"""

from __future__ import annotations

import logging
import os
import sys

from mcp.server.fastmcp import FastMCP

import prompts as prompts_module
import resources as resources_module
from tools import register_domain

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stderr,
)
logger = logging.getLogger(__name__)

_DOMAIN = os.getenv("ATHLETYX_MCP_DOMAIN", "all").strip().lower()
_REQUIRE_AUTH = os.getenv("MCP_REQUIRE_AUTH", "false").lower() in ("1", "true", "yes")
_DB_BACKEND = os.getenv("ATHLETYX_DB_BACKEND", "local").strip().lower()

_SERVER_NAMES = {
    "all": "athletyx-fitness",
    "public": "athletyx-public",
    "identity": "athletyx-identity",
    "workouts": "athletyx-workouts",
    "goals": "athletyx-goals",
    "coaching": "athletyx-coaching",
    "research": "athletyx-research",
    "compliance": "athletyx-compliance",
    "analytics": "athletyx-analytics",
    "guardian": "athletyx-guardian",
    "chat": "athletyx-chat",
    "account": "athletyx-account",
    "healthkit": "athletyx-healthkit",
}

mcp = FastMCP(
    _SERVER_NAMES.get(_DOMAIN, f"athletyx-{_DOMAIN}"),
    instructions=(
        "Athletyx fitness MCP server (app-store grade). "
        "Production: MCP_REQUIRE_AUTH + ATHLETYX_MCP_JWT (Supabase session). "
        "Each user only accesses their own data via RLS. "
        "Read legal/health resources before coaching. "
        "Use get_personalization_context and get_goal_contract before personalized advice."
    ),
)

resources_module.register(mcp)
if _DOMAIN not in ("public",):
    prompts_module.register(mcp)
    register_domain(mcp, _DOMAIN)


def main() -> None:
    logger.info(
        "Starting Athletyx MCP domain=%s backend=%s auth=%s",
        _DOMAIN,
        _DB_BACKEND,
        "jwt" if _REQUIRE_AUTH else "legacy",
    )
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()

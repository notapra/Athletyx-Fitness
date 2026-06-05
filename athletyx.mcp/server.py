"""
Athletyx MCP Server — app-store grade tools, resources, and prompts.

Exposes user-scoped fitness data access over stdio. Set ATHLETYX_USER_ID in the
client env block to identify the authenticated user.
"""

from __future__ import annotations

import logging
import sys

from mcp.server.fastmcp import FastMCP

import prompts as prompts_module
import resources as resources_module
from tools import register_all

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stderr,
)
logger = logging.getLogger(__name__)

mcp = FastMCP(
    "athletyx-fitness",
    instructions=(
        "Athletyx fitness MCP server (app-store grade). "
        "Requires ATHLETYX_USER_ID in env for user-scoped tools. "
        "Read legal/health resources before coaching. "
        "Use get_goal_contract before personalized advice. "
        "Admin-only: search_users_by_profile (set ATHLETYX_ADMIN=true)."
    ),
)

register_all(mcp)
resources_module.register(mcp)
prompts_module.register(mcp)


def main() -> None:
    logger.info("Starting Athletyx MCP server (stdio)")
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()

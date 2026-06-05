"""
Athletyx User Data MCP Server.

Exposes read-only, parameterized tools for querying fitness user profiles
from PostgreSQL over stdio transport. All database access uses bound parameters;
no dynamic SQL from tool arguments.
"""

from __future__ import annotations

import logging
import sys

from mcp.server.fastmcp import FastMCP

from db import fetch_user_by_email, fetch_user_by_id, fetch_users_by_profile
from models import UserListResult, UserQueryResult

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stderr,
)
logger = logging.getLogger(__name__)

mcp = FastMCP(
    "athletyx-user-data",
    instructions=(
        "Read-only access to Athletyx fitness user profiles in PostgreSQL. "
        "Use get_user_by_id when you have a numeric user ID. "
        "Use get_user_by_email for email lookups. "
        "Use search_users_by_profile to filter by fitness_goal and/or experience_level."
    ),
)


@mcp.tool()
def get_user_by_id(user_id: int) -> dict:
    """
    Retrieve a user's fitness profile by their unique integer ID.

    Args:
        user_id: Primary key from the users table (positive integer).

    Returns:
        JSON object with `found`, optional `user` record, and optional `message`.
    """
    if user_id < 1:
        result = UserQueryResult(
            found=False,
            message="user_id must be a positive integer.",
        )
        return result.model_dump()

    try:
        user = fetch_user_by_id(user_id)
    except Exception as exc:
        logger.exception("get_user_by_id failed for user_id=%s", user_id)
        result = UserQueryResult(found=False, message=f"Database error: {exc}")
        return result.model_dump()

    if user is None:
        result = UserQueryResult(
            found=False,
            message=f"No user found with id={user_id}.",
        )
        return result.model_dump()

    result = UserQueryResult(found=True, user=user)
    return result.model_dump()


@mcp.tool()
def get_user_by_email(email: str) -> dict:
    """
    Retrieve a user's fitness profile by email address (case-insensitive).

    Args:
        email: Unique email address stored on the user record.

    Returns:
        JSON object with `found`, optional `user` record, and optional `message`.
    """
    normalized = email.strip()
    if not normalized:
        result = UserQueryResult(found=False, message="email must not be empty.")
        return result.model_dump()

    try:
        user = fetch_user_by_email(normalized)
    except Exception as exc:
        logger.exception("get_user_by_email failed for email=%s", normalized)
        result = UserQueryResult(found=False, message=f"Database error: {exc}")
        return result.model_dump()

    if user is None:
        result = UserQueryResult(
            found=False,
            message=f"No user found with email={normalized}.",
        )
        return result.model_dump()

    result = UserQueryResult(found=True, user=user)
    return result.model_dump()


@mcp.tool()
def search_users_by_profile(
    fitness_goal: str | None = None,
    experience_level: str | None = None,
    limit: int = 25,
) -> dict:
    """
    Search users by fitness_goal and/or experience_level (case-insensitive).

    At least one filter must be provided. Results are capped at 100 rows.

    Args:
        fitness_goal: Filter by goal (e.g. "muscle_gain", "fat_loss").
        experience_level: Filter by tier (e.g. "beginner", "intermediate", "advanced").
        limit: Maximum rows to return (default 25, max 100).

    Returns:
        JSON object with `count`, `users` list, and optional `message`.
    """
    if fitness_goal is None and experience_level is None:
        result = UserListResult(
            count=0,
            users=[],
            message="Provide at least one of fitness_goal or experience_level.",
        )
        return result.model_dump()

    try:
        users = fetch_users_by_profile(
            fitness_goal=fitness_goal,
            experience_level=experience_level,
            limit=limit,
        )
    except ValueError as exc:
        result = UserListResult(count=0, users=[], message=str(exc))
        return result.model_dump()
    except Exception as exc:
        logger.exception(
            "search_users_by_profile failed goal=%s level=%s",
            fitness_goal,
            experience_level,
        )
        result = UserListResult(count=0, users=[], message=f"Database error: {exc}")
        return result.model_dump()

    result = UserListResult(count=len(users), users=users)
    return result.model_dump()


def main() -> None:
    """Run the MCP server over stdio (default FastMCP transport)."""
    logger.info("Starting Athletyx User Data MCP server (stdio)")
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()

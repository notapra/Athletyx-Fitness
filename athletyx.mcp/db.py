"""PostgreSQL access layer with parameterized queries only."""

from __future__ import annotations

import logging
import os
import sys
from contextlib import contextmanager
from typing import Any

import psycopg2
from dotenv import load_dotenv
from psycopg2.extras import RealDictCursor

from models import User

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stderr,
)
logger = logging.getLogger(__name__)

_USER_COLUMNS = "id, name, email, fitness_goal, experience_level"


def _require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def get_connection_params() -> dict[str, Any]:
    """Build psycopg2 connection kwargs from standard DB_* environment variables."""
    return {
        "host": _require_env("DB_HOST"),
        "port": int(os.getenv("DB_PORT", "5432")),
        "dbname": _require_env("DB_NAME"),
        "user": _require_env("DB_USER"),
        "password": _require_env("DB_PASSWORD"),
    }


@contextmanager
def get_connection():
    """Yield a short-lived PostgreSQL connection (one per tool invocation)."""
    conn = psycopg2.connect(**get_connection_params())
    try:
        yield conn
    finally:
        conn.close()


def _row_to_user(row: dict[str, Any] | None) -> User | None:
    if row is None:
        return None
    return User.model_validate(dict(row))


def fetch_user_by_id(user_id: int) -> User | None:
    """Fetch a single user by primary key using a parameterized query."""
    sql = f"""
        SELECT {_USER_COLUMNS}
        FROM users
        WHERE id = %s
        LIMIT 1
    """
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, (user_id,))
            return _row_to_user(cur.fetchone())


def fetch_user_by_email(email: str) -> User | None:
    """Fetch a single user by email using a parameterized query."""
    sql = f"""
        SELECT {_USER_COLUMNS}
        FROM users
        WHERE lower(email) = lower(%s)
        LIMIT 1
    """
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, (email.strip(),))
            return _row_to_user(cur.fetchone())


def fetch_users_by_profile(
    fitness_goal: str | None = None,
    experience_level: str | None = None,
    limit: int = 25,
) -> list[User]:
    """
    Fetch users filtered by optional profile fields.
    At least one filter must be provided.
    """
    if fitness_goal is None and experience_level is None:
        raise ValueError("Provide at least one of fitness_goal or experience_level.")

    clauses: list[str] = []
    params: list[Any] = []

    if fitness_goal is not None:
        clauses.append("lower(fitness_goal) = lower(%s)")
        params.append(fitness_goal.strip())

    if experience_level is not None:
        clauses.append("lower(experience_level) = lower(%s)")
        params.append(experience_level.strip())

    safe_limit = max(1, min(limit, 100))
    where_sql = " AND ".join(clauses)
    sql = f"""
        SELECT {_USER_COLUMNS}
        FROM users
        WHERE {where_sql}
        ORDER BY id
        LIMIT %s
    """
    params.append(safe_limit)

    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, tuple(params))
            return [User.model_validate(dict(row)) for row in cur.fetchall()]

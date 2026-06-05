"""PostgreSQL access layer with parameterized queries only."""

from __future__ import annotations

import json
import logging
import os
import sys
from contextlib import contextmanager
from datetime import datetime
from typing import Any

import psycopg2
from dotenv import load_dotenv
from psycopg2.extras import Json, RealDictCursor

from models import (
    AuditEntry,
    ConsentRecord,
    ExerciseEntryDetail,
    Goal,
    GoalContract,
    SetRecord,
    User,
    WorkoutSessionDetail,
    WorkoutSessionSummary,
)

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stderr,
)
logger = logging.getLogger(__name__)

_USER_COLUMNS = (
    "id, name, email, fitness_goal, experience_level, "
    "units, bodyweight, ai_enabled"
)


def _require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def get_connection_params() -> dict[str, Any]:
    return {
        "host": _require_env("DB_HOST"),
        "port": int(os.getenv("DB_PORT", "5432")),
        "dbname": _require_env("DB_NAME"),
        "user": _require_env("DB_USER"),
        "password": _require_env("DB_PASSWORD"),
    }


@contextmanager
def get_connection():
    conn = psycopg2.connect(**get_connection_params())
    try:
        yield conn
    finally:
        conn.close()


def _row_to_user(row: dict[str, Any] | None) -> User | None:
    if row is None:
        return None
    return User.model_validate(dict(row))


def _iso(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def record_audit(
    user_id: int,
    action: str,
    resource: str | None = None,
    payload: dict | None = None,
) -> None:
    sql = """
        INSERT INTO audit_log (user_id, action, resource, payload)
        VALUES (%s, %s, %s, %s)
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (user_id, action, resource, Json(payload or {})))
        conn.commit()


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

def fetch_user_by_id(user_id: int) -> User | None:
    sql = f"SELECT {_USER_COLUMNS} FROM users WHERE id = %s LIMIT 1"
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, (user_id,))
            return _row_to_user(cur.fetchone())


def fetch_user_by_email(email: str) -> User | None:
    sql = f"""
        SELECT {_USER_COLUMNS} FROM users
        WHERE lower(email) = lower(%s) LIMIT 1
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
    sql = f"""
        SELECT {_USER_COLUMNS} FROM users
        WHERE {" AND ".join(clauses)}
        ORDER BY id LIMIT %s
    """
    params.append(safe_limit)

    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, tuple(params))
            return [User.model_validate(dict(row)) for row in cur.fetchall()]


def update_user_preferences(
    user_id: int,
    fitness_goal: str | None = None,
    experience_level: str | None = None,
    units: str | None = None,
    bodyweight: float | None = None,
    ai_enabled: bool | None = None,
    constraints: list[str] | None = None,
) -> User | None:
    fields: list[str] = []
    params: list[Any] = []

    mapping: list[tuple[str, Any]] = [
        ("fitness_goal", fitness_goal),
        ("experience_level", experience_level),
        ("units", units),
        ("bodyweight", bodyweight),
        ("ai_enabled", ai_enabled),
        ("constraints", Json(constraints) if constraints is not None else None),
    ]
    for column, value in mapping:
        if value is not None:
            fields.append(f"{column} = %s")
            params.append(value)

    if not fields:
        return fetch_user_by_id(user_id)

    fields.append("updated_at = now()")
    params.append(user_id)
    sql = f"UPDATE users SET {', '.join(fields)} WHERE id = %s"

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, tuple(params))
        conn.commit()

    record_audit(user_id, "update_profile", "users", {"fields": fields})
    return fetch_user_by_id(user_id)


# ---------------------------------------------------------------------------
# Consents
# ---------------------------------------------------------------------------

def fetch_consents(user_id: int) -> ConsentRecord:
    sql = """
        SELECT ai_coaching, analytics, notifications
        FROM user_consents WHERE user_id = %s
    """
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, (user_id,))
            row = cur.fetchone()
            if row is None:
                return ConsentRecord(ai_coaching=False, analytics=False, notifications=False)
            return ConsentRecord.model_validate(dict(row))


def upsert_consents(
    user_id: int,
    ai_coaching: bool | None = None,
    analytics: bool | None = None,
    notifications: bool | None = None,
) -> ConsentRecord:
    existing = fetch_consents(user_id)
    record = ConsentRecord(
        ai_coaching=ai_coaching if ai_coaching is not None else existing.ai_coaching,
        analytics=analytics if analytics is not None else existing.analytics,
        notifications=notifications if notifications is not None else existing.notifications,
    )
    sql = """
        INSERT INTO user_consents (user_id, ai_coaching, analytics, notifications, updated_at)
        VALUES (%s, %s, %s, %s, now())
        ON CONFLICT (user_id) DO UPDATE SET
            ai_coaching = EXCLUDED.ai_coaching,
            analytics = EXCLUDED.analytics,
            notifications = EXCLUDED.notifications,
            updated_at = now()
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                sql,
                (user_id, record.ai_coaching, record.analytics, record.notifications),
            )
        conn.commit()

    record_audit(user_id, "update_consent", "user_consents", record.model_dump())
    return record


# ---------------------------------------------------------------------------
# Goals
# ---------------------------------------------------------------------------

def fetch_active_goals(user_id: int) -> list[Goal]:
    sql = """
        SELECT id, user_id, title, target, completed
        FROM goals WHERE user_id = %s AND completed = false
        ORDER BY created_at
    """
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, (user_id,))
            return [Goal.model_validate(dict(row)) for row in cur.fetchall()]


def create_goal(user_id: int, title: str, target: str | None = None) -> Goal:
    sql = """
        INSERT INTO goals (user_id, title, target)
        VALUES (%s, %s, %s)
        RETURNING id, user_id, title, target, completed
    """
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, (user_id, title.strip(), target))
            row = cur.fetchone()
        conn.commit()

    goal = Goal.model_validate(dict(row))
    record_audit(user_id, "create_goal", "goals", goal.model_dump())
    return goal


def complete_goal(user_id: int, goal_id: int) -> Goal | None:
    sql = """
        UPDATE goals SET completed = true
        WHERE id = %s AND user_id = %s
        RETURNING id, user_id, title, target, completed
    """
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, (goal_id, user_id))
            row = cur.fetchone()
        conn.commit()

    if row is None:
        return None
    goal = Goal.model_validate(dict(row))
    record_audit(user_id, "complete_goal", "goals", {"goal_id": goal_id})
    return goal


def build_goal_contract(user_id: int) -> GoalContract | None:
    user = fetch_user_by_id(user_id)
    if user is None:
        return None

    sql = "SELECT constraints FROM users WHERE id = %s"
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (user_id,))
            row = cur.fetchone()
    raw_constraints = row[0] if row else []
    if isinstance(raw_constraints, str):
        constraints = json.loads(raw_constraints)
    else:
        constraints = raw_constraints or []

    return GoalContract(
        primary_goal=user.fitness_goal,
        experience_level=user.experience_level,
        active_goals=fetch_active_goals(user_id),
        constraints=constraints,
        units=user.units,
    )


# ---------------------------------------------------------------------------
# Workouts
# ---------------------------------------------------------------------------

def fetch_workout_sessions(user_id: int, limit: int = 20) -> list[WorkoutSessionSummary]:
    safe_limit = max(1, min(limit, 50))
    sql = """
        SELECT ws.id, ws.user_id, ws.split, ws.duration, ws.notes,
               ws.started_at, ws.created_at,
               COUNT(ee.id) AS exercise_count
        FROM workout_sessions ws
        LEFT JOIN exercise_entries ee ON ee.session_id = ws.id
        WHERE ws.user_id = %s
        GROUP BY ws.id
        ORDER BY ws.created_at DESC
        LIMIT %s
    """
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, (user_id, safe_limit))
            rows = cur.fetchall()

    summaries: list[WorkoutSessionSummary] = []
    for row in rows:
        data = dict(row)
        data["started_at"] = _iso(data.get("started_at"))
        data["created_at"] = _iso(data.get("created_at"))
        summaries.append(WorkoutSessionSummary.model_validate(data))
    return summaries


def fetch_workout_session_detail(user_id: int, session_id: int) -> WorkoutSessionDetail | None:
    session_sql = """
        SELECT id, user_id, split, duration, notes, started_at, created_at
        FROM workout_sessions WHERE id = %s AND user_id = %s
    """
    exercises_sql = """
        SELECT id, exercise_name, muscle_group
        FROM exercise_entries WHERE session_id = %s ORDER BY sort_order, id
    """
    sets_sql = """
        SELECT reps, weight, sort_order
        FROM sets WHERE exercise_entry_id = %s ORDER BY sort_order, id
    """

    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(session_sql, (session_id, user_id))
            session_row = cur.fetchone()
            if session_row is None:
                return None

            session_data = dict(session_row)
            session_data["started_at"] = _iso(session_data.get("started_at"))
            session_data["created_at"] = _iso(session_data.get("created_at"))
            session_data["exercise_count"] = 0
            summary = WorkoutSessionSummary.model_validate(session_data)

            cur.execute(exercises_sql, (session_id,))
            exercise_rows = cur.fetchall()
            exercises: list[ExerciseEntryDetail] = []
            for ex in exercise_rows:
                cur.execute(sets_sql, (ex["id"],))
                set_rows = cur.fetchall()
                exercises.append(
                    ExerciseEntryDetail(
                        id=ex["id"],
                        exercise_name=ex["exercise_name"],
                        muscle_group=ex.get("muscle_group"),
                        sets=[SetRecord.model_validate(dict(s)) for s in set_rows],
                    )
                )
            summary.exercise_count = len(exercises)

    return WorkoutSessionDetail(session=summary, exercises=exercises)


def create_workout_session(
    user_id: int,
    split: str,
    notes: str = "",
    duration: int = 0,
) -> WorkoutSessionSummary:
    sql = """
        INSERT INTO workout_sessions (user_id, split, notes, duration, started_at)
        VALUES (%s, %s, %s, %s, now())
        RETURNING id, user_id, split, duration, notes, started_at, created_at
    """
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, (user_id, split.strip(), notes, duration))
            row = cur.fetchone()
        conn.commit()

    data = dict(row)
    data["started_at"] = _iso(data.get("started_at"))
    data["created_at"] = _iso(data.get("created_at"))
    data["exercise_count"] = 0
    summary = WorkoutSessionSummary.model_validate(data)
    record_audit(user_id, "create_workout_session", "workout_sessions", summary.model_dump())
    return summary


def log_exercise_sets(
    user_id: int,
    session_id: int,
    exercise_name: str,
    sets: list[dict[str, Any]],
    muscle_group: str | None = None,
) -> ExerciseEntryDetail | None:
    verify_sql = "SELECT id FROM workout_sessions WHERE id = %s AND user_id = %s"
    entry_sql = """
        INSERT INTO exercise_entries (session_id, exercise_name, muscle_group, sort_order)
        VALUES (%s, %s, %s, %s) RETURNING id
    """
    set_sql = """
        INSERT INTO sets (exercise_entry_id, reps, weight, sort_order)
        VALUES (%s, %s, %s, %s)
    """

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(verify_sql, (session_id, user_id))
            if cur.fetchone() is None:
                return None

            cur.execute(
                entry_sql,
                (session_id, exercise_name.strip(), muscle_group, 0),
            )
            entry_id = cur.fetchone()[0]

            set_records: list[SetRecord] = []
            for idx, item in enumerate(sets):
                reps = int(item.get("reps", 0))
                weight = float(item.get("weight", 0))
                cur.execute(set_sql, (entry_id, reps, weight, idx))
                set_records.append(SetRecord(reps=reps, weight=weight, sort_order=idx))
        conn.commit()

    record_audit(
        user_id,
        "log_exercise_sets",
        "exercise_entries",
        {"session_id": session_id, "exercise": exercise_name, "set_count": len(sets)},
    )
    return ExerciseEntryDetail(
        id=entry_id,
        exercise_name=exercise_name.strip(),
        muscle_group=muscle_group,
        sets=set_records,
    )


# ---------------------------------------------------------------------------
# Audit
# ---------------------------------------------------------------------------

def fetch_audit_log(user_id: int, limit: int = 50) -> list[AuditEntry]:
    safe_limit = max(1, min(limit, 100))
    sql = """
        SELECT id, action, resource, payload, created_at
        FROM audit_log WHERE user_id = %s
        ORDER BY created_at DESC LIMIT %s
    """
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, (user_id, safe_limit))
            rows = cur.fetchall()

    entries: list[AuditEntry] = []
    for row in rows:
        data = dict(row)
        if isinstance(data.get("payload"), str):
            data["payload"] = json.loads(data["payload"])
        data["created_at"] = _iso(data.get("created_at"))
        entries.append(AuditEntry.model_validate(data))
    return entries

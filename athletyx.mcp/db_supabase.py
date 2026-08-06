"""Supabase PostgREST data layer — UUID profiles schema with RLS via user JWT."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from models import (
    AuditEntry,
    ConsentRecord,
    ExerciseEntryDetail,
    Goal,
    GoalContract,
    PersonalFactors,
    SetRecord,
    User,
    WorkoutSessionDetail,
    WorkoutSessionSummary,
)
from personalization import build_personalization_context, merge_personal_factors
from postgrest_client import PostgrestError, delete, insert, patch, select, select_one, upsert
from mcp_types import UserId


def _iso(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def _ai_prefs(row: dict[str, Any]) -> dict[str, Any]:
    prefs = row.get("ai_preferences") or {}
    if isinstance(prefs, str):
        prefs = json.loads(prefs)
    return prefs if isinstance(prefs, dict) else {}


def _row_to_user(row: dict[str, Any] | None) -> User | None:
    if row is None:
        return None
    prefs = _ai_prefs(row)
    personal = prefs.get("personal_factors") or {}
    if isinstance(personal, str):
        personal = json.loads(personal)
    constraints = prefs.get("constraints") or []
    if isinstance(constraints, str):
        constraints = json.loads(constraints)

    consents = fetch_consents(str(row["id"]))
    return User(
        id=str(row["id"]),
        name=row.get("username") or row.get("email") or "Athlete",
        email=row.get("email") or "",
        fitness_goal=row.get("fitness_goal") or "",
        experience_level=row.get("experience_level") or "intermediate",
        units=row.get("units") or "lbs",
        bodyweight=float(row["bodyweight"]) if row.get("bodyweight") is not None else None,
        ai_enabled=consents.ai_coaching,
        age=row.get("age"),
        constraints=list(constraints) if isinstance(constraints, list) else [],
        personal_factors=PersonalFactors.model_validate(personal or {}),
    )


def record_audit(
    user_id: UserId,
    action: str,
    resource: str | None = None,
    payload: dict | None = None,
) -> None:
    try:
        insert(
            "mcp_audit_log",
            {
                "user_id": str(user_id),
                "action": action,
                "resource": resource,
                "payload": payload or {},
            },
        )
    except PostgrestError:
        pass


def fetch_user_by_id(user_id: UserId) -> User | None:
    row = select_one("profiles", filters={"id": f"eq.{user_id}"})
    return _row_to_user(row)


def fetch_user_by_email(email: str) -> User | None:
    row = select_one("profiles", filters={"email": f"eq.{email.strip()}"})
    return _row_to_user(row)


def fetch_users_by_profile(
    fitness_goal: str | None = None,
    experience_level: str | None = None,
    limit: int = 25,
) -> list[User]:
    if fitness_goal is None and experience_level is None:
        raise ValueError("Provide at least one of fitness_goal or experience_level.")

    filters: dict[str, str] = {}
    if fitness_goal is not None:
        filters["fitness_goal"] = f"ilike.{fitness_goal.strip()}"
    if experience_level is not None:
        filters["experience_level"] = f"ilike.{experience_level.strip()}"

    safe_limit = max(1, min(limit, 100))
    rows = select("profiles", filters=filters, limit=safe_limit, order="created_at.desc")
    return [_row_to_user(row) for row in rows if row]


def update_user_preferences(
    user_id: UserId,
    fitness_goal: str | None = None,
    experience_level: str | None = None,
    units: str | None = None,
    bodyweight: float | None = None,
    ai_enabled: bool | None = None,
    age: int | None = None,
    constraints: list[str] | None = None,
    personal_factors: dict | None = None,
) -> User | None:
    existing = fetch_user_by_id(user_id)
    if existing is None:
        return None

    profile_updates: dict[str, Any] = {}
    if fitness_goal is not None:
        profile_updates["fitness_goal"] = fitness_goal
    if experience_level is not None:
        profile_updates["experience_level"] = experience_level
    if units is not None:
        profile_updates["units"] = units
    if bodyweight is not None:
        profile_updates["bodyweight"] = bodyweight
    if age is not None:
        profile_updates["age"] = age

    prefs = _ai_prefs(select_one("profiles", filters={"id": f"eq.{user_id}"}) or {})
    if constraints is not None:
        prefs["constraints"] = constraints
    if personal_factors is not None:
        merged = merge_personal_factors(
            existing.personal_factors.model_dump(),
            personal_factors,
        )
        prefs["personal_factors"] = merged
    if constraints is not None or personal_factors is not None:
        profile_updates["ai_preferences"] = prefs

    if profile_updates:
        patch("profiles", {"id": f"eq.{user_id}"}, profile_updates)

    if ai_enabled is not None:
        upsert_consents(user_id, ai_coaching=ai_enabled)

    record_audit(user_id, "update_profile", "profiles", {"fields": list(profile_updates.keys())})
    return fetch_user_by_id(user_id)


def fetch_consents(user_id: UserId) -> ConsentRecord:
    row = select_one("user_consents", filters={"user_id": f"eq.{user_id}"})
    if row is None:
        return ConsentRecord(ai_coaching=False, analytics=False, notifications=False)
    return ConsentRecord.model_validate(
        {
            "ai_coaching": row.get("ai_coaching", False),
            "analytics": row.get("analytics", False),
            "notifications": row.get("notifications", False),
        }
    )


def upsert_consents(
    user_id: UserId,
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
    upsert(
        "user_consents",
        {
            "user_id": str(user_id),
            "ai_coaching": record.ai_coaching,
            "analytics": record.analytics,
            "notifications": record.notifications,
        },
        on_conflict="user_id",
    )
    record_audit(user_id, "update_consent", "user_consents", record.model_dump())
    return record


def fetch_active_goals(user_id: UserId) -> list[Goal]:
    rows = select(
        "goals",
        filters={"user_id": f"eq.{user_id}", "completed": "eq.false"},
        order="created_at.asc",
    )
    return [
        Goal(
            id=str(row.get("client_id") or row["id"]),
            user_id=str(user_id),
            title=row["title"],
            target=row.get("target"),
            completed=row.get("completed", False),
        )
        for row in rows
    ]


def create_goal(user_id: UserId, title: str, target: str | None = None) -> Goal:
    rows = insert(
        "goals",
        {
            "user_id": str(user_id),
            "title": title.strip(),
            "target": target,
            "completed": False,
        },
    )
    row = rows[0]
    goal = Goal(
        id=str(row.get("client_id") or row["id"]),
        user_id=str(user_id),
        title=row["title"],
        target=row.get("target"),
        completed=False,
    )
    record_audit(user_id, "create_goal", "goals", goal.model_dump())
    return goal


def complete_goal(user_id: UserId, goal_id: str | int) -> Goal | None:
    gid = str(goal_id)
    rows = patch(
        "goals",
        {"user_id": f"eq.{user_id}", "id": f"eq.{gid}"},
        {"completed": True},
    )
    if not rows:
        rows = patch(
            "goals",
            {"user_id": f"eq.{user_id}", "client_id": f"eq.{gid}"},
            {"completed": True},
        )
    if not rows:
        return None
    row = rows[0]
    goal = Goal(
        id=str(row.get("client_id") or row["id"]),
        user_id=str(user_id),
        title=row["title"],
        target=row.get("target"),
        completed=True,
    )
    record_audit(user_id, "complete_goal", "goals", {"goal_id": gid})
    return goal


def build_goal_contract(user_id: UserId) -> GoalContract | None:
    user = fetch_user_by_id(user_id)
    if user is None:
        return None
    ctx = build_personalization_context(user, None)
    return GoalContract(
        primary_goal=user.fitness_goal,
        experience_level=user.experience_level,
        active_goals=fetch_active_goals(user_id),
        constraints=user.constraints,
        units=user.units,
        age=user.age,
        personal_factors=user.personal_factors,
        coaching_directives=ctx["coaching_directives"],
    )


def fetch_personalization_context(user_id: UserId) -> dict | None:
    user = fetch_user_by_id(user_id)
    if user is None:
        return None
    contract = build_goal_contract(user_id)
    return build_personalization_context(user, contract)


def fetch_workout_sessions(user_id: UserId, limit: int = 20) -> list[WorkoutSessionSummary]:
    safe_limit = max(1, min(limit, 50))
    rows = select(
        "workout_sessions",
        filters={"user_id": f"eq.{user_id}"},
        order="created_at.desc",
        limit=safe_limit,
        select_cols="id,client_id,user_id,split,duration,notes,started_at,created_at",
    )
    summaries: list[WorkoutSessionSummary] = []
    for row in rows:
        session_id = str(row.get("client_id") or row["id"])
        detail = fetch_workout_session_detail(user_id, session_id)
        exercise_count = len(detail.exercises) if detail else 0
        summaries.append(
            WorkoutSessionSummary(
                id=session_id,
                user_id=str(user_id),
                split=row.get("split") or "Upper",
                duration=int(row.get("duration") or 0),
                notes=row.get("notes") or "",
                started_at=_iso(row.get("started_at")),
                created_at=_iso(row.get("created_at")),
                exercise_count=exercise_count,
            )
        )
    return summaries


def fetch_workout_session_detail(user_id: UserId, session_id: str | int) -> WorkoutSessionDetail | None:
    sid = str(session_id)
    row = select_one(
        "workout_sessions",
        filters={"user_id": f"eq.{user_id}", "id": f"eq.{sid}"},
    )
    if row is None:
        row = select_one(
            "workout_sessions",
            filters={"user_id": f"eq.{user_id}", "client_id": f"eq.{sid}"},
        )
    if row is None:
        return None

    db_session_id = row["id"]
    entry_rows = select(
        "exercise_entries",
        filters={"session_id": f"eq.{db_session_id}"},
        order="sort_order.asc",
    )
    exercises: list[ExerciseEntryDetail] = []
    for entry in entry_rows:
        set_rows = select(
            "sets",
            filters={"exercise_entry_id": f"eq.{entry['id']}"},
            order="sort_order.asc",
        )
        exercises.append(
            ExerciseEntryDetail(
                id=str(entry["id"]),
                exercise_name=entry["exercise_name"],
                muscle_group=entry.get("muscle_group"),
                sets=[
                    SetRecord(
                        reps=int(s.get("reps") or 0),
                        weight=float(s.get("weight") or 0),
                        sort_order=int(s.get("sort_order") or 0),
                    )
                    for s in set_rows
                ],
            )
        )

    summary = WorkoutSessionSummary(
        id=str(row.get("client_id") or row["id"]),
        user_id=str(user_id),
        split=row.get("split") or "Upper",
        duration=int(row.get("duration") or 0),
        notes=row.get("notes") or "",
        started_at=_iso(row.get("started_at")),
        created_at=_iso(row.get("created_at")),
        exercise_count=len(exercises),
    )
    return WorkoutSessionDetail(session=summary, exercises=exercises)


def create_workout_session(
    user_id: UserId,
    split: str,
    notes: str = "",
    duration: int = 0,
) -> WorkoutSessionSummary:
    rows = insert(
        "workout_sessions",
        {
            "user_id": str(user_id),
            "split": split.strip(),
            "notes": notes,
            "duration": duration,
            "started_at": datetime.utcnow().isoformat() + "Z",
        },
    )
    row = rows[0]
    summary = WorkoutSessionSummary(
        id=str(row.get("client_id") or row["id"]),
        user_id=str(user_id),
        split=row.get("split") or split,
        duration=int(row.get("duration") or 0),
        notes=row.get("notes") or "",
        started_at=_iso(row.get("started_at")),
        created_at=_iso(row.get("created_at")),
        exercise_count=0,
    )
    record_audit(user_id, "create_workout_session", "workout_sessions", summary.model_dump())
    return summary


def log_exercise_sets(
    user_id: UserId,
    session_id: str | int,
    exercise_name: str,
    sets: list[dict[str, Any]],
    muscle_group: str | None = None,
) -> ExerciseEntryDetail | None:
    sid = str(session_id)
    session = select_one(
        "workout_sessions",
        filters={"user_id": f"eq.{user_id}", "id": f"eq.{sid}"},
    )
    if session is None:
        session = select_one(
            "workout_sessions",
            filters={"user_id": f"eq.{user_id}", "client_id": f"eq.{sid}"},
        )
    if session is None:
        return None

    entry_rows = insert(
        "exercise_entries",
        {
            "session_id": session["id"],
            "exercise_name": exercise_name.strip(),
            "muscle_group": muscle_group,
            "sort_order": 0,
        },
    )
    entry = entry_rows[0]
    set_records: list[SetRecord] = []
    for idx, item in enumerate(sets):
        reps = int(item.get("reps", 0))
        weight = float(item.get("weight", 0))
        insert(
            "sets",
            {
                "exercise_entry_id": entry["id"],
                "reps": reps,
                "weight": weight,
                "sort_order": idx,
            },
        )
        set_records.append(SetRecord(reps=reps, weight=weight, sort_order=idx))

    record_audit(
        user_id,
        "log_exercise_sets",
        "exercise_entries",
        {"session_id": sid, "exercise": exercise_name, "set_count": len(sets)},
    )
    return ExerciseEntryDetail(
        id=str(entry["id"]),
        exercise_name=exercise_name.strip(),
        muscle_group=muscle_group,
        sets=set_records,
    )


def fetch_audit_log(user_id: UserId, limit: int = 50) -> list[AuditEntry]:
    safe_limit = max(1, min(limit, 100))
    rows = select(
        "mcp_audit_log",
        filters={"user_id": f"eq.{user_id}"},
        order="created_at.desc",
        limit=safe_limit,
    )
    return [
        AuditEntry(
            id=str(row["id"]),
            action=row["action"],
            resource=row.get("resource"),
            payload=row.get("payload") or {},
            created_at=_iso(row.get("created_at")),
        )
        for row in rows
    ]


def fetch_chat_history(user_id: UserId, limit: int = 50) -> list[dict[str, Any]]:
    safe_limit = max(1, min(limit, 200))
    rows = select(
        "ai_chat_history",
        filters={"user_id": f"eq.{user_id}"},
        order="created_at.desc",
        limit=safe_limit,
        select_cols="id,role,message,created_at",
    )
    out = []
    for row in reversed(rows):
        out.append(
            {
                "id": str(row["id"]),
                "role": row["role"],
                "message": row["message"],
                "created_at": _iso(row.get("created_at")),
            }
        )
    return out


def append_chat_message(user_id: UserId, role: str, message: str) -> dict[str, Any]:
    rows = insert(
        "ai_chat_history",
        {"user_id": str(user_id), "role": role, "message": message},
    )
    row = rows[0]
    record_audit(user_id, "append_chat_message", "ai_chat_history", {"role": role})
    return {
        "id": str(row["id"]),
        "role": row["role"],
        "message": row["message"],
        "created_at": _iso(row.get("created_at")),
    }


def record_guardian_check(
    user_id: UserId,
    check_type: str,
    drift_score: int,
    aligned: bool,
    coach_excerpt: str | None = None,
    payload: dict | None = None,
) -> dict[str, Any]:
    rows = insert(
        "guardian_checks",
        {
            "user_id": str(user_id),
            "check_type": check_type,
            "drift_score": int(drift_score),
            "aligned": bool(aligned),
            "coach_excerpt": coach_excerpt,
            "payload": payload or {},
        },
    )
    row = rows[0]
    return {
        "id": str(row["id"]),
        "check_type": row["check_type"],
        "drift_score": row.get("drift_score"),
        "aligned": row.get("aligned"),
        "coach_excerpt": row.get("coach_excerpt"),
        "created_at": _iso(row.get("created_at")),
    }


def fetch_guardian_history(user_id: UserId, limit: int = 25) -> list[dict[str, Any]]:
    safe_limit = max(1, min(limit, 100))
    rows = select(
        "guardian_checks",
        filters={"user_id": f"eq.{user_id}"},
        order="created_at.desc",
        limit=safe_limit,
    )
    return [
        {
            "id": str(row["id"]),
            "check_type": row.get("check_type"),
            "drift_score": row.get("drift_score"),
            "aligned": row.get("aligned"),
            "coach_excerpt": row.get("coach_excerpt"),
            "payload": row.get("payload") or {},
            "created_at": _iso(row.get("created_at")),
        }
        for row in rows
    ]


def export_user_data(user_id: UserId) -> dict[str, Any]:
    user = fetch_user_by_id(user_id)
    sessions = fetch_workout_sessions(user_id, limit=50)
    return {
        "exported_at": datetime.utcnow().isoformat() + "Z",
        "profile": user.model_dump() if user else None,
        "goals": [g.model_dump() for g in fetch_active_goals(user_id)],
        "workout_sessions": [s.model_dump() for s in sessions],
        "ai_chat_history": fetch_chat_history(user_id, limit=200),
        "guardian_checks": fetch_guardian_history(user_id, limit=100),
        "consents": fetch_consents(user_id).model_dump(),
        "audit_log": [a.model_dump() for a in fetch_audit_log(user_id, limit=100)],
    }


def request_account_deletion(user_id: UserId) -> dict[str, Any]:
    rows = insert("account_deletion_requests", {"user_id": str(user_id)})
    row = rows[0]
    record_audit(user_id, "request_account_deletion", "account_deletion_requests", {})
    return {
        "id": str(row["id"]),
        "user_id": str(row["user_id"]),
        "requested_at": _iso(row.get("requested_at")),
        "scheduled_purge_at": _iso(row.get("scheduled_purge_at")),
        "status": row.get("status", "pending"),
    }

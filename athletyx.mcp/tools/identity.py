"""Identity, consent, and profile MCP tools."""

from __future__ import annotations

from auth import get_authenticated_user_id, require_admin, require_self_or_admin
from db import (
    fetch_consents,
    fetch_user_by_email,
    fetch_user_by_id,
    fetch_users_by_profile,
    update_user_preferences,
    upsert_consents,
)
from models import UserListResult, UserQueryResult
from tools.helpers import fail, ok, safe_execute


def register(mcp) -> None:
    @mcp.tool()
    def update_personal_factors(
        age: int | None = None,
        max_effort_level: str | None = None,
        injury_history: list[str] | None = None,
        movement_restrictions: list[str] | None = None,
        recovery_capacity: str | None = None,
        medical_clearance: bool | None = None,
        notes: str | None = None,
    ) -> dict:
        """
        Update age and personal injury/effort profile for safe personalized coaching.
        max_effort_level: conservative | moderate | aggressive
        recovery_capacity: slow | average | fast
        """

        def _run():
            user_id = get_authenticated_user_id()
            updates: dict = {}
            if max_effort_level is not None:
                updates["max_effort_level"] = max_effort_level
            if injury_history is not None:
                updates["injury_history"] = injury_history
            if movement_restrictions is not None:
                updates["movement_restrictions"] = movement_restrictions
            if recovery_capacity is not None:
                updates["recovery_capacity"] = recovery_capacity
            if medical_clearance is not None:
                updates["medical_clearance"] = medical_clearance
            if notes is not None:
                updates["notes"] = notes

            user = update_user_preferences(
                user_id,
                age=age,
                personal_factors=updates if updates else None,
            )
            if user is None:
                return fail("Personal factors update failed.")
            return ok(user.model_dump(), "Personal factors updated.")

        return safe_execute(_run)

    @mcp.tool()
    def get_current_user_profile() -> dict:
        """Return the authenticated user's fitness profile (requires ATHLETYX_USER_ID)."""

        def _run():
            user_id = get_authenticated_user_id()
            user = fetch_user_by_id(user_id)
            if user is None:
                return fail(f"No user found with id={user_id}.")
            return ok(user.model_dump())

        return safe_execute(_run)

    @mcp.tool()
    def update_profile_preferences(
        fitness_goal: str | None = None,
        experience_level: str | None = None,
        units: str | None = None,
        bodyweight: float | None = None,
        ai_enabled: bool | None = None,
        age: int | None = None,
        constraints: list[str] | None = None,
    ) -> dict:
        """Update profile fields for the authenticated user. Audited."""

        def _run():
            user_id = get_authenticated_user_id()
            user = update_user_preferences(
                user_id,
                fitness_goal=fitness_goal,
                experience_level=experience_level,
                units=units,
                bodyweight=bodyweight,
                ai_enabled=ai_enabled,
                age=age,
                constraints=constraints,
            )
            if user is None:
                return fail("Profile update failed.")
            return ok(user.model_dump(), "Profile updated.")

        return safe_execute(_run)

    @mcp.tool()
    def get_consent_status() -> dict:
        """Return AI, analytics, and notification consent for the authenticated user."""

        def _run():
            user_id = get_authenticated_user_id()
            return ok(fetch_consents(user_id).model_dump())

        return safe_execute(_run)

    @mcp.tool()
    def update_consent(
        ai_coaching: bool | None = None,
        analytics: bool | None = None,
        notifications: bool | None = None,
    ) -> dict:
        """Update granular consent flags. Audited."""

        def _run():
            user_id = get_authenticated_user_id()
            record = upsert_consents(
                user_id,
                ai_coaching=ai_coaching,
                analytics=analytics,
                notifications=notifications,
            )
            return ok(record.model_dump(), "Consent updated.")

        return safe_execute(_run)

    @mcp.tool()
    def get_data_inventory() -> dict:
        """List data categories collected (mirrors App Store privacy label)."""
        return ok(
            {
                "categories": [
                    {"name": "Contact Info", "fields": ["email", "name"], "purpose": "Account"},
                    {
                        "name": "Health & Fitness",
                        "fields": [
                            "workouts",
                            "bodyweight",
                            "goals",
                            "age",
                            "injury_history",
                            "movement_restrictions",
                            "max_effort_level",
                        ],
                        "purpose": "Core app + safe personalization",
                    },
                    {
                        "name": "User Content",
                        "fields": ["workout notes", "chat history"],
                        "purpose": "AI coaching",
                    },
                    {"name": "Identifiers", "fields": ["user_id"], "purpose": "Authentication"},
                ],
                "linked_to_identity": True,
                "used_for_tracking": False,
            }
        )

    @mcp.tool()
    def get_user_by_id(user_id: int) -> dict:
        """Lookup user by ID. Self or admin only."""

        def _run():
            require_self_or_admin(user_id)
            user = fetch_user_by_id(user_id)
            if user is None:
                return UserQueryResult(found=False, message=f"No user id={user_id}.").model_dump()
            return UserQueryResult(found=True, user=user).model_dump()

        return safe_execute(_run)

    @mcp.tool()
    def get_user_by_email(email: str) -> dict:
        """Lookup user by email. Self or admin only."""

        def _run():
            user = fetch_user_by_email(email.strip())
            if user is None:
                return UserQueryResult(found=False, message="No user found.").model_dump()
            require_self_or_admin(user.id)
            return UserQueryResult(found=True, user=user).model_dump()

        return safe_execute(_run)

    @mcp.tool()
    def search_users_by_profile(
        fitness_goal: str | None = None,
        experience_level: str | None = None,
        limit: int = 25,
    ) -> dict:
        """Search users by profile. Admin only (app-store cross-user protection)."""

        def _run():
            require_admin()
            if fitness_goal is None and experience_level is None:
                return UserListResult(
                    count=0, users=[], message="Provide fitness_goal and/or experience_level."
                ).model_dump()
            users = fetch_users_by_profile(fitness_goal, experience_level, limit)
            return UserListResult(count=len(users), users=users).model_dump()

        return safe_execute(_run)

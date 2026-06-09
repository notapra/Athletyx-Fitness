"""Build user personalization context for coaching, search, and document ranking."""

from __future__ import annotations

from models import Goal, GoalContract, PersonalFactors, User


def default_personal_factors() -> dict:
    return PersonalFactors().model_dump()


def merge_personal_factors(existing: dict | None, updates: dict) -> dict:
    base = PersonalFactors.model_validate(existing or {}).model_dump()
    for key, value in updates.items():
        if value is not None:
            base[key] = value
    return PersonalFactors.model_validate(base).model_dump()


def build_personalization_context_from_profile(
    profile: dict,
    goals: list[dict] | None = None,
) -> dict:
    """IronLog local profile → same context bundle as MCP (no Postgres required)."""
    ai_prefs = profile.get("ai_preferences") or {}
    factors = PersonalFactors.model_validate(ai_prefs.get("personal_factors") or {})
    constraints = ai_prefs.get("constraints") or []

    user = User(
        id=0,
        name=profile.get("username") or "Athlete",
        email="local@ironlog",
        fitness_goal=profile.get("fitness_goal") or "general fitness",
        experience_level=profile.get("experience_level") or "intermediate",
        units=profile.get("units") or "lbs",
        bodyweight=profile.get("bodyweight"),
        age=profile.get("age"),
        constraints=constraints,
        personal_factors=factors,
    )

    active_goals = [
        Goal(
            id=i,
            user_id=0,
            title=g.get("title", ""),
            target=g.get("target"),
            completed=bool(g.get("completed")),
        )
        for i, g in enumerate(goals or [])
        if not g.get("completed")
    ]

    contract = GoalContract(
        primary_goal=user.fitness_goal,
        experience_level=user.experience_level,
        active_goals=active_goals,
        constraints=constraints,
        units=user.units,
        age=user.age,
        personal_factors=factors,
        coaching_directives=[],
    )
    return build_personalization_context(user, contract)


def build_personalization_context(user: User, contract: GoalContract | None) -> dict:
    """Full context bundle for agents, search, and document ranking."""
    factors = user.personal_factors
    contract_data = contract.model_dump() if contract else None
    effort = factors.max_effort_level
    return {
        "user_id": user.id,
        "name": user.name,
        "age": user.age,
        "fitness_goal": user.fitness_goal,
        "experience_level": user.experience_level,
        "units": user.units,
        "bodyweight": user.bodyweight,
        "constraints": user.constraints,
        "personal_factors": factors.model_dump(),
        "goal_contract": contract_data,
        "coaching_directives": _coaching_directives(user, factors, contract),
        "search_context": _search_context(user, factors),
    }


def _coaching_directives(
    user: User, factors: PersonalFactors, contract: GoalContract | None
) -> list[str]:
    directives: list[str] = []
    if user.age is not None:
        if user.age >= 50:
            directives.append("Prioritize joint-friendly progressions and longer warm-ups.")
        elif user.age < 18:
            directives.append("Use conservative loading; emphasize technique over max effort.")

    effort_map = {
        "conservative": "Keep intensity at RPE 6–7; avoid training to failure.",
        "moderate": "Target RPE 7–8; limit failure sets to accessories.",
        "aggressive": "RPE 8–9 allowed on main lifts when form is solid.",
    }
    directives.append(effort_map.get(factors.max_effort_level, effort_map["moderate"]))

    if factors.injury_history:
        directives.append(
            "Respect injury history: "
            + "; ".join(factors.injury_history)
            + ". Modify or substitute aggravating movements."
        )
    if factors.movement_restrictions:
        directives.append(
            "Never prescribe: " + "; ".join(factors.movement_restrictions) + "."
        )
    if not factors.medical_clearance:
        directives.append(
            "User has NOT confirmed medical clearance — recommend physician consult before intense training."
        )
    if factors.notes.strip():
        directives.append(f"User notes: {factors.notes.strip()}")

    recovery_map = {
        "slow": "Allow 72+ hours before retraining the same muscle group hard.",
        "average": "Standard 48-hour recovery between hard sessions for same pattern.",
        "fast": "Can tolerate 24–36 hour turnaround on non-overlapping splits.",
    }
    directives.append(recovery_map.get(factors.recovery_capacity, recovery_map["average"]))

    if contract and contract.constraints:
        directives.append("Profile constraints: " + "; ".join(contract.constraints))
    elif user.constraints:
        directives.append("Profile constraints: " + "; ".join(user.constraints))

    return directives


def _search_context(user: User, factors: PersonalFactors) -> str:
    """Compact string appended to web/doc searches for personalization."""
    parts = [
        f"goal={user.fitness_goal}",
        f"experience={user.experience_level}",
    ]
    if user.age is not None:
        parts.append(f"age={user.age}")
    parts.append(f"max_effort={factors.max_effort_level}")
    if factors.injury_history:
        parts.append("injuries=" + ", ".join(factors.injury_history))
    if factors.movement_restrictions:
        parts.append("avoid=" + ", ".join(factors.movement_restrictions))
    if user.constraints:
        parts.append("constraints=" + ", ".join(user.constraints))
    return " | ".join(parts)

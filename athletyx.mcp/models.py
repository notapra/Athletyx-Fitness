"""Pydantic models for validated MCP tool responses."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class PersonalFactors(BaseModel):
    """Injury, effort, and recovery profile for safe personalized coaching."""

    model_config = ConfigDict(extra="forbid")

    max_effort_level: Literal["conservative", "moderate", "aggressive"] = "moderate"
    injury_history: list[str] = Field(default_factory=list)
    movement_restrictions: list[str] = Field(default_factory=list)
    recovery_capacity: Literal["slow", "average", "fast"] = "average"
    medical_clearance: bool = True
    notes: str = ""


class User(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    name: str
    email: str
    fitness_goal: str
    experience_level: str
    units: str = "lbs"
    bodyweight: float | None = None
    ai_enabled: bool = True
    age: int | None = None
    constraints: list[str] = Field(default_factory=list)
    personal_factors: PersonalFactors = Field(default_factory=PersonalFactors)


class UserQueryResult(BaseModel):
    found: bool
    user: User | None = None
    message: str | None = None


class UserListResult(BaseModel):
    count: int
    users: list[User]
    message: str | None = None


class Goal(BaseModel):
    id: int
    user_id: int
    title: str
    target: str | None = None
    completed: bool = False


class WorkoutSessionSummary(BaseModel):
    id: int
    user_id: int
    split: str
    duration: int
    notes: str
    started_at: str | None = None
    created_at: str | None = None
    exercise_count: int = 0


class SetRecord(BaseModel):
    reps: int
    weight: float
    sort_order: int = 0


class ExerciseEntryDetail(BaseModel):
    id: int
    exercise_name: str
    muscle_group: str | None = None
    sets: list[SetRecord] = Field(default_factory=list)


class WorkoutSessionDetail(BaseModel):
    session: WorkoutSessionSummary
    exercises: list[ExerciseEntryDetail] = Field(default_factory=list)


class ConsentRecord(BaseModel):
    ai_coaching: bool
    analytics: bool
    notifications: bool


class GoalContract(BaseModel):
    primary_goal: str
    experience_level: str
    active_goals: list[Goal]
    constraints: list[str]
    units: str
    age: int | None = None
    personal_factors: PersonalFactors = Field(default_factory=PersonalFactors)
    coaching_directives: list[str] = Field(default_factory=list)


class AuditEntry(BaseModel):
    id: int
    action: str
    resource: str | None = None
    payload: dict = Field(default_factory=dict)
    created_at: str | None = None


class ToolResult(BaseModel):
    success: bool
    data: dict | list | None = None
    message: str | None = None

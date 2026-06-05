"""Pydantic models for validated MCP tool responses."""

from pydantic import BaseModel, ConfigDict, Field


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

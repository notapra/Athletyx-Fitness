"""Pydantic models for validated user records returned by MCP tools."""

from pydantic import BaseModel, ConfigDict, Field


class User(BaseModel):
    """Fitness user profile row from the users table."""

    model_config = ConfigDict(extra="forbid")

    id: int = Field(..., description="Unique integer user identifier.")
    name: str = Field(..., description="Display name.")
    email: str = Field(..., description="Contact email address.")
    fitness_goal: str = Field(..., description="Primary fitness objective.")
    experience_level: str = Field(..., description="Training experience tier.")


class UserQueryResult(BaseModel):
    """Structured response envelope for single-user lookups."""

    found: bool
    user: User | None = None
    message: str | None = None


class UserListResult(BaseModel):
    """Structured response envelope for multi-user queries."""

    count: int
    users: list[User]
    message: str | None = None

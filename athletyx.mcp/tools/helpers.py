"""Shared helpers for MCP tool handlers."""

from __future__ import annotations

from auth import AuthError
from models import ToolResult


def ok(data: dict | list | None = None, message: str | None = None) -> dict:
    return ToolResult(success=True, data=data, message=message).model_dump()


def fail(message: str) -> dict:
    return ToolResult(success=False, message=message).model_dump()


def safe_execute(action):
    """Run a tool body and map AuthError / exceptions to ToolResult envelopes."""
    try:
        return action()
    except AuthError as exc:
        return fail(str(exc))
    except Exception as exc:
        return fail(f"Error: {exc}")

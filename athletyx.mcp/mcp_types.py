"""Shared types for Athletyx MCP (local int IDs vs Supabase UUIDs)."""

from __future__ import annotations

from typing import TypeAlias

UserId: TypeAlias = int | str
RecordId: TypeAlias = int | str

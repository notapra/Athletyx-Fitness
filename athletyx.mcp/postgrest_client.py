"""Supabase PostgREST client scoped to the authenticated user's JWT (RLS enforced)."""

from __future__ import annotations

import os
from typing import Any

import httpx

from auth import get_access_token


class PostgrestError(RuntimeError):
    pass


def _base_url() -> str:
    url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    if not url:
        raise PostgrestError("SUPABASE_URL is required for supabase DB backend")
    return f"{url}/rest/v1"


def _anon_key() -> str:
    key = os.getenv("SUPABASE_ANON_KEY", "").strip()
    if not key:
        raise PostgrestError("SUPABASE_ANON_KEY is required for supabase DB backend")
    return key


def _headers() -> dict[str, str]:
    token = get_access_token()
    return {
        "Authorization": f"Bearer {token}",
        "apikey": _anon_key(),
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def _request(
    method: str,
    table: str,
    *,
    params: dict[str, Any] | None = None,
    json_body: Any = None,
    prefer: str | None = None,
) -> Any:
    headers = _headers()
    if prefer:
        headers["Prefer"] = prefer

    with httpx.Client(timeout=30.0) as client:
        resp = client.request(
            method,
            f"{_base_url()}/{table}",
            params=params,
            json=json_body,
            headers=headers,
        )

    if resp.status_code >= 400:
        detail = resp.text[:500]
        raise PostgrestError(f"PostgREST {method} {table} failed ({resp.status_code}): {detail}")

    if resp.status_code == 204 or not resp.content:
        return None
    return resp.json()


def select(
    table: str,
    *,
    filters: dict[str, str] | None = None,
    select_cols: str = "*",
    order: str | None = None,
    limit: int | None = None,
) -> list[dict[str, Any]]:
    params: dict[str, Any] = {"select": select_cols}
    if filters:
        params.update(filters)
    if order:
        params["order"] = order
    if limit is not None:
        params["limit"] = str(limit)

    data = _request("GET", table, params=params)
    return data if isinstance(data, list) else []


def select_one(
    table: str,
    *,
    filters: dict[str, str],
    select_cols: str = "*",
) -> dict[str, Any] | None:
    rows = select(table, filters=filters, select_cols=select_cols, limit=1)
    return rows[0] if rows else None


def insert(table: str, row: dict[str, Any] | list[dict[str, Any]]) -> list[dict[str, Any]]:
    data = _request("POST", table, json_body=row, prefer="return=representation")
    if data is None:
        return []
    return data if isinstance(data, list) else [data]


def upsert(table: str, row: dict[str, Any], on_conflict: str) -> list[dict[str, Any]]:
    data = _request(
        "POST",
        table,
        json_body=row,
        prefer=f"return=representation,resolution=merge-duplicates",
        params={"on_conflict": on_conflict},
    )
    if data is None:
        return []
    return data if isinstance(data, list) else [data]


def patch(table: str, filters: dict[str, str], updates: dict[str, Any]) -> list[dict[str, Any]]:
    data = _request(
        "PATCH",
        table,
        params=filters,
        json_body=updates,
        prefer="return=representation",
    )
    if data is None:
        return []
    return data if isinstance(data, list) else [data]


def delete(table: str, filters: dict[str, str]) -> None:
    _request("DELETE", table, params=filters)

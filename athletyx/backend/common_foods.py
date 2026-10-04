"""Built-in common foods — per 100 g, no USDA API required."""

from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

from backend.nutrition_service import normalize_nutrients

_CATALOG_PATH = Path(__file__).resolve().parents[2] / "data" / "common-foods.json"
if not _CATALOG_PATH.is_file():
    _CATALOG_PATH = Path(__file__).resolve().parents[1] / "data" / "common-foods.json"


@lru_cache(maxsize=1)
def _load_catalog() -> list[dict[str, Any]]:
    raw = json.loads(_CATALOG_PATH.read_text(encoding="utf-8"))
    out = []
    for item in raw:
        out.append(
            {
                **item,
                "nutrients_per_100g": normalize_nutrients(item.get("nutrients_per_100g")),
            }
        )
    return out


def _tokenize(text: str) -> list[str]:
    return [t for t in re.split(r"[^a-z0-9]+", text.lower()) if t]


def _score_food(food: dict[str, Any], tokens: list[str]) -> int:
    haystack = " ".join([food["name"], *food.get("aliases", []), food.get("category", "")]).lower()
    words = _tokenize(haystack)
    score = 0
    for token in tokens:
        if haystack == token:
            score += 100
        if haystack.startswith(token):
            score += 40
        if token in words:
            score += 30
        if token in haystack:
            score += 15
    return score


def search_common_foods(query: str, limit: int = 12) -> list[dict[str, Any]]:
    q = query.strip()
    if not q:
        return []
    tokens = _tokenize(q)
    ranked = sorted(
        ((f, _score_food(f, tokens)) for f in _load_catalog()),
        key=lambda row: (-row[1], row[0]["name"]),
    )
    return [
        {
            "catalog_id": food["id"],
            "name": food["name"],
            "category": food.get("category"),
            "source": "builtin",
            "nutrients_per_100g": food["nutrients_per_100g"],
        }
        for food, score in ranked
        if score > 0
    ][:limit]


def get_common_food(catalog_id: str) -> dict[str, Any] | None:
    for food in _load_catalog():
        if food["id"] == catalog_id:
            return {
                "catalog_id": food["id"],
                "name": food["name"],
                "category": food.get("category"),
                "source": "builtin",
                "nutrients_per_100g": food["nutrients_per_100g"],
            }
    return None

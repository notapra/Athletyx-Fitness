"""USDA FoodData Central integration — normalize nutrients to per 100 g."""

from __future__ import annotations

import os
from typing import Any

import httpx

# USDA FoodData Central nutrient IDs → our canonical per-100g keys
USDA_NUTRIENT_MAP: dict[int, str] = {
    1008: "calories_kcal",
    1003: "protein_g",
    1005: "carbs_g",
    1004: "fat_g",
    1079: "fiber_g",
    2000: "sugar_g",
    1258: "saturated_fat_g",
    1093: "sodium_mg",
    1092: "potassium_mg",
    1087: "calcium_mg",
    1089: "iron_mg",
    1090: "magnesium_mg",
    1095: "zinc_mg",
    1106: "vitamin_a_mcg",
    1162: "vitamin_c_mg",
    1114: "vitamin_d_mcg",
    1178: "vitamin_b12_mcg",
    1177: "folate_mcg",
    1253: "cholesterol_mg",
}

NUTRIENT_KEYS = list(USDA_NUTRIENT_MAP.values())


def _empty_nutrients() -> dict[str, float]:
    return {k: 0.0 for k in NUTRIENT_KEYS}


def _api_key() -> str | None:
    return os.getenv("USDA_FDC_API_KEY", "").strip() or None


def _fdc_base() -> str:
    return os.getenv("USDA_FDC_API_URL", "https://api.nal.usda.gov/fdc/v1").rstrip("/")


def normalize_nutrients(raw: dict[str, Any] | None) -> dict[str, float]:
    base = _empty_nutrients()
    if not raw:
        return base
    for key in NUTRIENT_KEYS:
        val = raw.get(key)
        if val is None:
            continue
        try:
            num = float(val)
            if num >= 0:
                base[key] = num
        except (TypeError, ValueError):
            continue
    return base


def _extract_per_100g_from_food(food: dict[str, Any]) -> dict[str, float]:
    """Parse USDA food detail into per-100g nutrients."""
    out = _empty_nutrients()
    nutrients = food.get("foodNutrients") or []

    for item in nutrients:
        nutrient = item.get("nutrient") or {}
        nid = nutrient.get("id") or item.get("nutrientId")
        if nid is None:
            continue
        key = USDA_NUTRIENT_MAP.get(int(nid))
        if not key:
            continue
        amount = item.get("amount")
        if amount is None:
            amount = item.get("value")
        if amount is None:
            continue
        try:
            out[key] = float(amount)
        except (TypeError, ValueError):
            continue

    # Some branded foods report per serving — scale to 100g when possible
    serving = food.get("servingSize")
    unit = (food.get("servingSizeUnit") or "").lower()
    if serving and unit in ("g", "gram", "grams") and float(serving) > 0 and float(serving) != 100:
        factor = 100.0 / float(serving)
        for key in NUTRIENT_KEYS:
            out[key] *= factor

    return out


def food_from_usda_detail(food: dict[str, Any]) -> dict[str, Any]:
    desc = food.get("description") or food.get("lowercaseDescription") or "Unknown food"
    brand = food.get("brandOwner") or food.get("brandName") or ""
    return {
        "fdc_id": food.get("fdcId"),
        "name": desc.strip(),
        "brand": brand.strip(),
        "source": "usda",
        "nutrients_per_100g": _extract_per_100g_from_food(food),
    }


async def search_foods(query: str, page_size: int = 12) -> list[dict[str, Any]]:
    key = _api_key()
    if not key:
        return []

    params = {
        "api_key": key,
        "query": query.strip(),
        "pageSize": max(1, min(page_size, 25)),
        "dataType": ["Foundation", "SR Legacy", "Survey (FNDDS)", "Branded"],
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(f"{_fdc_base()}/foods/search", params=params)
        resp.raise_for_status()
        data = resp.json()

    results = []
    for item in data.get("foods") or []:
        results.append(
            {
                "fdc_id": item.get("fdcId"),
                "name": (item.get("description") or "").strip(),
                "brand": (item.get("brandOwner") or item.get("brandName") or "").strip(),
                "data_type": item.get("dataType"),
            }
        )
    return results


async def fetch_food_detail(fdc_id: int) -> dict[str, Any]:
    key = _api_key()
    if not key:
        raise RuntimeError("USDA_FDC_API_KEY not configured")

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"{_fdc_base()}/food/{int(fdc_id)}",
            params={"api_key": key},
        )
        resp.raise_for_status()
        return food_from_usda_detail(resp.json())


def scale_nutrients(nutrients_per_100g: dict[str, Any], grams: float) -> dict[str, float]:
    g = float(grams)
    if g <= 0:
        return _empty_nutrients()
    factor = g / 100.0
    src = normalize_nutrients(nutrients_per_100g)
    return {k: src[k] * factor for k in NUTRIENT_KEYS}


def sum_nutrients(items: list[dict[str, Any]]) -> dict[str, float]:
    total = _empty_nutrients()
    for item in items:
        n = normalize_nutrients(item)
        for key in NUTRIENT_KEYS:
            total[key] += n[key]
    return total

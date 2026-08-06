"""Tests for nutrition scaling and USDA nutrient normalization."""

from backend.nutrition_service import (
    normalize_nutrients,
    scale_nutrients,
    sum_nutrients,
    _extract_per_100g_from_food,
)


def test_scale_nutrients_linear_by_grams():
    per100 = {
        "calories_kcal": 200,
        "protein_g": 25,
        "carbs_g": 0,
        "fat_g": 10,
    }
    scaled = scale_nutrients(per100, 150)
    assert scaled["calories_kcal"] == 300
    assert scaled["protein_g"] == 37.5
    assert scaled["fat_g"] == 15


def test_sum_nutrients():
    a = {"calories_kcal": 100, "protein_g": 10, "carbs_g": 5, "fat_g": 2}
    b = {"calories_kcal": 50, "protein_g": 5, "carbs_g": 1, "fat_g": 1}
    total = sum_nutrients([a, b])
    assert total["calories_kcal"] == 150
    assert total["protein_g"] == 15


def test_extract_per_100g_from_usda_payload():
    food = {
        "foodNutrients": [
            {"nutrient": {"id": 1008}, "amount": 165},
            {"nutrient": {"id": 1003}, "amount": 31},
        ]
    }
    out = _extract_per_100g_from_food(food)
    assert out["calories_kcal"] == 165
    assert out["protein_g"] == 31


def test_normalize_clamps_invalid():
    out = normalize_nutrients({"protein_g": -5, "carbs_g": "12.5"})
    assert out["protein_g"] == 0
    assert out["carbs_g"] == 12.5

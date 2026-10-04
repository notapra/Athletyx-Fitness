"""Tests for built-in common food catalog."""

from backend.common_foods import get_common_food, search_common_foods
from backend.nutrition_service import scale_nutrients


def test_search_chicken_breast():
    results = search_common_foods("chicken breast")
    assert results
    assert results[0]["catalog_id"] == "chicken_breast_cooked"
    assert results[0]["nutrients_per_100g"]["protein_g"] == 31


def test_search_rice_cakes():
    results = search_common_foods("rice cakes")
    assert any(r["catalog_id"] == "rice_cakes_plain" for r in results)


def test_search_ground_beef():
    results = search_common_foods("ground beef")
    assert len(results) >= 2


def test_get_common_food_scaling():
    food = get_common_food("chicken_breast_cooked")
    assert food is not None
    scaled = scale_nutrients(food["nutrients_per_100g"], 200)
    assert scaled["protein_g"] == 62
    assert scaled["calories_kcal"] == 330

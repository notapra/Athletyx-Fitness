import os
import tempfile

# Isolated cache dir per test module
_tmp = tempfile.mkdtemp()
os.environ["COACH_CACHE_DIR"] = _tmp

from backend.query_cache import (
    get_cached_response,
    make_cache_key,
    save_cached_response,
    get_cache_stats,
    _normalize_query,
)


def test_normalize_query_collapses_whitespace():
    assert _normalize_query("  How   much  protein?  ") == "how much protein?"


def test_cache_hit_avoids_second_save():
    profile = {"fitness_goal": "strength", "experience_level": "intermediate", "units": "lbs"}
    goals = []
    message = "How much protein per day?"
    response = {
        "content": "About 0.8g per lb.",
        "search_trace": {"web_search_used": False},
    }

    save_cached_response(message, profile, goals, response)
    cached, meta = get_cached_response(message, profile, goals)

    assert cached is not None
    assert meta["cache_hit"] is True
    assert cached["content"] == "About 0.8g per lb."
    assert cached["from_cache"] is True


def test_different_profile_misses_cache():
    profile_a = {"fitness_goal": "strength", "units": "lbs"}
    profile_b = {"fitness_goal": "cut", "units": "lbs"}
    message = "What should I eat?"
    save_cached_response(message, profile_a, [], {"content": "Eat protein.", "search_trace": {}})

    cached, meta = get_cached_response(message, profile_b, [])
    assert cached is None
    assert meta["cache_hit"] is False


def test_injury_history_affects_cache_key():
    base = {"fitness_goal": "strength", "units": "lbs"}
    with_injury = {
        "fitness_goal": "strength",
        "units": "lbs",
        "ai_preferences": {"personal_factors": {"injury_history": ["shoulder impingement"]}},
    }
    k1 = make_cache_key("test", base, [])
    k2 = make_cache_key("test", with_injury, [])
    assert k1 != k2


def test_make_cache_key_stable():
    k1 = make_cache_key("Hello", {"fitness_goal": "x"}, [])
    k2 = make_cache_key("  hello  ", {"fitness_goal": "x"}, [])
    assert k1 == k2

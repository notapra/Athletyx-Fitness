"""Unit tests for Phase 2 analytics / guardian heuristics."""

from analytics_logic import (
    compute_muscle_heat_map,
    compute_personal_records,
    compute_training_analytics,
    score_goal_alignment,
)


def _detail(name: str, weight: float, reps: int = 5):
    return {
        "session": {"id": "1", "created_at": "2026-07-01T00:00:00Z"},
        "exercises": [
            {
                "exercise_name": name,
                "sets": [{"weight": weight, "reps": reps}],
            }
        ],
    }


def test_training_analytics_volume():
    details = [_detail("Bench Press", 100, 5), _detail("Squat", 140, 5)]
    stats = compute_training_analytics(details)
    assert stats["total_workouts"] == 2
    assert stats["total_sets"] == 2
    assert stats["total_volume"] == 100 * 5 + 140 * 5


def test_personal_records_picks_max_weight():
    details = [_detail("Bench Press", 100), _detail("Bench Press", 135), _detail("Squat", 200)]
    prs = compute_personal_records(details)
    by_name = {p["exercise"]: p["weight"] for p in prs}
    assert by_name["Bench Press"] == 135
    assert by_name["Squat"] == 200


def test_muscle_heat_map_groups_known_exercises():
    details = [_detail("Bench Press", 100), _detail("Squat", 140)]
    heat = compute_muscle_heat_map(details)
    assert heat["total_sets"] == 2
    assert "Chest" in heat["set_counts_by_muscle"] or "Other" in heat["set_counts_by_muscle"]


def test_guardian_scores_off_topic_higher():
    aligned = score_goal_alignment({"primary_goal": "strength"}, "bench press workout sets")
    drifted = score_goal_alignment(
        {"primary_goal": "strength"},
        "tell me about politics and celebrity news please",
    )
    assert aligned["aligned"] is True
    assert drifted["drift_score"] > aligned["drift_score"]

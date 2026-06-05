"""Deterministic workout generation and log parsing (no LLM)."""

from __future__ import annotations

import re

_MOCK_ROUTINES: dict[str, dict[str, str]] = {
    "hypertrophy": {
        "push": "## Hypertrophy · Push\n\n- Barbell bench 4×8–10\n- Incline DB 3×10–12\n- OHP 3×8–10\n- Lateral raise 3×15",
        "pull": "## Hypertrophy · Pull\n\n- Pull-up 4×8–10\n- Barbell row 4×8–10\n- Face pull 3×15",
        "legs": "## Hypertrophy · Legs\n\n- Squat 4×8–10\n- RDL 3×10\n- Leg curl 3×12",
    },
    "strength": {
        "push": "## Strength · Push\n\n- Bench 5×5 @ RPE 8\n- Close-grip bench 3×6",
        "pull": "## Strength · Pull\n\n- Deadlift 5×3\n- Row 4×6",
        "legs": "## Strength · Legs\n\n- Squat 5×5\n- Leg press 3×8",
    },
}

_ALIASES = {
    "bench": "Bench Press",
    "squat": "Squat",
    "deadlift": "Deadlift",
    "ohp": "Overhead Press",
    "row": "Barbell Row",
}

_WEIGHT_RE = re.compile(r"(?:@|at|for|\s)(\d{2,4}(?:\.\d+)?)\s*(?:lbs?|lb|kg)?", re.I)
_SET_RE = re.compile(r"(\d+)\s*[x×]\s*(\d+)", re.I)


def generate_workout_routine(goal: str, split: str) -> str:
    goal_key = goal.strip().lower()
    split_key = split.strip().lower()
    routines = _MOCK_ROUTINES.get(goal_key) or _MOCK_ROUTINES["hypertrophy"]
    return routines.get(split_key) or routines.get("push", "No routine found.")


def parse_raw_workout_log(raw_text: str) -> dict:
    text = raw_text.strip()
    exercise = "Unknown Exercise"
    lower = text.lower()
    for alias, name in sorted(_ALIASES.items(), key=lambda x: -len(x[0])):
        if alias in lower:
            exercise = name
            break

    weight = None
    match = _WEIGHT_RE.search(text)
    if match:
        weight = float(match.group(1))

    sets: list[dict[str, int | float]] = []
    for m in _SET_RE.finditer(text):
        sets.append({"reps": int(m.group(2)), "weight": weight or 0})

    if not sets and weight:
        sets.append({"reps": 0, "weight": weight})

    volume = sum(s["reps"] * float(s["weight"]) for s in sets if s["weight"])
    return {
        "exercise": exercise,
        "weight": weight,
        "sets": sets,
        "volume": volume,
        "confirmation": (
            f"Logged {exercise}"
            + (f" @ {weight}" if weight else "")
            + (f" — {len(sets)} set(s)" if sets else "")
        ),
    }

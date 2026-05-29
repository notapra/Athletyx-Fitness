MOCK_ROUTINES = {
    "hypertrophy": {
        "push": """## Hypertrophy · Push

**Warm-up** (8 min)
- Band pull-aparts × 15
- Incline DB press 2×12 @ RPE 6

**Main**
| Exercise | Sets × Reps | Rest |
|----------|-------------|------|
| Barbell bench press | 4×8–10 | 2 min |
| Incline DB press | 3×10–12 | 90s |
| Cable fly | 3×12–15 | 60s |
| Overhead press | 3×8–10 | 2 min |

**Accessories**
- Lateral raise 3×15–20
- Tricep pushdown 3×12–15

**Notes:** Stop 1–2 reps shy of failure on compounds. Aim for progressive overload weekly.""",
        "pull": """## Hypertrophy · Pull

**Warm-up** (8 min)
- Dead hang 2×30s
- Light lat pulldown 2×12

**Main**
| Exercise | Sets × Reps | Rest |
|----------|-------------|------|
| Weighted pull-up / lat pulldown | 4×8–10 | 2 min |
| Barbell row | 4×8–10 | 2 min |
| Chest-supported row | 3×10–12 | 90s |
| Face pull | 3×15–20 | 60s |

**Accessories**
- Rear-delt fly 3×15
- Incline DB curl 3×12–15

**Notes:** Control the eccentric. Squeeze lats at the bottom of each row.""",
        "legs": """## Hypertrophy · Legs

**Warm-up** (10 min)
- Bike 5 min
- Goblet squat 2×12
- Leg curl 2×12

**Main**
| Exercise | Sets × Reps | Rest |
|----------|-------------|------|
| Back squat | 4×8–10 | 3 min |
| Romanian deadlift | 3×10–12 | 2 min |
| Leg press | 3×12–15 | 90s |
| Walking lunge | 3×10/leg | 90s |

**Accessories**
- Leg extension 3×15
- Seated calf raise 4×15–20

**Notes:** Full ROM on squats. Keep RDL hinge crisp — feel hamstrings stretch.""",
    },
    "strength": {
        "push": """## Strength · Push

**Warm-up**
- Empty bar × 10, then ramp to working weight

**Main**
| Exercise | Sets × Reps | % / RPE |
|----------|-------------|---------|
| Bench press | 5×3 | ~85% 1RM |
| Close-grip bench | 3×5 | RPE 8 |
| Overhead press | 4×4 | RPE 8 |

**Accessories** (optional, 2 sets each)
- Dips 2×6–8
- Lateral raise 2×12

**Notes:** Long rest (3–4 min) on bench. Add 2.5–5 lb when all sets move cleanly.""",
        "pull": """## Strength · Pull

**Warm-up**
- Rowing 5 min, progressive deadlift sets

**Main**
| Exercise | Sets × Reps | % / RPE |
|----------|-------------|---------|
| Deadlift | 5×3 | ~85% 1RM |
| Barbell row | 4×5 | RPE 8 |
| Weighted pull-up | 3×5 | RPE 8 |

**Accessories**
- Face pull 2×15

**Notes:** Brace hard on deadlifts. Reset each rep if form breaks.""",
        "legs": """## Strength · Legs

**Warm-up**
- Squat ramp sets to opener

**Main**
| Exercise | Sets × Reps | % / RPE |
|----------|-------------|---------|
| Back squat | 5×3 | ~85% 1RM |
| Front squat or pause squat | 3×4 | RPE 7 |
| Leg curl | 3×8 | moderate |

**Accessories**
- Calf raise 3×10 heavy

**Notes:** Hit depth consistently. Film your last heavy set.""",
    },
}

workout_tool_schema = {
    "type": "function",
    "function": {
        "name": "generate_workout_routine",
        "description": (
            "Generate a structured workout routine for a given fitness goal "
            "and training split (push, pull, or legs)."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "fitness_goal": {
                    "type": "string",
                    "enum": ["hypertrophy", "strength"],
                    "description": "Primary training goal.",
                },
                "target_split": {
                    "type": "string",
                    "enum": ["push", "pull", "legs"],
                    "description": "Muscle group split for the session.",
                },
            },
            "required": ["fitness_goal", "target_split"],
        },
    },
}


def generate_workout_routine(fitness_goal: str, target_split: str) -> str:
    goal = (fitness_goal or "").strip().lower()
    split = (target_split or "").strip().lower()

    routines = MOCK_ROUTINES.get(goal)
    if not routines:
        valid = ", ".join(MOCK_ROUTINES.keys())
        return (
            f"I don't have a routine for goal **{fitness_goal}**. "
            f"Try one of: {valid}."
        )

    routine = routines.get(split)
    if not routine:
        valid_splits = ", ".join(routines.keys())
        return (
            f"No **{goal}** routine for split **{target_split}**. "
            f"Available splits: {valid_splits}."
        )

    return routine

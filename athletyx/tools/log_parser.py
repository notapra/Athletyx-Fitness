"""
NL → structured workout confirmation tool (no LLM required).

AI engineer notes:
- log_tool_schema: exposed to future LLM function-calling / eval harnesses.
- parse_raw_workout_log: regex + aliases — deterministic, unit-testable extraction.
- Production path: same interface backed by an LLM with JSON schema or a fine-tuned parser.
"""

import re

# OpenAI-compatible tool definition — bind to model for autonomous tool selection
log_tool_schema = {
    "type": "function",
    "function": {
        "name": "parse_raw_workout_log",
        "description": (
            "Parse messy natural-language workout logs into a structured "
            "confirmation (exercise, weight, sets/reps, volume)."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "raw_text": {
                    "type": "string",
                    "description": "Unstructured workout log from the user.",
                },
            },
            "required": ["raw_text"],
        },
    },
}

_EXERCISE_ALIASES = {
    "bench": "Bench Press",
    "bench press": "Bench Press",
    "incline": "Incline Bench Press",
    "squat": "Squat",
    "deadlift": "Deadlift",
    "dl": "Deadlift",
    "ohp": "Overhead Press",
    "press": "Overhead Press",
    "row": "Barbell Row",
    "pullup": "Pull-Up",
    "pull-up": "Pull-Up",
    "curl": "Barbell Curl",
    "rdl": "Romanian Deadlift",
}

_WEIGHT_RE = re.compile(
    r"(?:@|at|for|x|\s)(\d{2,4}(?:\.\d+)?)\s*(?:lbs?|lb|kg)?",
    re.IGNORECASE,
)
_REPS_LIST_RE = re.compile(
    r"for\s+([\d\s,]+)|(?:reps?\s+)?([\d]+(?:\s*,\s*[\d]+)+)",
    re.IGNORECASE,
)
_SINGLE_SET_RE = re.compile(r"(\d+)\s*[x×]\s*(\d+)", re.IGNORECASE)


def _normalize_exercise(text: str) -> str:
    lower = text.lower().strip()
    for alias, name in sorted(_EXERCISE_ALIASES.items(), key=lambda x: -len(x[0])):
        if alias in lower:
            return name
    cleaned = re.sub(r"\b(hit|did|logged|for|at|@|\d+)\b", "", lower, flags=re.I)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if cleaned:
        return cleaned.title()
    return "Unknown Exercise"


def _extract_weight(text: str) -> float | None:
    match = _WEIGHT_RE.search(text)
    if match:
        return float(match.group(1))
    nums = re.findall(r"\b(\d{2,4})\b", text)
    for n in nums:
        val = float(n)
        if 45 <= val <= 600:
            return val
    return None


def _extract_reps(text: str) -> list[int]:
    list_match = _REPS_LIST_RE.search(text)
    if list_match:
        raw = list_match.group(1) or list_match.group(2) or ""
        parts = re.findall(r"\d+", raw)
        if parts:
            return [int(p) for p in parts]

    set_match = _SINGLE_SET_RE.search(text)
    if set_match:
        sets = int(set_match.group(1))
        reps = int(set_match.group(2))
        return [reps] * sets

    trailing = re.findall(r"\b(\d{1,2})\b", text)
    if len(trailing) >= 2:
        return [int(x) for x in trailing[-3:] if 1 <= int(x) <= 30]

    return []


def parse_raw_workout_log(raw_text: str) -> str:
    text = (raw_text or "").strip()
    if not text:
        return "Send a workout log like: *hit bench 225 for 8, 8, 6*"

    exercise = _normalize_exercise(text)
    weight = _extract_weight(text)
    reps = _extract_reps(text)

    if not reps:
        return (
            f"**Logged:** {exercise}\n\n"
            "I couldn't parse sets/reps. Try: `bench 225 for 8, 8, 6` or `3x8 @ 185`."
        )

    sets_count = len(reps)
    total_reps = sum(reps)
    volume = (weight or 0) * total_reps

    lines = [
        "**Workout logged**",
        "",
        f"- **Exercise:** {exercise}",
    ]
    if weight is not None:
        lines.append(f"- **Weight:** {weight:g} lbs")
    lines.append(f"- **Sets:** {sets_count} ({', '.join(str(r) for r in reps)} reps)")
    lines.append(f"- **Total reps:** {total_reps}")
    if weight is not None:
        lines.append(f"- **Session volume:** {volume:,.0f} lbs")
    lines.append("")
    lines.append("_Saved to your training log (simulated)._")

    return "\n".join(lines)

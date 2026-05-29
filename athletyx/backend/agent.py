import re
from typing import Any

from tools import TOOL_MAPPER


def execute_tool(name: str, arguments: dict[str, Any]) -> str:
    fn = TOOL_MAPPER.get(name)
    if fn is None:
        return f"Unknown tool: **{name}**"

    try:
        return fn(**arguments)
    except TypeError as exc:
        return f"Tool **{name}** failed: invalid arguments ({exc})."
    except Exception as exc:
        return f"Tool **{name}** failed: {exc}"


def _looks_like_log(text: str) -> bool:
    lower = text.lower()
    has_lift_word = bool(
        re.search(r"\b(bench|squat|deadlift|press|row|curl|hit|logged|dl|rdl)\b", lower)
    )
    has_numbers = bool(re.search(r"\d{2,4}", text)) or bool(re.search(r"\d+\s*[x×]\s*\d+", lower))
    has_rep_pattern = " for " in lower or "," in text
    return has_lift_word and has_numbers and (has_rep_pattern or "x" in lower)


def _detect_workout_intent(text: str) -> tuple[str, str] | None:
    lower = text.lower()
    if not re.search(r"\b(workout|routine|plan|program|session)\b", lower):
        return None

    goal = "hypertrophy"
    if re.search(r"\b(strength|power|1rm|max)\b", lower):
        goal = "strength"

    split = None
    for candidate in ("push", "pull", "legs"):
        if re.search(rf"\b{candidate}\b", lower):
            split = candidate
            break

    if split is None:
        return None

    return goal, split


def route_message(user_text: str) -> dict[str, Any]:
    text = (user_text or "").strip()
    if not text:
        return {
            "role": "assistant",
            "content": "Say something — log a set or ask for a workout plan.",
            "tool_used": None,
            "tool_args": None,
        }

    if _looks_like_log(text):
        tool_args = {"raw_text": text}
        content = execute_tool("parse_raw_workout_log", tool_args)
        return {
            "role": "assistant",
            "content": content,
            "tool_used": "parse_raw_workout_log",
            "tool_args": tool_args,
        }

    workout = _detect_workout_intent(text)
    if workout:
        goal, split = workout
        tool_args = {"fitness_goal": goal, "target_split": split}
        content = execute_tool("generate_workout_routine", tool_args)
        return {
            "role": "assistant",
            "content": content,
            "tool_used": "generate_workout_routine",
            "tool_args": tool_args,
        }

    return {
        "role": "assistant",
        "content": (
            "**Athletyx** — minimal input, rich output.\n\n"
            "Try:\n"
            "- `hit bench 225 for 8, 8, 6` — log a session\n"
            "- `hypertrophy push workout` — get a routine\n"
            "- `strength legs plan` — strength-focused leg day\n\n"
            "_Voice and live LLM routing coming in a later phase._"
        ),
        "tool_used": None,
        "tool_args": None,
    }

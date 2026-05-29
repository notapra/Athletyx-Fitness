from tools.log_parser import log_tool_schema, parse_raw_workout_log
from tools.workout_generator import (
    generate_workout_routine,
    workout_tool_schema,
)

ALL_ATHLETYX_TOOLS = [workout_tool_schema, log_tool_schema]

TOOL_MAPPER = {
    "generate_workout_routine": generate_workout_routine,
    "parse_raw_workout_log": parse_raw_workout_log,
}

__all__ = [
    "ALL_ATHLETYX_TOOLS",
    "TOOL_MAPPER",
    "generate_workout_routine",
    "parse_raw_workout_log",
    "workout_tool_schema",
    "log_tool_schema",
]

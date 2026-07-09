"""Register MCP tool domains — supports per-domain servers (Phase 3)."""

from __future__ import annotations

from tools import coaching, compliance, goals, identity, research, workouts

DOMAIN_MODULES = {
    "identity": [identity],
    "workouts": [workouts],
    "goals": [goals],
    "coaching": [coaching],
    "research": [research],
    "compliance": [compliance],
}

ALL_TOOL_MODULES = [
    identity,
    workouts,
    goals,
    coaching,
    research,
    compliance,
]


def register_all(mcp) -> None:
    register_domain(mcp, "all")


def register_domain(mcp, domain: str) -> None:
    key = (domain or "all").strip().lower()
    if key == "all":
        modules = ALL_TOOL_MODULES
    elif key in DOMAIN_MODULES:
        modules = DOMAIN_MODULES[key]
    else:
        raise ValueError(
            f"Unknown ATHLETYX_MCP_DOMAIN={domain!r}. "
            f"Use one of: all, {', '.join(DOMAIN_MODULES)}"
        )
    for mod in modules:
        mod.register(mcp)

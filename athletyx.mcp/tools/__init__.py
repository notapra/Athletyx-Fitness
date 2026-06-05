"""Register all MCP tool domains on the FastMCP instance."""

from tools import coaching, compliance, goals, identity, workouts


def register_all(mcp) -> None:
    identity.register(mcp)
    workouts.register(mcp)
    goals.register(mcp)
    coaching.register(mcp)
    compliance.register(mcp)

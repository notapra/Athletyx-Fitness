"""Goal and goal-contract MCP tools."""

from __future__ import annotations

from auth import get_authenticated_user_id
from db import build_goal_contract, complete_goal, create_goal, fetch_active_goals
from tools.helpers import fail, ok, safe_execute


def register(mcp) -> None:
    @mcp.tool()
    def get_active_goals() -> dict:
        """List incomplete goals for the authenticated user."""

        def _run():
            user_id = get_authenticated_user_id()
            goals = fetch_active_goals(user_id)
            return ok([g.model_dump() for g in goals])

        return safe_execute(_run)

    @mcp.tool(name="create_goal")
    def create_goal_tool(title: str, target: str | None = None) -> dict:
        """Create a new goal. Audited."""

        def _run():
            user_id = get_authenticated_user_id()
            goal = create_goal(user_id, title, target)
            return ok(goal.model_dump(), "Goal created.")

        return safe_execute(_run)

    @mcp.tool(name="complete_goal")
    def complete_goal_tool(goal_id: int) -> dict:
        """Mark a goal complete. Audited."""

        def _run():
            user_id = get_authenticated_user_id()
            goal = complete_goal(user_id, goal_id)
            if goal is None:
                return fail(f"Goal {goal_id} not found.")
            return ok(goal.model_dump(), "Goal completed.")

        return safe_execute(_run)

    @mcp.tool()
    def get_goal_contract() -> dict:
        """Return structured goal contract for AI coaching alignment."""

        def _run():
            user_id = get_authenticated_user_id()
            contract = build_goal_contract(user_id)
            if contract is None:
                return fail("User not found.")
            return ok(contract.model_dump())

        return safe_execute(_run)

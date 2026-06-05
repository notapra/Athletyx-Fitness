"""MCP prompts — curated coaching and safety templates."""

from __future__ import annotations

from auth import get_authenticated_user_id
from db import build_goal_contract, fetch_user_by_id


def register(mcp) -> None:
    @mcp.prompt(name="coaching-with-goal-contract")
    def coaching_with_goal_contract() -> str:
        """System context with the user's goal contract for aligned coaching."""
        user_id = get_authenticated_user_id()
        contract = build_goal_contract(user_id)
        user = fetch_user_by_id(user_id)
        if contract is None or user is None:
            return "User context unavailable. Use general fitness guidance only."
        goals = ", ".join(g.title for g in contract.active_goals) or "none"
        constraints = ", ".join(contract.constraints) or "none"
        return (
            f"You are IronCoach for {user.name}.\n"
            f"Primary goal: {contract.primary_goal}\n"
            f"Experience: {contract.experience_level}\n"
            f"Active goals: {goals}\n"
            f"Constraints: {constraints}\n"
            f"Units: {contract.units}\n"
            "Stay aligned with the goal contract. Do not contradict constraints."
        )

    @mcp.prompt(name="health-safe-coaching")
    def health_safe_coaching() -> str:
        """Conservative coaching prompt with health disclaimer."""
        return (
            "You are a fitness coach, NOT a doctor. Include this disclaimer when giving advice: "
            "'This is general fitness information, not medical advice. Consult a physician "
            "before starting or changing an exercise program.' "
            "Use conservative recommendations for beginners. Never diagnose injuries."
        )

    @mcp.prompt(name="post-workout-debrief")
    def post_workout_debrief() -> str:
        """Template for summarizing a completed workout session."""
        return (
            "Summarize the user's completed workout in 3 bullets: "
            "1) headline effort, 2) standout lift or PR, 3) one recovery tip for tomorrow. "
            "Keep tone encouraging and concise."
        )

    @mcp.prompt(name="refusal-medical-advice")
    def refusal_medical_advice() -> str:
        """Template for refusing medical diagnosis or prescription requests."""
        return (
            "The user is asking for medical advice. Respond: "
            "'I can't provide medical diagnosis or treatment. Please consult a qualified "
            "healthcare professional. I can help with general training principles once "
            "you're cleared to exercise.'"
        )

    @mcp.prompt(name="guardian-drift-review")
    def guardian_drift_review() -> str:
        """Supervisor prompt to check a draft reply for goal drift."""
        user_id = get_authenticated_user_id()
        contract = build_goal_contract(user_id)
        goal = contract.primary_goal if contract else "unknown"
        return (
            f"Review the draft coaching reply for alignment with goal: {goal}. "
            "Score drift 0-1 (0=aligned, 1=off-topic). "
            "If drift > 0.6, rewrite the reply to refocus on the goal. "
            "Flag bro-science, unsafe advice, or medical claims."
        )

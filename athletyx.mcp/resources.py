"""MCP resources — legal, policy, and reference data URIs."""

from __future__ import annotations

import json
from pathlib import Path

_CONTENT = Path(__file__).resolve().parent / "content"

_LEGAL = {
    "athletyx://legal/privacy-policy": """# Athletyx Privacy Policy (v1.0)

We collect account info (email, name), workout data, bodyweight, and AI chat history
to provide fitness tracking and coaching. Data is stored encrypted in transit (TLS)
and at rest. We do not sell personal data. Contact support@athletyx.test for requests.
""",
    "athletyx://legal/terms-of-service": """# Athletyx Terms of Service (v1.0)

By using Athletyx you agree to use the app for personal fitness tracking only.
You must be 13+ to create an account. We may update these terms with notice.
""",
    "athletyx://legal/health-disclaimer": """# Health Disclaimer

Athletyx is not a medical device and does not provide medical advice, diagnosis,
or treatment. Consult a physician before starting any exercise program.
Stop exercising if you feel pain, dizziness, or shortness of breath.
""",
    "athletyx://legal/ai-disclosure": """# AI Disclosure

Athletyx uses AI to generate coaching suggestions. AI outputs may be inaccurate.
Your workout data and goals may be sent to AI providers when you enable AI coaching.
You can disable AI features in consent settings.
""",
}

_POLICIES = {
    "athletyx://privacy/data-categories": json.dumps(
        {
            "contact": ["email", "name"],
            "health_fitness": [
                "workouts",
                "bodyweight",
                "goals",
                "age",
                "injury_history",
                "movement_restrictions",
                "max_effort_level",
            ],
            "user_content": ["notes", "chat"],
            "identifiers": ["user_id"],
        },
        indent=2,
    ),
    "athletyx://privacy/retention-policy": """# Data Retention

- Workout data: retained while account is active; deleted within 30 days of account deletion.
- Audit logs: 90 days.
- AI chat: 1 year or until account deletion.
""",
    "athletyx://guardian/policy": json.dumps(
        {
            "reminder_caps": {"per_day": 2, "per_week": 5},
            "cooldown_hours": 4,
            "drift_threshold": 0.6,
        },
        indent=2,
    ),
    "athletyx://ai/safety-rails": """# AI Safety Rails

The coach MUST NOT: diagnose conditions, prescribe medication, recommend unsafe loads,
override pain signals, or claim medical authority. The coach MUST: encourage form quality,
progressive overload, rest, and physician consultation for injuries.
""",
    "athletyx://analytics/methodology": """# Analytics Methodology

Volume = sum(reps × weight) per session. Muscle balance = set count by muscle group over 7 days.
PR detection = max weight at reps for each exercise name.
""",
}


def register(mcp) -> None:
    @mcp.resource("athletyx://legal/privacy-policy")
    def privacy_policy() -> str:
        return _LEGAL["athletyx://legal/privacy-policy"]

    @mcp.resource("athletyx://legal/terms-of-service")
    def terms_of_service() -> str:
        return _LEGAL["athletyx://legal/terms-of-service"]

    @mcp.resource("athletyx://legal/health-disclaimer")
    def health_disclaimer() -> str:
        return _LEGAL["athletyx://legal/health-disclaimer"]

    @mcp.resource("athletyx://legal/ai-disclosure")
    def ai_disclosure() -> str:
        return _LEGAL["athletyx://legal/ai-disclosure"]

    @mcp.resource("athletyx://privacy/data-categories")
    def data_categories() -> str:
        return _POLICIES["athletyx://privacy/data-categories"]

    @mcp.resource("athletyx://privacy/retention-policy")
    def retention_policy() -> str:
        return _POLICIES["athletyx://privacy/retention-policy"]

    @mcp.resource("athletyx://guardian/policy")
    def guardian_policy() -> str:
        return _POLICIES["athletyx://guardian/policy"]

    @mcp.resource("athletyx://ai/safety-rails")
    def safety_rails() -> str:
        return _POLICIES["athletyx://ai/safety-rails"]

    @mcp.resource("athletyx://analytics/methodology")
    def analytics_methodology() -> str:
        return _POLICIES["athletyx://analytics/methodology"]

    @mcp.resource("athletyx://exercises/catalog")
    def exercise_catalog() -> str:
        return (_CONTENT / "exercises.json").read_text(encoding="utf-8")

    @mcp.resource("athletyx://coaching/personalization-guide")
    def personalization_guide() -> str:
        return (_CONTENT / "personalization-guide.md").read_text(encoding="utf-8")

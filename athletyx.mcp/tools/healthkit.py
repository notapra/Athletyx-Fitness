"""Phase 2 HealthKit / Health Connect MCP tools (integration-ready stubs)."""

from __future__ import annotations

from auth import get_authenticated_user_id
from tools.helpers import ok, safe_execute


def register(mcp) -> None:
    @mcp.tool()
    def sync_healthkit_workouts(direction: str = "import") -> dict:
        """
        Sync workouts with Apple HealthKit / Google Health Connect.
        Phase 2 ships the tool contract; native Capacitor plugins wire later.
        direction: import | export
        """

        def _run():
            user_id = get_authenticated_user_id()
            direction_norm = (direction or "import").strip().lower()
            if direction_norm not in ("import", "export"):
                direction_norm = "import"
            return ok(
                {
                    "user_id": str(user_id),
                    "available": False,
                    "direction": direction_norm,
                    "imported": 0,
                    "exported": 0,
                    "message": (
                        "Health sync is not enabled on this build. "
                        "See athletyx://integrations/healthkit for the rollout plan."
                    ),
                    "resource": "athletyx://integrations/healthkit",
                }
            )

        return safe_execute(_run)

    @mcp.tool()
    def get_healthkit_status() -> dict:
        """Return HealthKit / Health Connect availability for the current device/session."""
        return ok(
            {
                "available": False,
                "platforms": ["ios_healthkit", "android_health_connect"],
                "permissions_required": ["workouts", "active_energy"],
                "resource": "athletyx://integrations/healthkit",
            }
        )

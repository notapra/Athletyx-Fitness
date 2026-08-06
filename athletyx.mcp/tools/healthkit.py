"""Phase 2 HealthKit / Health Connect MCP tools."""

from __future__ import annotations

import os

from auth import get_authenticated_user_id
from tools.helpers import ok, safe_execute

HEALTH_PLUGIN_SHIPPED = os.getenv("ATHLETYX_HEALTH_PLUGIN", "true").lower() in (
    "1",
    "true",
    "yes",
)


def _status_payload() -> dict:
    return {
        "available": HEALTH_PLUGIN_SHIPPED,
        "plugin_shipped": HEALTH_PLUGIN_SHIPPED,
        "device_sync_requires_app": True,
        "platforms": ["ios_healthkit", "android_health_connect"],
        "permissions_required": ["workouts", "calories", "exerciseTime"],
        "resource": "athletyx://integrations/healthkit",
        "message": (
            "Health sync runs in the IronLog mobile app (Settings → Health sync). "
            "MCP tools describe integration status; import/export executes on-device."
        ),
    }


def register(mcp) -> None:
    @mcp.tool()
    def sync_healthkit_workouts(direction: str = "import") -> dict:
        """
        Sync workouts with Apple HealthKit / Google Health Connect.
        Native import/export runs in the IronLog mobile app when health sync is enabled.
        direction: import | export
        """

        def _run():
            user_id = get_authenticated_user_id()
            direction_norm = (direction or "import").strip().lower()
            if direction_norm not in ("import", "export"):
                direction_norm = "import"
            status = _status_payload()
            return ok(
                {
                    "user_id": str(user_id),
                    **status,
                    "direction": direction_norm,
                    "imported": 0,
                    "exported": 0,
                    "action": "open_mobile_app",
                }
            )

        return safe_execute(_run)

    @mcp.tool()
    def get_healthkit_status() -> dict:
        """Return HealthKit / Health Connect integration status for Athletyx builds."""
        return ok(_status_payload())

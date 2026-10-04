---
name: MCP Phase 2 App Store Tools
overview: Add analytics, guardian, chat, account compliance, and HealthKit MCP tools/resources so agents can coach from full user context under per-user JWT scope.
todos:
  - id: analytics-tools
    content: get_training_analytics, get_personal_records, get_muscle_heat_map + dashboard resource
    status: completed
  - id: guardian-chat
    content: run_guardian_check, history, chat get/append with DB backends
    status: completed
  - id: account-healthkit
    content: export_user_data, request_account_deletion, HealthKit stubs + integration resource
    status: completed
  - id: domain-registration
    content: Register new MCP domains and expose them via /api/mcp/session
    status: completed
isProject: false
---

# Stage 06 — MCP Phase 2 tools

Implements the Phase 2 surface from [`docs/athletyx-mcp-app-store-spec.md`](../athletyx-mcp-app-store-spec.md).

## Domains

| Domain | Tools |
|--------|-------|
| analytics | training analytics, PRs, muscle heat map |
| guardian | alignment check + history + reminder policy |
| chat | history + append |
| account | data export + deletion request |
| healthkit | sync status stubs (native plugins later) |

## Verification

```bash
cd athletyx.mcp
python -m py_compile analytics_logic.py tools/analytics.py tools/guardian.py tools/chat.py tools/account.py tools/healthkit.py
python -c "from analytics_logic import compute_training_analytics, score_goal_alignment; print(score_goal_alignment({'primary_goal':'strength'}, 'bench press workout'))"
```

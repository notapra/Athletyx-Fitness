# Athletyx MCP — App Store Grade Specification

MCP **tools**, **resources**, and **prompts** required for a production fitness app with AI coaching, aligned to Apple App Store / Google Play expectations for health-adjacent apps.

**Implementation:** Phase 1 lives in [`athletyx.mcp/`](../athletyx.mcp/). See [`athletyx.mcp/ARCHITECTURE.md`](../athletyx.mcp/ARCHITECTURE.md) for runtime wiring.

---

## MCP primitives

| Primitive | Role | App-store expectation |
|-----------|------|----------------------|
| **Tools** | Callable actions (read/write with validation) | Per-user scope, audited mutations, idempotent where possible |
| **Resources** | Read-only URIs (policies, catalogs, snapshots) | Versioned legal text; no cross-user PII |
| **Prompts** | Curated templates (coaching modes, safety) | Medical disclaimers; goal-aligned; no diagnosis |

---

## User scoping (Phase 1)

Clients pass the authenticated user via environment variable:

```json
"env": {
  "ATHLETYX_USER_ID": "1",
  "ATHLETYX_ADMIN": "false"
}
```

- All user-data tools require `ATHLETYX_USER_ID`.
- Cross-user search (`search_users_by_profile`) requires `ATHLETYX_ADMIN=true`.
- Mutations write to `audit_log`.

---

## Phase 1 — Implemented

### Tools (25)

| Domain | Tool | Access |
|--------|------|--------|
| **Identity** | `get_current_user_profile` | scoped |
| | `update_profile_preferences` | scoped, audited |
| | `update_personal_factors` | scoped, audited |
| | `get_personalization_context` | scoped |
| | `get_consent_status` | scoped |
| | `update_consent` | scoped, audited |
| | `get_data_inventory` | public |
| **Research** | `search_documents_with_context` | scoped |
| | `search_web_serpapi` | scoped, consent-gated |
| | `search_web_duckduckgo` | scoped, consent-gated (alias) |
| **Workouts** | `get_workout_sessions` | scoped |
| | `get_workout_session_detail` | scoped |
| | `create_workout_session` | scoped, audited |
| | `log_exercise_sets` | scoped, audited |
| | `parse_raw_workout_log` | scoped |
| | `search_exercise_library` | public |
| **Goals** | `get_active_goals` | scoped |
| | `create_goal` | scoped, audited |
| | `complete_goal` | scoped, audited |
| | `get_goal_contract` | scoped |
| **Coaching** | `generate_workout_routine` | scoped |
| **Compliance** | `get_audit_log` | scoped |
| **Admin** | `get_user_by_id` | admin or self |
| | `get_user_by_email` | admin or self |
| | `search_users_by_profile` | admin only |

### Resources (11)

| URI | Content |
|-----|---------|
| `athletyx://legal/privacy-policy` | Privacy policy |
| `athletyx://legal/terms-of-service` | Terms of service |
| `athletyx://legal/health-disclaimer` | Not medical advice |
| `athletyx://legal/ai-disclosure` | AI data usage |
| `athletyx://privacy/data-categories` | App Store privacy label mirror |
| `athletyx://privacy/retention-policy` | Data retention |
| `athletyx://guardian/policy` | Reminder caps & cooldowns |
| `athletyx://ai/safety-rails` | Coach must-not rules |
| `athletyx://exercises/catalog` | Exercise JSON catalog |
| `athletyx://analytics/methodology` | How metrics are computed |
| `athletyx://coaching/personalization-guide` | Age, injury, effort personalization |

### Prompts (6)

| Name | Purpose |
|------|---------|
| `coaching-with-goal-contract` | Inject goal + personal factors + constraints |
| `personalized-research` | Document + SerpAPI search workflow |
| `health-safe-coaching` | Disclaimer + conservative tone |
| `post-workout-debrief` | After-session summary |
| `refusal-medical-advice` | Diagnosis / prescription refusal |
| `guardian-drift-review` | Supervisor alignment check |

---

## Phase 2 — Planned

| Domain | Tools / resources |
|--------|-------------------|
| **Analytics** | `get_training_analytics`, `get_personal_records`, `get_muscle_heat_map`, dashboard resource |
| **Guardian** | `run_guardian_check`, `get_guardian_history`, reminder tools |
| **Chat** | `get_chat_history`, `append_chat_message` |
| **Account** | `export_user_data`, `request_account_deletion` |
| **HealthKit** | `sync_healthkit_workouts`, integration resources |

---

## Phase 3 — Production hardening

- OAuth / JWT instead of `ATHLETYX_USER_ID` env
- Read replica for agent queries
- Rate limits per user
- Separate MCP servers by domain (stay under ~40 tools per client)
- Supabase RLS alignment with `public.profiles` UUID schema

---

## Personalization & research

Agents must call `get_personalization_context` (or `get_goal_contract`) before coaching.
Profile fields drive intensity, substitutions, and search ranking.

### Personal factors (`users.personal_factors` JSONB)

| Field | Values | Purpose |
|-------|--------|---------|
| `age` | integer column | Volume, recovery, joint stress |
| `max_effort_level` | conservative / moderate / aggressive | RPE caps, failure tolerance |
| `injury_history` | string[] | Past injuries that may flare |
| `movement_restrictions` | string[] | Movements to avoid |
| `recovery_capacity` | slow / average / fast | Session spacing |
| `medical_clearance` | boolean | Physician OK for exercise |
| `notes` | string | Free-text context |

Update via `update_personal_factors` or `update_profile_preferences` (age, constraints).

### Document search

`search_documents_with_context(query)` ranks Athletyx resources (policies, exercise catalog,
safety rails, personalization guide) using the user's goal, age, injuries, and restrictions.

### Web search (SerpAPI + DuckDuckGo)

`search_web_serpapi(query, engine)` calls `https://serpapi.com/search.json` with the
query enriched by the user's personalization context. `engine` is `duckduckgo` (default) or `google`.

**Setup:** copy `athletyx.mcp/.env.example` → `athletyx.mcp/.env` and set `SERPAPI_API_KEY`.
The `.env` file is **gitignored** — never commit API keys to the public repo.
See `athletyx.mcp/SECRETS.md`. Requires `ai_coaching` consent.

---

## App Store compliance mapping

| Store requirement | MCP surface |
|-------------------|-------------|
| Account deletion | Phase 2 `request_account_deletion` |
| Data export | Phase 2 `export_user_data` |
| Privacy labels | `athletyx://privacy/data-categories` + age/injury fields |
| Health disclaimer | `athletyx://legal/health-disclaimer` + `health-safe-coaching` prompt |
| AI disclosure | `athletyx://legal/ai-disclosure` |
| Injury-safe coaching | `personal_factors`, `coaching_directives`, `personalization-guide` |
| No cross-user leaks | `ATHLETYX_USER_ID` scoping + admin gate |
| Audit trail | `audit_log` table + `get_audit_log` |

---

## Database tables (Phase 1)

| Table | Purpose |
|-------|---------|
| `users` | Profile (age, personal_factors JSON, preferences, constraints) |
| `goals` | User goals |
| `workout_sessions` | Session metadata |
| `exercise_entries` | Exercises per session |
| `sets` | Reps/weight per entry |
| `bodyweight_logs` | Weight tracking |
| `user_consents` | AI, analytics, notifications opt-in |
| `audit_log` | Mutation audit trail |

---

## Client configuration

### Cursor (`.cursor/mcp.json`)

```json
"athletyx-user-data": {
  "command": "python3",
  "args": ["…/athletyx.mcp/server.py"],
  "env": {
    "DB_HOST": "localhost",
    "DB_PORT": "5432",
    "DB_NAME": "postgres",
    "DB_USER": "postgres",
    "DB_PASSWORD": "postgres",
    "ATHLETYX_USER_ID": "1"
  }
}
```

SerpAPI key: use `athletyx.mcp/.env` (see `SECRETS.md`), not committed config:

```bash
cp athletyx.mcp/.env.example athletyx.mcp/.env
# edit SERPAPI_API_KEY in .env
```

### Inspector

```bash
npx @modelcontextprotocol/inspector \
  -e ATHLETYX_USER_ID=1 \
  -e DB_HOST=localhost … \
  python3 server.py
```

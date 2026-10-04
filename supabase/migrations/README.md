# Supabase migrations (IronLog + Athletyx)

## Staging / production apply order

Run in **Supabase SQL Editor** on your staging project:

1. [`schema.sql`](../schema.sql) — base IronLog schema + RLS
2. [`20260609120000_profile_age_and_consents.sql`](20260609120000_profile_age_and_consents.sql)
3. [`20260613120000_coach_query_cache.sql`](20260613120000_coach_query_cache.sql)
4. [`20260709120000_mcp_audit_log.sql`](20260709120000_mcp_audit_log.sql) — Phase 3 MCP mutation audit (RLS)
5. [`20260717120000_nutrition_tracker.sql`](20260717120000_nutrition_tracker.sql) — food catalog + nutrition logs

Then run [`staging-setup.sql`](../staging-setup.sql) to verify RLS.

## Tables added for production

| Table | Purpose |
|-------|---------|
| `user_consents` | AI + analytics consent toggles |
| `account_deletion_requests` | App Store account deletion |
| `coach_query_cache` | Reuse coach answers across devices (saves API cost) |
| `coach_cache_events` | Cache hit/miss/save audit log |
| `mcp_audit_log` | Phase 3 MCP tool mutation audit (per-user RLS) |
| `food_items` | Nutrition catalog (nutrients per 100 g) |
| `nutrition_log_entries` | Gram-based daily food logs |
| `ai_chat_history` | IronCoach chat sync (base schema) |

## CLI (optional)

```bash
supabase start
supabase db reset
```

## Legacy

| File | Description |
|------|-------------|
| `20260529120000_create_users_table.sql` | Parallel MCP `users` table (dev tooling only) |

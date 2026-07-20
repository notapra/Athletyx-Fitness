# Staging Supabase apply runbook

Use this when creating or refreshing a **staging** Supabase project.

## Prerequisites

```bash
supabase login
supabase link --project-ref YOUR_STAGING_REF
```

## Apply order (SQL Editor)

Paste and run each file completely before the next:

1. [`schema.sql`](../supabase/schema.sql)
2. [`migrations/20260609120000_profile_age_and_consents.sql`](../supabase/migrations/20260609120000_profile_age_and_consents.sql)
3. [`migrations/20260613120000_coach_query_cache.sql`](../supabase/migrations/20260613120000_coach_query_cache.sql)
4. [`migrations/20260709120000_mcp_audit_log.sql`](../supabase/migrations/20260709120000_mcp_audit_log.sql)
5. [`migrations/20260717120000_nutrition_tracker.sql`](../supabase/migrations/20260717120000_nutrition_tracker.sql)
6. [`staging-setup.sql`](../supabase/staging-setup.sql) — confirm every row has `rls_enabled = true`

## Purge function

```bash
supabase functions deploy purge-deleted-accounts --no-verify-jwt
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... CRON_SECRET=...
```

Schedule a daily HTTP POST to the function URL with header `Authorization: Bearer $CRON_SECRET` (or project-specific auth as configured).

## Auth URLs

Dashboard → Authentication → URL configuration:

- Site URL: staging Vercel URL
- Redirect URLs: `http://localhost:5173/**`, staging Vercel URL, `capacitor://localhost`

## Record

| Item | Value |
|------|-------|
| Project ref | |
| Applied date | |
| RLS verify passed | Y/N |
| Purge function deployed | Y/N |

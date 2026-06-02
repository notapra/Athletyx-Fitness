# Supabase migrations (Athletyx)

## Apply locally

```bash
# From repo root (requires Supabase CLI: https://supabase.com/docs/guides/cli)
supabase start
supabase db reset
```

Local Postgres API: `postgresql://postgres:postgres@localhost:54322/postgres` (matches `.cursor/mcp.json`).

## Migrations

| File | Description |
|------|-------------|
| `20260529120000_create_users_table.sql` | `public.users` with UUIDv4 `user_id`, unique `email`, timestamps, immutable `user_id` trigger |

Legacy monolithic schema: [`../schema.sql`](../schema.sql) (IronLog profiles, workouts, guardian). Run migrations **or** SQL Editor for new `users` table on existing projects.

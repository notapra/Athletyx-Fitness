-- Edge function companion: scheduled purge of accounts after 30-day deletion window.
-- Deploy via Supabase CLI: supabase functions deploy purge-deleted-accounts

-- Manual SQL job (run daily via pg_cron or external scheduler):
-- UPDATE account_deletion_requests SET status = 'completed'
-- WHERE status = 'pending' AND scheduled_purge_at < now();

-- Full purge should delete auth.users via service role; see docs/production-deploy.md.

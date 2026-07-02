# Deploy: supabase functions deploy purge-deleted-accounts --no-verify-jwt
#
# Secrets (Supabase dashboard → Edge Functions):
#   SUPABASE_URL
#   SUPABASE_SERVICE_ROLE_KEY
#   CRON_SECRET          — random string; pass as Authorization: Bearer <CRON_SECRET>
#
# Schedule daily via Supabase cron or external scheduler:
#   POST https://<project>.supabase.co/functions/v1/purge-deleted-accounts
#   Authorization: Bearer <CRON_SECRET>

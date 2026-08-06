-- IronLog Supabase staging setup
-- Run in SQL Editor on your STAGING project in this order:
--
-- 1) supabase/schema.sql
-- 2) supabase/migrations/20260609120000_profile_age_and_consents.sql
-- 3) supabase/migrations/20260613120000_coach_query_cache.sql
-- 4) supabase/migrations/20260709120000_mcp_audit_log.sql
-- 5) supabase/migrations/20260717120000_nutrition_tracker.sql
--
-- Then verify RLS is enabled:

SELECT tablename, rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles',
    'workout_sessions',
    'bodyweight_logs',
    'goals',
    'ai_chat_history',
    'user_consents',
    'account_deletion_requests',
    'coach_query_cache',
    'coach_cache_events',
    'mcp_audit_log',
    'food_items',
    'nutrition_log_entries',
    'guardian_checks',
    'guardian_reminders'
  )
ORDER BY tablename;

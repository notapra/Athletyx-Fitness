import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const { data: due, error } = await supabase
    .from('account_deletion_requests')
    .select('id, user_id')
    .eq('status', 'pending')
    .lte('scheduled_purge_at', new Date().toISOString())

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const purged: string[] = []
  const failed: { user_id: string; reason: string }[] = []

  for (const row of due ?? []) {
    const userId = row.user_id

    const userScopedTables = [
      'coach_cache_events',
      'coach_query_cache',
      'ai_chat_history',
      'guardian_reminders',
      'guardian_checks',
      'ai_insights',
      'goals',
      'bodyweight_logs',
      'workout_sessions',
      'user_consents',
    ]

    for (const table of userScopedTables) {
      await supabase.from(table).delete().eq('user_id', userId)
    }

    await supabase.from('profiles').delete().eq('id', userId)

    const { error: authErr } = await supabase.auth.admin.deleteUser(userId)
    if (authErr) {
      failed.push({ user_id: userId, reason: authErr.message })
      continue
    }

    await supabase
      .from('account_deletion_requests')
      .update({ status: 'completed' })
      .eq('id', row.id)

    purged.push(userId)
  }

  return new Response(
    JSON.stringify({ purged_count: purged.length, purged, failed }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})

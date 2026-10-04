-- Phase 3 MCP audit trail (Supabase RLS — user-scoped mutations)
CREATE TABLE IF NOT EXISTS public.mcp_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  resource text,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mcp_audit_log_user ON public.mcp_audit_log(user_id, created_at DESC);

ALTER TABLE public.mcp_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own MCP audit log" ON public.mcp_audit_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own MCP audit log" ON public.mcp_audit_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

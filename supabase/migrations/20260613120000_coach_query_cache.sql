-- Per-user coach query response cache (cloud sync for multi-device reuse)
CREATE TABLE IF NOT EXISTS public.coach_query_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cache_key text NOT NULL,
  query_normalized text NOT NULL,
  response jsonb NOT NULL DEFAULT '{}'::jsonb,
  web_search_used boolean DEFAULT false,
  hit_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  last_hit_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  UNIQUE (user_id, cache_key)
);

CREATE INDEX IF NOT EXISTS idx_coach_cache_user_key ON public.coach_query_cache(user_id, cache_key);
CREATE INDEX IF NOT EXISTS idx_coach_cache_expires ON public.coach_query_cache(expires_at);

ALTER TABLE public.coach_query_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own coach cache" ON public.coach_query_cache
  FOR ALL USING (auth.uid() = user_id);

-- Cache usage audit log
CREATE TABLE IF NOT EXISTS public.coach_cache_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event text NOT NULL CHECK (event IN ('hit', 'miss', 'save')),
  cache_key text,
  query_normalized text,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coach_cache_events_user ON public.coach_cache_events(user_id, created_at DESC);

ALTER TABLE public.coach_cache_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own cache events" ON public.coach_cache_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own cache events" ON public.coach_cache_events
  FOR SELECT USING (auth.uid() = user_id);

-- Profile extensions for IronLog production (age, consents)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age integer;

CREATE TABLE IF NOT EXISTS public.user_consents (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  ai_coaching boolean DEFAULT false,
  analytics boolean DEFAULT false,
  notifications boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own consents" ON public.user_consents
  FOR ALL USING (auth.uid() = user_id);

-- Account deletion requests (App Store compliance)
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_at timestamptz DEFAULT now(),
  scheduled_purge_at timestamptz DEFAULT (now() + interval '30 days'),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'cancelled', 'completed'))
);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own deletion requests" ON public.account_deletion_requests
  FOR ALL USING (auth.uid() = user_id);

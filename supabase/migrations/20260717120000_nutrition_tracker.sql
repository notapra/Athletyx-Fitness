-- Macro + micronutrient tracker (values stored per 100 g; logs store grams)

CREATE TABLE IF NOT EXISTS public.food_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id text NOT NULL,
  fdc_id integer,
  name text NOT NULL,
  brand text DEFAULT '',
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('usda', 'manual', 'saved')),
  nutrients_per_100g jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_food_items_user ON public.food_items(user_id);
CREATE INDEX IF NOT EXISTS idx_food_items_fdc ON public.food_items(user_id, fdc_id);

CREATE TABLE IF NOT EXISTS public.nutrition_log_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id text NOT NULL,
  food_client_id text NOT NULL,
  grams numeric NOT NULL CHECK (grams > 0),
  meal text NOT NULL DEFAULT 'snack' CHECK (meal IN ('breakfast', 'lunch', 'dinner', 'snack')),
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  logged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_nutrition_logs_user_date ON public.nutrition_log_entries(user_id, log_date DESC);

ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_log_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own food items" ON public.food_items
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users CRUD own nutrition logs" ON public.nutrition_log_entries
  FOR ALL USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS food_items_updated_at ON public.food_items;
CREATE TRIGGER food_items_updated_at BEFORE UPDATE ON public.food_items
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS nutrition_log_entries_updated_at ON public.nutrition_log_entries;
CREATE TRIGGER nutrition_log_entries_updated_at BEFORE UPDATE ON public.nutrition_log_entries
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

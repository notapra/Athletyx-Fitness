-- IronLog / GymTracker — Supabase schema with Row Level Security
-- Run this in the Supabase SQL Editor for your project.

-- ---------------------------------------------------------------------------
-- Profiles (extends auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  email text,
  avatar_url text,
  bodyweight numeric,
  experience_level text default 'intermediate',
  fitness_goal text,
  units text default 'lbs' check (units in ('lbs', 'kg')),
  dark_mode boolean default true,
  ai_preferences jsonb default '{}'::jsonb,
  notification_preferences jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Workout sessions
-- ---------------------------------------------------------------------------
create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  client_id text,
  split text not null default 'Upper',
  duration integer default 0,
  notes text default '',
  started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now(),
  unique (user_id, client_id)
);

create index if not exists idx_workout_sessions_user on public.workout_sessions(user_id);
create index if not exists idx_workout_sessions_created on public.workout_sessions(created_at desc);

-- ---------------------------------------------------------------------------
-- Exercise entries (per session)
-- ---------------------------------------------------------------------------
create table if not exists public.exercise_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_name text not null,
  muscle_group text,
  sort_order integer default 0
);

create index if not exists idx_exercise_entries_session on public.exercise_entries(session_id);

-- ---------------------------------------------------------------------------
-- Sets
-- ---------------------------------------------------------------------------
create table if not exists public.sets (
  id uuid primary key default gen_random_uuid(),
  exercise_entry_id uuid not null references public.exercise_entries(id) on delete cascade,
  reps integer not null default 0,
  weight numeric not null default 0,
  sort_order integer default 0
);

create index if not exists idx_sets_exercise on public.sets(exercise_entry_id);

-- ---------------------------------------------------------------------------
-- Bodyweight logs
-- ---------------------------------------------------------------------------
create table if not exists public.bodyweight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  client_id text,
  weight numeric not null,
  created_at timestamptz not null default now(),
  unique (user_id, client_id)
);

create index if not exists idx_bodyweight_user on public.bodyweight_logs(user_id);

-- ---------------------------------------------------------------------------
-- Goals
-- ---------------------------------------------------------------------------
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  client_id text,
  title text not null,
  target text,
  completed boolean default false,
  created_at timestamptz default now(),
  unique (user_id, client_id)
);

-- ---------------------------------------------------------------------------
-- AI chat history
-- ---------------------------------------------------------------------------
create table if not exists public.ai_chat_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  message text not null,
  created_at timestamptz default now()
);

create index if not exists idx_ai_chat_user on public.ai_chat_history(user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- AI insights cache
-- ---------------------------------------------------------------------------
create table if not exists public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  insight_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_ai_insights_user on public.ai_insights(user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Goal Guardian checks
-- ---------------------------------------------------------------------------
create table if not exists public.guardian_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  check_type text not null,
  drift_score integer default 0,
  aligned boolean default true,
  coach_excerpt text,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_guardian_checks_user on public.guardian_checks(user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Goal Guardian reminders
-- ---------------------------------------------------------------------------
create table if not exists public.guardian_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reminder_type text not null,
  message text not null,
  sent_at timestamptz default now(),
  dismissed_at timestamptz
);

create index if not exists idx_guardian_reminders_user on public.guardian_reminders(user_id, sent_at desc);

-- ---------------------------------------------------------------------------
-- Auto-create profile on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, username)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists workout_sessions_updated_at on public.workout_sessions;
create trigger workout_sessions_updated_at before update on public.workout_sessions
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.exercise_entries enable row level security;
alter table public.sets enable row level security;
alter table public.bodyweight_logs enable row level security;
alter table public.goals enable row level security;
alter table public.ai_chat_history enable row level security;
alter table public.ai_insights enable row level security;
alter table public.guardian_checks enable row level security;
alter table public.guardian_reminders enable row level security;

-- Profiles
create policy "Users read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Workout sessions
create policy "Users CRUD own sessions" on public.workout_sessions for all using (auth.uid() = user_id);

-- Exercise entries (via session ownership)
create policy "Users CRUD own exercise entries" on public.exercise_entries for all using (
  exists (select 1 from public.workout_sessions ws where ws.id = session_id and ws.user_id = auth.uid())
);

-- Sets (via exercise -> session ownership)
create policy "Users CRUD own sets" on public.sets for all using (
  exists (
    select 1 from public.exercise_entries ee
    join public.workout_sessions ws on ws.id = ee.session_id
    where ee.id = exercise_entry_id and ws.user_id = auth.uid()
  )
);

-- Bodyweight
create policy "Users CRUD own bodyweight" on public.bodyweight_logs for all using (auth.uid() = user_id);

-- Goals
create policy "Users CRUD own goals" on public.goals for all using (auth.uid() = user_id);

-- AI chat
create policy "Users CRUD own chat" on public.ai_chat_history for all using (auth.uid() = user_id);

-- AI insights
create policy "Users CRUD own insights" on public.ai_insights for all using (auth.uid() = user_id);

-- Goal Guardian
create policy "Users CRUD own guardian checks" on public.guardian_checks for all using (auth.uid() = user_id);
create policy "Users CRUD own guardian reminders" on public.guardian_reminders for all using (auth.uid() = user_id);

-- Realtime (enable in Supabase dashboard: Database > Replication for these tables)
-- alter publication supabase_realtime add table workout_sessions, bodyweight_logs, goals, ai_chat_history;

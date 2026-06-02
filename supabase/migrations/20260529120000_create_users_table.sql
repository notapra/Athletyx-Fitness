-- Athletyx: public.users — core identity store with immutable user_id
-- Apply via: supabase db reset | supabase migration up | SQL Editor (remote)

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp" with schema extensions;

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  user_id uuid primary key default extensions.uuid_generate_v4(),
  email varchar(255) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_email_unique unique (email),
  constraint users_email_not_empty check (trim(email) <> '')
);

comment on table public.users is 'Athletyx user records; user_id is immutable after insert.';
comment on column public.users.user_id is 'Primary key (UUIDv4 via uuid-ossp); cannot be updated.';
comment on column public.users.email is 'Unique login / contact email.';

create index if not exists idx_users_email on public.users (email);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.users_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_touch_updated_at on public.users;
create trigger users_touch_updated_at
  before update on public.users
  for each row
  execute function public.users_touch_updated_at();

-- ---------------------------------------------------------------------------
-- Immutability: user_id cannot change after insert
-- ---------------------------------------------------------------------------
create or replace function public.users_prevent_user_id_update()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'user_id is immutable and cannot be modified'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists users_prevent_user_id_update on public.users;
create trigger users_prevent_user_id_update
  before update on public.users
  for each row
  execute function public.users_prevent_user_id_update();

-- ---------------------------------------------------------------------------
-- Row Level Security (optional for app; service role / local MCP bypasses)
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;

create policy "Users can read own row"
  on public.users
  for select
  using (auth.uid() = user_id);

create policy "Users can update own row (email only in practice)"
  on public.users
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can insert own row"
  on public.users
  for insert
  with check (auth.uid() = user_id);

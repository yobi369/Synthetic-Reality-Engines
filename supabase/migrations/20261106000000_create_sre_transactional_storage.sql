-- Synthetic Reality Engines: transactional Supabase/PostgreSQL storage.
-- Apply only to the dedicated Synthetic-Reality-Engines-DB project.
create table if not exists public.sre_users (
  id text primary key,
  email text not null,
  password_salt text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists sre_users_email_lower_uidx on public.sre_users (lower(email));

create table if not exists public.sre_sessions (
  token_hash text primary key,
  user_id text not null references public.sre_users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists sre_sessions_user_idx on public.sre_sessions(user_id);
create index if not exists sre_sessions_expiry_idx on public.sre_sessions(expires_at);

create table if not exists public.sre_runs (
  id text not null,
  owner_id text not null references public.sre_users(id) on delete cascade,
  name text not null,
  preset text not null,
  seed bigint not null check (seed between 0 and 4294967295),
  tick bigint not null check (tick >= 0),
  snapshot jsonb not null,
  manifest jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id)
);
create index if not exists sre_runs_owner_updated_idx on public.sre_runs(owner_id, updated_at desc);

create table if not exists public.sre_interventions (
  id text not null,
  run_id text not null,
  owner_id text not null,
  tick bigint not null check (tick >= 0),
  epoch bigint not null check (epoch >= 1),
  action text not null check (action ~ '^[a-z][a-z0-9_.-]{1,79}$'),
  parameters jsonb not null check (jsonb_typeof(parameters) = 'object'),
  recorded_at timestamptz not null default now(),
  primary key (owner_id, run_id, id),
  constraint sre_interventions_run_owner_fk
    foreign key (owner_id, run_id) references public.sre_runs(owner_id, id) on delete cascade
);
create index if not exists sre_interventions_run_tick_idx on public.sre_interventions(owner_id, run_id, tick, recorded_at);

alter table public.sre_users enable row level security;
alter table public.sre_sessions enable row level security;
alter table public.sre_runs enable row level security;
alter table public.sre_interventions enable row level security;

revoke all on public.sre_users, public.sre_sessions, public.sre_runs, public.sre_interventions from anon, authenticated;
grant all on public.sre_users, public.sre_sessions, public.sre_runs, public.sre_interventions to service_role;

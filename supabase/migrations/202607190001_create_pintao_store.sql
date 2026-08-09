create table if not exists public.pintao_store (
  id smallint primary key check (id = 1),
  data jsonb not null,
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.pintao_sessions (
  token_hash text primary key,
  role text not null check (role in ('admin', 'customer')),
  user_id uuid,
  email text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists pintao_sessions_expires_at_idx
  on public.pintao_sessions (expires_at);

create table if not exists public.pintao_admin_users (
  email text primary key,
  password_salt text not null,
  password_hash text not null,
  password_iterations integer not null default 210000,
  created_at timestamptz not null default now()
);

create table if not exists public.pintao_login_attempts (
  attempt_key text primary key,
  attempt_count integer not null default 0,
  window_started timestamptz not null default now()
);

alter table public.pintao_store enable row level security;
alter table public.pintao_sessions enable row level security;
alter table public.pintao_admin_users enable row level security;
alter table public.pintao_login_attempts enable row level security;

revoke all on table public.pintao_store from anon, authenticated;
revoke all on table public.pintao_sessions from anon, authenticated;
revoke all on table public.pintao_admin_users from anon, authenticated;
revoke all on table public.pintao_login_attempts from anon, authenticated;

grant select, insert, update on table public.pintao_store to service_role;
grant select, insert, update, delete on table public.pintao_sessions to service_role;
grant select on table public.pintao_admin_users to service_role;
grant select, insert, update, delete on table public.pintao_login_attempts to service_role;


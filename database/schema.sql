-- Schema sugerido para Supabase/PostgreSQL.
-- Não armazene PAN completo, CVV, senha ou token de autenticação de cartão.

create table if not exists bin_cache (
  id uuid primary key default gen_random_uuid(),
  bin text not null unique,
  bin_length int not null check (bin_length in (6, 8)),
  scheme text,
  brand text,
  type text,
  category text,
  country text,
  bank text,
  source text,
  confidence text,
  raw_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists idx_bin_cache_expires_at on bin_cache(expires_at);

create table if not exists query_logs (
  id uuid primary key default gen_random_uuid(),
  bin text,
  last4 text,
  masked text,
  luhn_valid boolean,
  brand_detected text,
  source text,
  response_ms int,
  ip_hash text,
  user_agent_hash text,
  status text,
  created_at timestamptz not null default now()
);

create index if not exists idx_query_logs_created_at on query_logs(created_at desc);
create index if not exists idx_query_logs_bin on query_logs(bin);

create table if not exists api_providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_url text,
  priority int not null default 100,
  enabled boolean not null default true,
  timeout_ms int not null default 5000,
  daily_limit int,
  fail_count int not null default 0,
  last_error_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  role text not null default 'admin',
  password_hash text not null,
  mfa_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references admin_users(id),
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- Exemplo de política de limpeza de logs antigos:
-- delete from query_logs where created_at < now() - interval '90 days';

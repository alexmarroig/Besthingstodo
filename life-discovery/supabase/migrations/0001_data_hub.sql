create table if not exists public.source_feeds (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  source_type text not null check (source_type in ('rss', 'api', 'manual')),
  domain text not null,
  base_url text not null,
  city text not null default 'São Paulo',
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.raw_items (
  id uuid primary key default gen_random_uuid(),
  source_key text not null references public.source_feeds(source_key) on update cascade on delete cascade,
  external_id text,
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);

create table if not exists public.normalized_recommendations (
  id uuid primary key default gen_random_uuid(),
  external_key text not null unique,
  domain text not null,
  city text not null default 'São Paulo',
  title text not null,
  description text,
  category text,
  tags text[] not null default '{}',
  source text,
  editorial_source text,
  image_url text,
  cta_url text,
  payload jsonb not null default '{}'::jsonb,
  quality_score int,
  updated_at timestamptz not null default now()
);

create table if not exists public.couple_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  city text not null default 'São Paulo',
  neighborhood text,
  profile jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_recommendation_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  domain text not null,
  city text not null default 'São Paulo',
  item_count int not null default 0,
  payload jsonb not null default '[]'::jsonb,
  ingestion_run_id uuid,
  created_at timestamptz not null default now(),
  unique (snapshot_date, domain, city)
);

create table if not exists public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  run_date date not null,
  status text not null check (status in ('started', 'ok', 'failed')),
  stats jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists idx_raw_items_source_fetched_at on public.raw_items(source_key, fetched_at desc);
create index if not exists idx_normalized_recommendations_domain_city on public.normalized_recommendations(domain, city);
create index if not exists idx_daily_snapshots_domain_city_date on public.daily_recommendation_snapshots(domain, city, snapshot_date desc);

alter table public.source_feeds enable row level security;
alter table public.raw_items enable row level security;
alter table public.normalized_recommendations enable row level security;
alter table public.couple_profiles enable row level security;
alter table public.daily_recommendation_snapshots enable row level security;
alter table public.ingestion_runs enable row level security;

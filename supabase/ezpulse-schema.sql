-- ezpulse · Supabase (Postgres) schema
-- Frontend: GitHub Pages (static). Run this in the Supabase SQL editor,
-- then set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY as GitHub Actions secrets or local env values.

-- ─── Device-synced watchlists (no accounts; anonymous device ids) ───
create table if not exists public.watchlists (
  device_id  text primary key,
  cas        jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

-- ─── Feature-board votes ───
create table if not exists public.feature_votes (
  device_id  text not null,
  feature_id text not null,
  created_at timestamptz not null default now(),
  primary key (device_id, feature_id)
);

-- Public aggregate view (safe to expose)
create or replace view public.feature_vote_counts as
  select feature_id, count(*)::int as votes
  from public.feature_votes group by feature_id;

-- ─── Alert subscriptions (email delivery for the Track pillar) ───
create table if not exists public.alert_subscriptions (
  email      text primary key,
  cas        jsonb not null default '[]',
  device_id  text,
  created_at timestamptz not null default now()
);

-- ─── Row Level Security ───
alter table public.watchlists          enable row level security;
alter table public.feature_votes       enable row level security;
alter table public.alert_subscriptions enable row level security;

-- Watchlists: devices manage their own row (device_id acts as capability token)
create policy "anon upsert own watchlist" on public.watchlists
  for insert to anon with check (true);
create policy "anon update own watchlist" on public.watchlists
  for update to anon using (true);
create policy "anon read own watchlist" on public.watchlists
  for select to anon using (true);

-- Votes: insert/delete own, read aggregate only via the view
create policy "anon insert vote" on public.feature_votes
  for insert to anon with check (true);
create policy "anon delete own vote" on public.feature_votes
  for delete to anon using (true);
create policy "anon read votes" on public.feature_votes
  for select to anon using (true);

-- Alert subscriptions: write-only from the client (no reading other emails)
create policy "anon subscribe" on public.alert_subscriptions
  for insert to anon with check (true);
create policy "anon update own subscription" on public.alert_subscriptions
  for update to anon using (true);

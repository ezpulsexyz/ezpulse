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

-- ─── Price history: the data moat ───
-- Written every 15 min by the snapshot Edge Function (service role only).
create table if not exists public.price_snapshots (
  id            bigint generated always as identity primary key,
  ca            text not null,
  ts            timestamptz not null default now(),
  price_usd     double precision not null,
  mcap          double precision not null default 0,
  liquidity     double precision not null default 0,
  volume24h     double precision not null default 0,
  holder_count  int,
  bonding_curve double precision
);
create index if not exists price_snapshots_ca_ts on public.price_snapshots (ca, ts desc);

-- ─── Signal track record ───
-- Directional signals (WHALE, MOMENTUM, VOLUME, LIQUIDITY, RANK, LAUNCH) are
-- archived by the snapshot cron; outcomes resolved at +24h against price_snapshots.
create table if not exists public.signal_events (
  id          bigint generated always as identity primary key,
  ca          text not null,
  symbol      text not null,
  kind        text not null,
  strength    text not null,
  title       text not null,
  ts          timestamptz not null default now(),
  price_at    double precision not null,
  mcap_at     double precision not null default 0,
  resolved    boolean not null default false,
  price_24h   double precision,
  change_24h  double precision,
  hit         boolean
);
create index if not exists signal_events_ca_ts on public.signal_events (ca, ts desc);
create index if not exists signal_events_open on public.signal_events (resolved, ts) where resolved = false;

-- Public accuracy aggregate (safe to expose)
create or replace view public.signal_accuracy as
  select kind, strength,
         count(*)::int as total,
         count(*) filter (where hit)::int as hits,
         round(avg(change_24h)::numeric, 2) as avg_change_24h
  from public.signal_events
  where resolved
  group by kind, strength;

alter table public.price_snapshots enable row level security;
alter table public.signal_events   enable row level security;

-- Read-only for everyone; writes come only from the service-role Edge Function.
create policy "anon read snapshots" on public.price_snapshots for select to anon using (true);
create policy "anon read signals"   on public.signal_events   for select to anon using (true);

-- ─── Alert subscriptions (email delivery for the Track pillar) ───
create table if not exists public.alert_subscriptions (
  email      text primary key,
  cas        jsonb not null default '[]',
  device_id  text,
  created_at timestamptz not null default now()
);

-- ─── Community investor theses ───
create table if not exists public.investor_theses (
  id             uuid primary key default gen_random_uuid(),
  token_ca       text not null,
  wallet_address text not null,
  verdict        text not null check (verdict in ('Bullish', 'Bearish', 'Neutral')),
  content        text not null,
  key_points     jsonb not null default '[]',
  upvotes        int not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists investor_theses_token_ca on public.investor_theses (token_ca, created_at desc);

-- One upvote per wallet per thesis
create table if not exists public.thesis_votes (
  thesis_id      uuid not null references public.investor_theses(id) on delete cascade,
  wallet_address text not null,
  created_at     timestamptz not null default now(),
  primary key (thesis_id, wallet_address)
);
create index if not exists thesis_votes_wallet on public.thesis_votes (wallet_address);

create or replace function public.increment_upvotes(thesis_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.investor_theses
  set upvotes = upvotes + 1
  where id = thesis_id;
end;
$$;

grant execute on function public.increment_upvotes(uuid) to anon;

create or replace function public.get_recent_theses_count(
  p_token_ca text,
  p_days integer default 7
)
returns integer
language sql
stable
set search_path = public
as $$
  select count(*)::integer
  from public.investor_theses
  where token_ca = p_token_ca
    and created_at >= now() - (p_days || ' days')::interval;
$$;

grant execute on function public.get_recent_theses_count(text, integer) to anon;

-- ─── Row Level Security ───
alter table public.watchlists          enable row level security;
alter table public.feature_votes       enable row level security;
alter table public.alert_subscriptions enable row level security;
alter table public.investor_theses       enable row level security;
alter table public.thesis_votes          enable row level security;

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

-- Investor theses: public read, anon insert (wallet is self-declared)
create policy "anon read theses" on public.investor_theses
  for select to anon using (true);
create policy "anon insert thesis" on public.investor_theses
  for insert to anon with check (true);

-- Thesis upvotes: public read, anon insert (wallet is self-declared)
create policy "anon read thesis votes" on public.thesis_votes
  for select to anon using (true);
create policy "anon insert thesis vote" on public.thesis_votes
  for insert to anon with check (true);

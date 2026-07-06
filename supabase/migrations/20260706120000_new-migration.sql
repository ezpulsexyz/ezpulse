-- Price history: recorded by the snapshot Edge Function
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

-- Signal archive and 24h resolution
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

create or replace view public.signal_accuracy as
select kind, strength,
       count(*)::int as total,
       count(*) filter (where hit)::int as hits,
       round(avg(change_24h)::numeric, 2) as avg_change_24h
from public.signal_events
where resolved
group by kind, strength;

alter table public.price_snapshots enable row level security;
alter table public.signal_events enable row level security;

create policy "anon read snapshots" on public.price_snapshots
  for select to anon using (true);
create policy "anon read signals" on public.signal_events
  for select to anon using (true);

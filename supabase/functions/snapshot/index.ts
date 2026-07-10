// ezpulse · snapshot Edge Function
// Runs on a schedule (every 15 min). Records price snapshots for every live
// Kickstart token, archives newly fired signals, and resolves 24h outcomes.
//
// Deploy:  supabase functions deploy snapshot --no-verify-jwt
// Schedule (SQL editor):
//   select cron.schedule('ezpulse-snapshot', '*/15 * * * *',
//     $$ select net.http_post(
//          url    := 'https://<PROJECT>.supabase.co/functions/v1/snapshot',
//          headers:= '{"Authorization": "Bearer <ANON_KEY>"}'::jsonb ) $$);
// (Enable the pg_cron and pg_net extensions first: Database → Extensions.)

import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  archivableSignals,
  priceAtTarget,
  signalHit,
  type SignalMetrics,
} from "../../../shared/signals-core.ts";

type Rec = Record<string, unknown>;

const num = (v: unknown) => {
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && isFinite(Number(v))) return Number(v);
  return 0;
};

function pairLiquidity(pair: Rec): number {
  const liq = pair.liquidity as Rec | undefined;
  return num(liq?.usd);
}

function tokenCaFromPair(pair: Rec): string {
  const base = pair.baseToken as Rec | undefined;
  return typeof base?.address === "string" ? (base.address as string) : "";
}

function bestPairPerToken(pairs: Rec[]): Map<string, Rec> {
  const best = new Map<string, Rec>();
  for (const pair of pairs) {
    if (pair.chainId !== "solana") continue;
    const ca = tokenCaFromPair(pair).toLowerCase();
    if (!ca) continue;
    const existing = best.get(ca);
    if (!existing || pairLiquidity(pair) > pairLiquidity(existing)) best.set(ca, pair);
  }
  return best;
}

function snapFromPair(p: Rec): Snap | null {
  const base = p.baseToken as Rec | undefined;
  const ca = String(base?.address ?? "");
  if (!ca) return null;
  const pc = p.priceChange as Rec | undefined;
  const vol = p.volume as Rec | undefined;
  const tx = p.txns as Rec | undefined;
  const t24 = tx?.h24 as Rec | undefined;
  const t1 = tx?.h1 as Rec | undefined;
  const created = p.pairCreatedAt;
  return {
    ca,
    symbol: String(base?.symbol ?? "?"),
    price: num(p.priceUsd),
    mcap: num(p.fdv) || num(p.marketCap),
    liquidity: num((p.liquidity as Rec)?.usd),
    volume24h: num(vol?.h24),
    volume1h: num(vol?.h1),
    change24h: num(pc?.h24),
    buys24h: num(t24?.buys),
    sells24h: num(t24?.sells),
    buys1h: num(t1?.buys),
    sells1h: num(t1?.sells),
    holders: null,
    curve: null,
    graduated: false,
    pairCreatedAt: typeof created === "number" ? created : null,
    hasX: false,
  };
}

const TRACKED_CAS = [
  "FKshTXX4wUcirV9b4LhLrNP4cxAsA2VBAFdMEw5EASY",
  "bS532krUcXBMNqXURPtGqYA7dhEsenYe2z9QKkcEASY",
  "12z7AWnW5Q8mAS9qFtCWnnMdhNvqScZHe8w627EfEASY",
  "iu3A7azWTm3zQSk81SUC1JctB4zPYnxLmcmqq71EASY",
  "6gnvghh8LKoM59p1WZSuTgYmdJrnZnhU7BzCcEaEASY",
  "EhkrQGCnGfVSJc118G1r1S9pxdFdPWJuSyz1iYKEASY",
  "9ufM9TJd1UEmi9awnGfxCkCHAgQ3JZ5Sw6YxeSeEASY",
  "VtZmMdFowJcaXAqaW951RVuH84WeLTQxfs83XZWEASY",
];

interface Snap {
  ca: string;
  symbol: string;
  price: number;
  mcap: number;
  liquidity: number;
  volume24h: number;
  volume1h: number;
  change24h: number;
  buys24h: number;
  sells24h: number;
  buys1h: number;
  sells1h: number;
  holders: number | null;
  curve: number | null;
  graduated: boolean;
  pairCreatedAt: number | null;
  hasX: boolean;
}

async function fetchFeed(): Promise<Snap[]> {
  const found = new Map<string, Snap>();

  for (const url of [
    "https://datapi.jup.ag/v1/pools/toptraded/24h?launchpads=easya-kickstart",
    "https://datapi.jup.ag/v1/pools/recent?launchpads=easya-kickstart",
  ]) {
    try {
      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (!res.ok) continue;
      const pools = ((await res.json()) as Rec).pools as Rec[] ?? [];
      for (const pool of pools) {
        const a = pool.baseAsset as Rec | undefined;
        if (!a || a.launchpad !== "easya-kickstart") continue;
        const ca = String(a.id ?? "");
        if (!ca) continue;
        const s24 = a.stats24h as Rec | undefined;
        const s1 = a.stats1h as Rec | undefined;
        const created = a.createdAt ?? pool.createdAt;
        found.set(ca.toLowerCase(), {
          ca,
          symbol: String(a.symbol ?? "?"),
          price: num(a.usdPrice),
          mcap: num(a.mcap) || num(a.fdv),
          liquidity: num(a.liquidity),
          volume24h: num(s24?.buyVolume) + num(s24?.sellVolume),
          volume1h: num(s1?.buyVolume) + num(s1?.sellVolume),
          change24h: num(s24?.priceChange),
          buys24h: num(s24?.numBuys),
          sells24h: num(s24?.numSells),
          buys1h: num(s1?.numBuys),
          sells1h: num(s1?.numSells),
          holders: typeof a.holderCount === "number" ? a.holderCount : null,
          curve: typeof a.bondingCurve === "number" ? a.bondingCurve : null,
          graduated: typeof a.graduatedAt === "string",
          pairCreatedAt: typeof created === "string" ? Date.parse(created) : typeof created === "number" ? created : null,
          hasX: typeof a.twitter === "string" && a.twitter.length > 0,
        });
      }
    } catch {
      /* next source */
    }
  }

  const missing = TRACKED_CAS.filter((ca) => !found.has(ca.toLowerCase()));
  if (missing.length) {
    try {
      const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${missing.join(",")}`);
      if (res.ok) {
        const pairs = ((await res.json()) as Rec).pairs as Rec[] ?? [];
        for (const p of bestPairPerToken(pairs).values()) {
          const snap = snapFromPair(p);
          if (!snap || found.has(snap.ca.toLowerCase())) continue;
          found.set(snap.ca.toLowerCase(), snap);
        }
      }
    } catch {
      /* proceed */
    }
  }

  return [...found.values()].filter((s) => s.price > 0);
}

const LAUNCH_KINDS = new Set(["NEW_LAUNCH", "GRADUATED", "BONDING_CURVE_COMPLETED", "LAUNCH"]);

type SignalEvent = {
  ca: string;
  symbol: string;
  kind: string;
  strength: string;
  title: string;
  price_at: number;
  mcap_at: number;
  change_24h: number;
};

async function notifyTelegram(event: SignalEvent): Promise<boolean> {
  const base = Deno.env.get("SUPABASE_URL");
  if (!base) return false;

  const fn = LAUNCH_KINDS.has(event.kind)
    ? "send-new-launch-to-telegram"
    : "send-signal-to-telegram";

  try {
    const res = await fetch(`${base}/functions/v1/${fn}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "INSERT",
        table: "signal_events",
        record: event,
      }),
    });
    if (!res.ok) {
      console.error(`Telegram ${fn} failed:`, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error(`Telegram ${fn} error:`, err);
    return false;
  }
}

function toMetrics(s: Snap, rank: number, _avgTurnover: number): SignalMetrics {
  const pairAgeDays = s.pairCreatedAt ? (Date.now() - s.pairCreatedAt) / 86400000 : undefined;
  return {
    symbol: s.symbol,
    mcap: s.mcap,
    change24h: s.change24h,
    volume24h: s.volume24h,
    volume1h: s.volume1h,
    liquidity: s.liquidity,
    buys24h: s.buys24h,
    sells24h: s.sells24h,
    buys1h: s.buys1h,
    sells1h: s.sells1h,
    rank,
    verified: s.hasX,
    pairAgeDays,
  };
}

Deno.serve(async () => {
  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const feed = await fetchFeed();
  if (!feed.length) return new Response(JSON.stringify({ ok: false, reason: "empty feed" }), { status: 200 });

  await db.from("price_snapshots").insert(
    feed.map((s) => ({
      ca: s.ca,
      price_usd: s.price,
      mcap: s.mcap,
      liquidity: s.liquidity,
      volume24h: s.volume24h,
      holder_count: s.holders,
      bonding_curve: s.curve,
    })),
  );

  const ranked = [...feed].sort((a, b) => b.mcap - a.mcap);
  const avgTurnover = feed.length
    ? feed.reduce((sum, s) => sum + (s.mcap > 0 ? s.volume24h / s.mcap : 0), 0) / feed.length
    : 0.15;

  const { data: recent } = await db.from("signal_events")
    .select("ca, kind, strength")
    .gte("ts", new Date(Date.now() - 24 * 3600_000).toISOString());
  const seen = new Set((recent ?? []).map((r) => `${r.ca}:${r.kind}:${r.strength}`));

  const events = feed.flatMap((s) => {
    const rank = ranked.findIndex((x) => x.ca.toLowerCase() === s.ca.toLowerCase()) + 1;
    const m = toMetrics(s, rank, avgTurnover);
    return archivableSignals(s.ca, m, { avgTurnover })
      .filter((e) => !seen.has(e.key))
      .map((e) => ({
        ca: s.ca,
        symbol: s.symbol,
        kind: e.kind,
        strength: e.strength,
        title: e.title,
        price_at: s.price,
        mcap_at: s.mcap,
        change_24h: s.change24h,
      }));
  });

  let telegramSent = 0;
  if (events.length) {
    await db.from("signal_events").insert(events);
    for (const event of events) {
      if (await notifyTelegram(event)) telegramSent++;
    }
  }

  const { data: open } = await db.from("signal_events")
    .select("id, ca, strength, price_at, ts")
    .eq("resolved", false)
    .lte("ts", new Date(Date.now() - 24 * 3600_000).toISOString())
    .limit(100);

  let resolved = 0;
  for (const ev of open ?? []) {
    const firedAt = Date.parse(String(ev.ts));
    const targetTs = firedAt + 24 * 3600_000;

    const { data: snaps } = await db.from("price_snapshots")
      .select("ts, price_usd")
      .eq("ca", ev.ca)
      .gte("ts", new Date(firedAt).toISOString())
      .lte("ts", new Date(targetTs + 3 * 3600_000).toISOString())
      .order("ts", { ascending: true });

    const snapPrices = (snaps ?? []).map((r) => ({
      ts: Date.parse(String(r.ts)),
      price: Number(r.price_usd),
    }));

    let price24h = priceAtTarget(snapPrices, targetTs);
    if (price24h === null) {
      const now = feed.find((s) => s.ca.toLowerCase() === String(ev.ca).toLowerCase());
      if (!now || !ev.price_at) continue;
      price24h = now.price;
    }

    const change = ((price24h - Number(ev.price_at)) / Number(ev.price_at)) * 100;
    const hit = signalHit(String(ev.strength) as "BULLISH" | "BEARISH" | "NEUTRAL", change);
    await db.from("signal_events").update({
      resolved: true,
      price_24h: price24h,
      change_24h: change,
      hit,
    }).eq("id", ev.id);
    resolved++;
  }

  return new Response(JSON.stringify({
    ok: true,
    tokens: feed.length,
    signals: events.length,
    telegramSent,
    resolved,
  }), {
    headers: { "content-type": "application/json" },
  });
});
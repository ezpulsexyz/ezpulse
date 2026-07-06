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

type Rec = Record<string, unknown>;

const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : 0);

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
}

async function fetchFeed(): Promise<Snap[]> {
  const found = new Map<string, Snap>();

  // Jupiter — canonical, launchpad-tagged
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
        });
      }
    } catch {
      /* next source */
    }
  }

  // DexScreener — fill tracked CAs Jupiter missed
  const missing = TRACKED_CAS.filter((ca) => !found.has(ca.toLowerCase()));
  if (missing.length) {
    try {
      const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${missing.join(",")}`);
      if (res.ok) {
        const pairs = ((await res.json()) as Rec).pairs as Rec[] ?? [];
        for (const p of pairs) {
          if (p.chainId !== "solana") continue;
          const base = p.baseToken as Rec | undefined;
          const ca = String(base?.address ?? "");
          if (!ca || found.has(ca.toLowerCase())) continue;
          const pc = p.priceChange as Rec | undefined;
          const vol = p.volume as Rec | undefined;
          const tx = p.txns as Rec | undefined;
          const t24 = tx?.h24 as Rec | undefined;
          const t1 = tx?.h1 as Rec | undefined;
          found.set(ca.toLowerCase(), {
            ca,
            symbol: String(base?.symbol ?? "?"),
            price: p.priceUsd ? parseFloat(String(p.priceUsd)) : 0,
            mcap: num(p.marketCap),
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
          });
        }
      }
    } catch {
      /* proceed with what we have */
    }
  }

  return [...found.values()].filter((s) => s.price > 0);
}

/** Mirror of the app's signal thresholds — deterministic, same inputs. */
function fireSignals(s: Snap): { kind: string; strength: string; title: string }[] {
  const out: { kind: string; strength: string; title: string }[] = [];
  const turnover = s.mcap > 0 ? s.volume24h / s.mcap : 0;
  const trades = s.buys24h + s.sells24h;
  const avgClip = trades > 0 ? s.volume24h / trades : 0;
  const flow = trades > 0 ? (s.buys24h - s.sells24h) / trades : 0;
  const burst = s.volume1h > 0 && s.volume24h > 0 && s.volume1h >= s.volume24h * 0.25;

  if (burst && (s.buys1h > s.sells1h * 2 || s.sells1h > s.buys1h * 2)) {
    const buying = s.buys1h >= s.sells1h;
    out.push({
      kind: "WHALE",
      strength: buying ? "BULLISH" : "BEARISH",
      title: `Whale ${buying ? "accumulation" : "exit"} burst on $${s.symbol}`,
    });
  } else if (avgClip >= 400 && Math.abs(flow) >= 0.25) {
    out.push({
      kind: "WHALE",
      strength: flow > 0 ? "BULLISH" : "BEARISH",
      title: `Large ${flow > 0 ? "buyers" : "sellers"} active on $${s.symbol}`,
    });
  }

  if (s.change24h >= 15) {
    out.push({ kind: "MOMENTUM", strength: "BULLISH", title: `+${s.change24h.toFixed(1)}% in 24h on $${s.symbol}` });
  } else if (s.change24h <= -15) {
    out.push({ kind: "MOMENTUM", strength: "BEARISH", title: `${s.change24h.toFixed(1)}% drawdown on $${s.symbol}` });
  }

  if (turnover >= 0.3) {
    out.push({ kind: "VOLUME", strength: "BULLISH", title: `Turnover ${(turnover * 100).toFixed(0)}% of cap on $${s.symbol}` });
  }

  return out;
}

Deno.serve(async () => {
  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // service role: RLS bypass for writes
  );

  const feed = await fetchFeed();
  if (!feed.length) return new Response(JSON.stringify({ ok: false, reason: "empty feed" }), { status: 200 });

  // 1 · snapshots
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

  // 2 · fire signals (dedupe: skip if same ca+kind+strength fired in last 24h)
  const { data: recent } = await db.from("signal_events")
    .select("ca, kind, strength")
    .gte("ts", new Date(Date.now() - 24 * 3600_000).toISOString());
  const seen = new Set((recent ?? []).map((r) => `${r.ca}:${r.kind}:${r.strength}`));

  const events = feed.flatMap((s) =>
    fireSignals(s)
      .filter((e) => !seen.has(`${s.ca}:${e.kind}:${e.strength}`))
      .map((e) => ({
        ca: s.ca,
        symbol: s.symbol,
        kind: e.kind,
        strength: e.strength,
        title: e.title,
        price_at: s.price,
        mcap_at: s.mcap,
      })),
  );

  if (events.length) await db.from("signal_events").insert(events);

  // 3 · resolve outcomes: events ≥24h old, unresolved
  const { data: open } = await db.from("signal_events")
    .select("id, ca, strength, price_at")
    .eq("resolved", false)
    .lte("ts", new Date(Date.now() - 24 * 3600_000).toISOString())
    .limit(100);

  let resolved = 0;
  for (const ev of open ?? []) {
    const now = feed.find((s) => s.ca.toLowerCase() === String(ev.ca).toLowerCase());
    if (!now || !ev.price_at) continue;
    const change = ((now.price - Number(ev.price_at)) / Number(ev.price_at)) * 100;
    const hit = ev.strength === "BULLISH" ? change > 0 : change < 0;
    await db.from("signal_events").update({
      resolved: true,
      price_24h: now.price,
      change_24h: change,
      hit,
    }).eq("id", ev.id);
    resolved++;
  }

  return new Response(JSON.stringify({ ok: true, tokens: feed.length, signals: events.length, resolved }), {
    headers: { "content-type": "application/json" },
  });
});

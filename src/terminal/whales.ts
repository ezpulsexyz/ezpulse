import type { LiveLaunch } from "./kickstart";

export interface WhaleTransaction {
  id: string;
  ts: number;
  side: "BUY" | "SELL";
  usd: number;
  wallet: string;
  signature?: string;
  source: "solscan" | "inferred";
}

export interface WhaleFlow {
  token: LiveLaunch;
  thresholdUsd: number;
  txs: WhaleTransaction[];
  buyUsd: number;
  sellUsd: number;
  netUsd: number;
  largestTx: WhaleTransaction | null;
}

type Rec = Record<string, unknown>;

const SOLSCAN_KEY = (import.meta.env?.VITE_SOLSCAN_API_KEY as string | undefined)?.trim();

/** Whale threshold: max($250, 0.5% of mcap) or 3× avg trade size. */
export function whaleThreshold(c: LiveLaunch): number {
  const trades = c.buys24h + c.sells24h;
  const avg = trades > 0 ? c.volume24h / trades : 0;
  const byCap = c.mcap > 0 ? c.mcap * 0.005 : 0;
  return Math.max(250, byCap, avg * 3);
}

async function solscanFetch(path: string): Promise<Rec | Rec[] | null> {
  const headers: Record<string, string> = { accept: "application/json" };
  const base = SOLSCAN_KEY ? "https://pro-api.solscan.io/v2.0" : "https://public-api.solscan.io";
  if (SOLSCAN_KEY) headers.token = SOLSCAN_KEY;
  try {
    const res = await fetch(`${base}${path}`, { headers });
    if (!res.ok) return null;
    return (await res.json()) as Rec | Rec[];
  } catch {
    return null;
  }
}

function shortWallet(w: string): string {
  return w.length > 10 ? `${w.slice(0, 4)}…${w.slice(-4)}` : w;
}

function detRand(seed: string, i: number): number {
  let h = 0;
  for (const ch of `${seed}:${i}`) h = (h * 31 + ch.charCodeAt(0)) % 10000;
  return h / 10000;
}

/** Infer representative whale-scale txs from 24h aggregate flow when per-tx APIs are unavailable. */
function inferWhaleTxs(c: LiveLaunch, threshold: number): WhaleTransaction[] {
  const trades = c.buys24h + c.sells24h;
  if (!trades || !c.volume24h) return [];

  const buyShare = c.buys24h / trades;
  const sellShare = c.sells24h / trades;
  const avg = c.volume24h / trades;
  const whaleCount = Math.min(12, Math.max(2, Math.floor(trades * 0.08)));
  const whaleUsdEach = Math.max(threshold, avg * 2.5);
  const now = Date.now();
  const out: WhaleTransaction[] = [];

  for (let i = 0; i < whaleCount; i++) {
    const side: "BUY" | "SELL" = detRand(c.ca, i) < buyShare ? "BUY" : "SELL";
    const jitter = 0.7 + detRand(c.ca, i + 100) * 0.8;
    const usd = Math.round(whaleUsdEach * jitter);
    const minsAgo = Math.round((i / whaleCount) * 1380 + detRand(c.ca, i + 200) * 60);
    out.push({
      id: `inf-${c.ca}-${i}`,
      ts: now - minsAgo * 60_000,
      side,
      usd,
      wallet: shortWallet(`${c.ca.slice(0, 8)}${i.toString(16)}whale`),
      source: "inferred",
    });
  }

  const buyVol = c.volume24h * buyShare;
  const sellVol = c.volume24h * sellShare;
  const scale = (buyVol + sellVol) / out.reduce((s, t) => s + t.usd, 0) || 1;
  return out
    .map((t) => ({ ...t, usd: Math.round(t.usd * scale * (t.side === "BUY" ? buyShare * 2 : sellShare * 2)) }))
    .filter((t) => t.usd >= threshold * 0.85)
    .sort((a, b) => b.ts - a.ts);
}

function parseSolscanActivities(data: Rec | Rec[] | null, c: LiveLaunch, threshold: number): WhaleTransaction[] | null {
  if (!data) return null;
  const rows = Array.isArray(data)
    ? data
    : Array.isArray((data as Rec).data)
      ? ((data as Rec).data as Rec[])
      : Array.isArray((data as Rec).items)
        ? ((data as Rec).items as Rec[])
        : null;
  if (!rows?.length) return null;

  const out: WhaleTransaction[] = [];
  for (const row of rows) {
    const usd = Number(row.value ?? row.amount_usd ?? row.usd ?? row.total_value ?? 0);
    if (!usd || usd < threshold * 0.7) continue;
    const ts = Number(row.block_time ?? row.blockTime ?? row.time ?? row.timestamp ?? 0) * (Number(row.block_time) < 1e12 ? 1000 : 1);
    const sideRaw = String(row.activity_type ?? row.type ?? row.side ?? row.trade_type ?? "").toLowerCase();
    const side: "BUY" | "SELL" = sideRaw.includes("sell") || sideRaw.includes("out") ? "SELL" : "BUY";
    const wallet = String(row.from_address ?? row.owner ?? row.wallet ?? row.signer ?? row.address ?? "unknown");
    const sig = String(row.trans_id ?? row.tx_hash ?? row.signature ?? row.hash ?? "");
    out.push({
      id: sig || `sc-${out.length}`,
      ts: ts || Date.now(),
      side,
      usd,
      wallet: shortWallet(wallet),
      signature: sig || undefined,
      source: "solscan",
    });
  }
  return out.length ? out.sort((a, b) => b.ts - a.ts).slice(0, 24) : null;
}

/** Fetch recent whale-scale swaps for a token; falls back to flow inference from DexScreener aggregates. */
export async function fetchWhaleTransactions(c: LiveLaunch): Promise<WhaleFlow> {
  const thresholdUsd = whaleThreshold(c);

  const paths = SOLSCAN_KEY
    ? [`/token/defi/activities?address=${c.ca}&page=1&page_size=30`, `/token/transfer?address=${c.ca}&page=1&page_size=30`]
    : [`/token/defi/activities?address=${c.ca}`, `/token/transfer/txs?token_address=${c.ca}&offset=0&size=30`];

  let txs: WhaleTransaction[] | null = null;
  for (const path of paths) {
    txs = parseSolscanActivities(await solscanFetch(path), c, thresholdUsd);
    if (txs?.length) break;
  }

  const finalTxs = txs?.length ? txs : inferWhaleTxs(c, thresholdUsd);
  const buyUsd = finalTxs.filter((t) => t.side === "BUY").reduce((s, t) => s + t.usd, 0);
  const sellUsd = finalTxs.filter((t) => t.side === "SELL").reduce((s, t) => s + t.usd, 0);

  return {
    token: c,
    thresholdUsd,
    txs: finalTxs,
    buyUsd,
    sellUsd,
    netUsd: buyUsd - sellUsd,
    largestTx: finalTxs.length ? finalTxs.reduce((a, b) => (b.usd > a.usd ? b : a)) : null,
  };
}

/** Tokens with active directional whale signals in the feed. */
export function whaleAlertTokens(feed: LiveLaunch[]): LiveLaunch[] {
  return feed.filter((c) => {
    const trades = c.buys24h + c.sells24h;
    if (trades < 4 || !c.volume24h) return false;
    const avg = c.volume24h / trades;
    const threshold = whaleThreshold(c);
    if (avg < threshold * 0.5) return false;
    const buyRatio = c.buys24h / trades;
    return buyRatio >= 0.68 || buyRatio <= 0.32;
  });
}
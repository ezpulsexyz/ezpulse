import { Connection, PublicKey } from "@solana/web3.js";
import {
  whaleSignal as coreWhaleSignal,
  signalWeight,
  type SignalKind,
  type SignalStrength,
} from "../../shared/signals-core";

export type { SignalKind, SignalStrength };
export { KIND_ICON, signalHit, archivableSignals } from "../../shared/signals-core";

/**
 * EasyA Kickstart integration — kickstart.easya.io
 *
 * ALUMNI: real success stories imported from kickstart.easya.io (static content).
 * fetchLiveFeed(): live Kickstart tokens only — Solana tokens whose contract
 * address ends in the "EASY" vanity suffix (Kickstart's on-chain fingerprint)
 * or whose website links to kickstart.easya.io. Market data via the
 * DexScreener public API (CORS-enabled), ranked by market cap.
 */

export interface Alumni {
  name: string;
  outcome: string;      // headline result
  valuationUsd?: number;
  raisedUsd?: number;
  backers?: string[];
  origin: string;       // which EasyA hackathon
  now: string;          // what they became
  tag: "UNICORN-TRACK" | "YC" | "FUNDED" | "SHIPPED";
}

export const ALUMNI: Alumni[] = [
  {
    name: "Cognition AI", outcome: "$26B valuation", valuationUsd: 26_000_000_000,
    backers: ["Founders Fund", "8VC"], tag: "UNICORN-TRACK",
    origin: "Pitched decentralized AI at EasyA's Harvard hackathon (2022) — won top prize.",
    now: "Raised $1B+ at a $26B valuation building Devin, the world's first AI software engineer.",
  },
  {
    name: "Listen Labs", outcome: "$500M valuation", valuationUsd: 500_000_000, raisedUsd: 69_000_000,
    backers: ["Sequoia Capital", "Ribbit Capital"], tag: "UNICORN-TRACK",
    origin: "Won a top prize at EasyA's Hack Boston at Harvard (2022).",
    now: "Raised a $69M Series B; AI customer interviews for Microsoft, Canva and Perplexity.",
  },
  {
    name: "BlindPay", outcome: "YC W25 · $3.3M", raisedUsd: 3_300_000,
    backers: ["Y Combinator", "Circle", "Jawed Karim"], tag: "YC",
    origin: "Built a stablecoin off-ramp at the EasyA Consensus Hackathon, Austin.",
    now: "$125M+ processed across 100+ countries.",
  },
  {
    name: "Gecko Security", outcome: "YC-backed",
    backers: ["Y Combinator"], tag: "YC",
    origin: "Won multiple EasyA hackathons in London, Austin and at Harvard.",
    now: "Tools that let developers ship secure code fast.",
  },
  {
    name: "Axal", outcome: "$2.5M raised", raisedUsd: 2_500_000,
    backers: ["a16z CSS"], tag: "FUNDED",
    origin: "Won top prize at EasyA's Hack Web3 at Harvard.",
    now: "Raised $2.5M three months after graduating; a16z Crypto Startup School.",
  },
  {
    name: "MintStars", outcome: "$600K raised", raisedUsd: 600_000,
    backers: ["Polygon Labs", "SpankChain"], tag: "FUNDED",
    origin: "Won a top pitch prize at EasyA's Hack Boston at Harvard (2022).",
    now: "Crypto-native creator platform; creators keep 100% via USDC.",
  },
  {
    name: "RMD", outcome: "$150K grant + seed",
    backers: ["Draper University"], tag: "FUNDED",
    origin: "Pitched at the EasyA Consensus Hackathon, Austin (2024) — won a $150K grant.",
    now: "Closed a seed round; building the future of Web3 onboarding.",
  },
  {
    name: "Spike", outcome: "Product-market fit", tag: "SHIPPED",
    origin: "First pitched at an EasyA hackathon at Harvard.",
    now: "Harvard's most popular prediction market.",
  },
  {
    name: "Xeno", outcome: "Product-market fit", tag: "SHIPPED",
    origin: "First Web3 app built at an EasyA hackathon in London; iterated in SF and Hong Kong.",
    now: "Instant payment rails with stablecoin-powered PoS systems.",
  },
];

/* ─────────────────────────────────────────────────────────────────
 * LIVE FEED — Kickstart tokens only, fetched at runtime
 * A token qualifies iff its contract address ends in "EASY"
 * (Kickstart's vanity suffix) or its website is kickstart.easya.io.
 * Verified live example: FKshTXX4wUcirV9b4LhLrNP4cxAsA2VBAFdMEw5EASY ($EASY).
 * ──────────────────────────────────────────────────────────────── */

export interface LiveLaunch {
  name: string;
  symbol: string;
  ca: string;
  icon?: string;
  description: string;
  priceUsd: number;
  mcap: number;
  change24h: number;
  change1h: number;
  volume24h: number;
  volume1h: number;
  liquidity: number;
  buys24h: number;
  sells24h: number;
  buys1h: number;
  sells1h: number;
  pairCreatedAt?: number;
  /** Real bonding-curve progress (0–100) from Jupiter — present while still on the curve. */
  bondingCurve?: number;
  /** ISO date the token completed its curve and migrated to an AMM pool. */
  graduatedAt?: string;
  holderCount?: number;
  organicScore?: number;
  jupVerified?: boolean;
  circulatingSupply?: number;
  totalSupply?: number;
  maxSupply?: number;
  /** Founder lockup commitment in days (submitted, verified, or on-chain vesting). */
  lockupDays?: number;
  source: "KICKSTART" | "DEXSCREENER";
  links: { website?: string; x?: string; telegram?: string; dexscreener: string };
}

const numeric = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return undefined;
};

const supplyFrom = (...values: unknown[]) => {
  for (const value of values) {
    const parsed = numeric(value);
    if (typeof parsed === "number") return parsed;
  }
  return undefined;
};

const CIRCULATING_SUPPLY_URL = (import.meta.env?.VITE_CIRCULATING_SUPPLY_URL as string | undefined)?.trim();
const SUPABASE_URL = (import.meta.env?.VITE_SUPABASE_URL as string | undefined)?.trim();

type SupplyOverride = {
  circulatingSupply?: number;
  totalSupply?: number;
  maxSupply?: number;
};

const JUPITER_POOL_URLS = [
  "https://datapi.jup.ag/v1/pools/toptraded/24h?launchpads=easya-kickstart",
  "https://datapi.jup.ag/v1/pools/recent?launchpads=easya-kickstart",
  "https://datapi.jup.ag/v1/pools/toptrending/24h?launchpads=easya-kickstart",
];

function supplyFromAsset(asset: Rec): SupplyOverride {
  return {
    circulatingSupply: supplyFrom(asset.circSupply, asset.circulatingSupply, asset.circulating, asset.circ_supply),
    totalSupply: supplyFrom(asset.totalSupply, asset.total_supply),
    maxSupply: supplyFrom(asset.maxSupply, asset.max_supply, asset.totalSupply, asset.total_supply),
  };
}

function supplyEndpoint(): string | null {
  if (CIRCULATING_SUPPLY_URL) return CIRCULATING_SUPPLY_URL;
  if (SUPABASE_URL) return `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/circulating-supply`;
  return null;
}

const overrideKey = (row: Rec | string | undefined): string | null => {
  if (typeof row === "string" && row.trim()) return row.trim().toLowerCase();
  if (typeof row === "object" && row !== null) {
    const rec = row as Rec;
    const key = String(rec.ca ?? rec.address ?? rec.mint ?? rec.token ?? rec.symbol ?? "").trim().toLowerCase();
    return key || null;
  }
  return null;
};

async function fetchJupiterSupplyOverrides(): Promise<Map<string, SupplyOverride>> {
  const overrides = new Map<string, SupplyOverride>();
  for (const url of JUPITER_POOL_URLS) {
    try {
      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (!res.ok) continue;
      const data = (await res.json()) as Rec;
      const pools: Rec[] = Array.isArray(data.pools) ? (data.pools as Rec[]) : [];
      for (const pool of pools) {
        const asset = pool.baseAsset as Rec | undefined;
        if (!asset) continue;
        const ca = String(asset.id ?? asset.address ?? asset.mint ?? "").trim().toLowerCase();
        if (!ca) continue;
        const patch = supplyFromAsset(asset);
        if (patch.circulatingSupply === undefined && patch.totalSupply === undefined && patch.maxSupply === undefined) continue;
        const existing = overrides.get(ca);
        overrides.set(ca, {
          circulatingSupply: patch.circulatingSupply ?? existing?.circulatingSupply,
          totalSupply: patch.totalSupply ?? existing?.totalSupply,
          maxSupply: patch.maxSupply ?? existing?.maxSupply,
        });
        const sym = String(asset.symbol ?? "").trim().toLowerCase();
        if (sym && !overrides.has(sym)) overrides.set(sym, overrides.get(ca)!);
      }
    } catch { /* try next */ }
  }
  return overrides;
}

async function fetchRemoteSupplyOverrides(): Promise<Map<string, SupplyOverride>> {
  const overrides = new Map<string, SupplyOverride>();
  const endpoint = supplyEndpoint();
  if (!endpoint) return overrides;

  try {
    const res = await fetch(endpoint, { headers: { accept: "application/json" } });
    if (!res.ok) return overrides;
    const source = await res.json();
    const rows: Rec[] = Array.isArray(source)
      ? source
      : Array.isArray((source as Rec).data)
        ? (source as Rec).data as Rec[]
        : Array.isArray((source as Rec).launches)
          ? (source as Rec).launches as Rec[]
          : Array.isArray((source as Rec).coins)
            ? (source as Rec).coins as Rec[]
            : [];

    if (rows.length) {
      for (const row of rows) {
        const key = overrideKey(row);
        if (!key) continue;
        const override: SupplyOverride = {
          circulatingSupply: supplyFrom(row.circulatingSupply, row.circulating_supply, row.circSupply, row.circulating),
          totalSupply: supplyFrom(row.totalSupply, row.total_supply, row.maxSupply, row.max_supply, row.total_supply),
          maxSupply: supplyFrom(row.maxSupply, row.max_supply),
        };
        if (override.circulatingSupply !== undefined || override.totalSupply !== undefined || override.maxSupply !== undefined) {
          overrides.set(key, override);
        }
      }
      return overrides;
    }

    for (const [key, value] of Object.entries(source ?? {})) {
      const parsed = value as Rec;
      if (parsed && typeof parsed === "object") {
        const override: SupplyOverride = {
          circulatingSupply: supplyFrom(parsed.circulatingSupply, parsed.circulating_supply, parsed.circSupply, parsed.circulating),
          totalSupply: supplyFrom(parsed.totalSupply, parsed.total_supply, parsed.maxSupply, parsed.max_supply, parsed.total_supply),
          maxSupply: supplyFrom(parsed.maxSupply, parsed.max_supply),
        };
        if (override.circulatingSupply !== undefined || override.totalSupply !== undefined || override.maxSupply !== undefined) {
          overrides.set(key.trim().toLowerCase(), override);
        }
      }
    }
  } catch {
    // Ignore override fetch failures and continue with existing sources.
  }
  return overrides;
}

async function fetchSupplyOverrides(): Promise<Map<string, SupplyOverride>> {
  const [jup, remote] = await Promise.all([fetchJupiterSupplyOverrides(), fetchRemoteSupplyOverrides()]);
  const merged = new Map(jup);
  for (const [key, patch] of remote) {
    const existing = merged.get(key);
    merged.set(key, {
      circulatingSupply: patch.circulatingSupply ?? existing?.circulatingSupply,
      totalSupply: patch.totalSupply ?? existing?.totalSupply,
      maxSupply: patch.maxSupply ?? existing?.maxSupply,
    });
  }
  return merged;
}

const applySupplyOverride = (launch: LiveLaunch, overrides: Map<string, SupplyOverride>): LiveLaunch => {
  const key = launch.ca.toLowerCase();
  const fallback = launch.symbol.toLowerCase();
  const override = overrides.get(key) ?? overrides.get(fallback);
  if (!override) return launch;
  return {
    ...launch,
    circulatingSupply: launch.circulatingSupply ?? override.circulatingSupply,
    totalSupply: launch.totalSupply ?? override.totalSupply,
    maxSupply: launch.maxSupply ?? override.maxSupply,
  };
};

/** Fill circulating / max supply for a single token (Jupiter + optional override endpoint). */
export async function enrichTokenSupply(token: LiveLaunch): Promise<LiveLaunch> {
  const overrides = await fetchSupplyOverrides();
  return applySupplyOverride(token, overrides);
}

/** Graduated = completed the bonding curve (migrated to AMM). */
export const isGraduated = (c: LiveLaunch) => !!c.graduatedAt;
/** Still bonding = on the curve, with live % progress. */
export const isBonding = (c: LiveLaunch) => !c.graduatedAt;

type Rec = Record<string, unknown>;

async function tryKickstartApi(): Promise<LiveLaunch[] | null> {
  for (const url of ["https://kickstart.easya.io/api/launches", "https://kickstart.easya.io/api/coins"]) {
    try {
      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (!res.ok) continue;
      const data = await res.json();
      const arr = Array.isArray(data) ? data : (data as Rec).launches ?? (data as Rec).coins ?? (data as Rec).data;
      if (Array.isArray(arr) && arr.length) {
        return (arr as Rec[]).map((x) => ({
          name: String(x.name ?? "Unknown"),
          symbol: String(x.ticker ?? x.symbol ?? "?"),
          ca: String(x.address ?? x.mint ?? x.ca ?? ""),
          description: String(x.description ?? x.idea ?? ""),
          priceUsd: Number(x.price ?? 0),
          mcap: Number(x.marketCap ?? x.mcap ?? 0),
          change24h: Number(x.change24h ?? 0),
          change1h: 0, volume1h: 0, buys24h: 0, sells24h: 0, buys1h: 0, sells1h: 0,
          volume24h: Number(x.volume24h ?? 0),
          liquidity: Number(x.liquidity ?? 0),
          circulatingSupply: supplyFrom(x.circulatingSupply, x.circulating_supply, x.circSupply, x.circulating),
          totalSupply: supplyFrom(x.totalSupply, x.total_supply, x.maxSupply, x.max_supply, x.total_supply),
          maxSupply: supplyFrom(x.maxSupply, x.max_supply),
          source: "KICKSTART" as const,
          links: { dexscreener: `https://dexscreener.com/solana/${String(x.address ?? x.mint ?? "")}` },
        }));
      }
    } catch { /* try next */ }
  }
  return null;
}

/** Contracts that must never load — impostors / non-Kickstart tokens. */
export const BLOCKED_CAS = new Set<string>([
  "EN2nnxrg8uUi6x2sJkzNPd2eT6rB9rdSoQNNaENA4RZA".toLowerCase(), // not an EasyA Kickstart project
  "DLMmRN9rbZspAAC3a1HgDHMC893Y2Ca9GjoNh9StwnYG".toLowerCase(), // removed — not an EasyA Kickstart project
]);

/** True when a token is a Kickstart launch: vanity CA suffix "EASY" or a kickstart.easya.io website.
 *  Blocked contracts and other launchpads' vanity suffixes (e.g. …BAGS) never qualify. */
function isKickstartToken(ca: string, websites: string[]): boolean {
  if (BLOCKED_CAS.has(ca.toLowerCase())) return false;
  if (/bags$/i.test(ca)) return false; // BAGS launchpad suffix — not Kickstart
  return /easy$/i.test(ca) || websites.some((w) => w.includes("kickstart.easya.io"));
}

/** Merge a DexScreener-sourced launch without clobbering canonical Jupiter records. */
function mergeDex(found: Map<string, LiveLaunch>, launch: LiveLaunch): void {
  const key = launch.ca.toLowerCase();
  const existing = found.get(key);
  if (!existing) { found.set(key, launch); return; }
  if (existing.source === "KICKSTART") return; // Jupiter is canonical — keep it
  if (launch.liquidity > existing.liquidity) found.set(key, launch);
}

function pairToLaunch(pair: Rec): LiveLaunch | null {
  const base = pair.baseToken as Rec | undefined;
  const ca = typeof base?.address === "string" ? (base.address as string) : "";
  if (!ca || BLOCKED_CAS.has(ca.toLowerCase()) || /bags$/i.test(ca)) return null;
  const info = pair.info as Rec | undefined;
  const websites = Array.isArray(info?.websites) ? (info!.websites as Rec[]).map((w) => String(w.url ?? "")) : [];
  const socials = Array.isArray(info?.socials) ? (info!.socials as Rec[]) : [];
  const social = (t: string) => socials.find((s) => s.type === t)?.url as string | undefined;
  const pc = pair.priceChange as Rec | undefined;
  const vol = pair.volume as Rec | undefined;
  const liq = pair.liquidity as Rec | undefined;
  const txns = pair.txns as Rec | undefined;
  const t24 = txns?.h24 as Rec | undefined;
  const t1 = txns?.h1 as Rec | undefined;
  return {
    name: String(base?.name ?? "Unknown"),
    symbol: String(base?.symbol ?? "?"),
    ca,
    icon: typeof info?.imageUrl === "string" ? (info.imageUrl as string) : undefined,
    description: "",
    priceUsd: pair.priceUsd ? parseFloat(String(pair.priceUsd)) : 0,
    mcap: typeof pair.marketCap === "number" ? (pair.marketCap as number) : 0,
    change24h: typeof pc?.h24 === "number" ? (pc.h24 as number) : 0,
    change1h: typeof pc?.h1 === "number" ? (pc.h1 as number) : 0,
    volume24h: typeof vol?.h24 === "number" ? (vol.h24 as number) : 0,
    volume1h: typeof vol?.h1 === "number" ? (vol.h1 as number) : 0,
    buys24h: typeof t24?.buys === "number" ? (t24.buys as number) : 0,
    sells24h: typeof t24?.sells === "number" ? (t24.sells as number) : 0,
    buys1h: typeof t1?.buys === "number" ? (t1.buys as number) : 0,
    sells1h: typeof t1?.sells === "number" ? (t1.sells as number) : 0,
    liquidity: typeof liq?.usd === "number" ? (liq.usd as number) : 0,
    pairCreatedAt: typeof pair.pairCreatedAt === "number" ? (pair.pairCreatedAt as number) : undefined,
    source: "KICKSTART" as const,
    links: {
      website: websites.find((w) => w.includes("kickstart.easya.io")) ?? websites[0],
      x: social("twitter"),
      telegram: social("telegram"),
      dexscreener: typeof pair.url === "string" ? (pair.url as string) : `https://dexscreener.com/solana/${ca}`,
    },
  };
}

/** Curated Kickstart token contract addresses — verified launches tracked explicitly.
 *  (Several link to kickstart.easya.io/token/… on-chain; all trade on Solana.) */
export const TRACKED_CAS: string[] = [
  "FKshTXX4wUcirV9b4LhLrNP4cxAsA2VBAFdMEw5EASY", // easycoin $EASY — verified
  "bS532krUcXBMNqXURPtGqYA7dhEsenYe2z9QKkcEASY", // CapIX Protocol $CPX — verified (Kickstart page on-chain)
  "12z7AWnW5Q8mAS9qFtCWnnMdhNvqScZHe8w627EfEASY", // Varsko Intelligence $VSK — verified
  "iu3A7azWTm3zQSk81SUC1JctB4zPYnxLmcmqq71EASY",  // BIT AGENTS $BITAGENTS — verified (Kickstart page on-chain)
  "6gnvghh8LKoM59p1WZSuTgYmdJrnZnhU7BzCcEaEASY",  // Switch Board $SWCH — bonded
  "EhkrQGCnGfVSJc118G1r1S9pxdFdPWJuSyz1iYKEASY",  // SCOUT AI $SCOUT — bonded
  "5d9VvLtAZQWtyL9EZ3cHWpgdfyeWetwYuiG6746EASY",  // Requested project — tracked in terminal
  "9ufM9TJd1UEmi9awnGfxCkCHAgQ3JZ5Sw6YxeSeEASY",  // Inferra $INFERRA — bonded
  "VtZmMdFowJcaXAqaW951RVuH84WeLTQxfs83XZWEASY", // EZ Screener $EZSCREENER — …EASY suffix
  "y4JiNFzBPofqiCpuDTcVq11nhUDQoDzeK1UBCoXxF9y",  // Covenant Foundation $CVT
  "9iR8Urs95yLeiajX3T6eYK9t4YBcLbrWS8pCKgoPFb7n", // Praxis $PRX
  "AKKAPZBnJnzfE83DspsBSoqGSMwa2haFvoEJj1qzdrmk", // Hyper Intelligent Innovations AI $HIIE — verified
  "4kWysUHVqtFmxrvwPUxA66exm2iJBMkvD4EBRrNmcieL",
  "HtiQmiV4BFkujshs4kro3Ga3pF8ZcfFqMQNnzfdZdgkb",
  "CFRX4w9w2mvhwZAxCPnyTY3PhHTJ9vQgninuXZfH5Wwn",
  "DcTVUogWykX1JeBmTq48Fzj2Lc3Y7zwHQS1CyZ9SHnXf",
  "HA4WtRuNrjtrzAWTTjCyTZn94Jq9ggV6iraW7SndSLyz",
];

/** Fetch live pairs for the curated tracked list (batched, best pair per token by liquidity). */
async function fetchTrackedTokens(found: Map<string, LiveLaunch>): Promise<void> {
  // DexScreener allows up to 30 addresses per call
  for (let i = 0; i < TRACKED_CAS.length; i += 30) {
    const batch = TRACKED_CAS.slice(i, i + 30);
    try {
      const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${batch.join(",")}`, { headers: { accept: "application/json" } });
      if (!res.ok) continue;
      const data = (await res.json()) as Rec;
      const pairs: Rec[] = Array.isArray(data.pairs) ? (data.pairs as Rec[]) : [];
      for (const pair of pairs) {
        if (pair.chainId !== "solana") continue;
        const launch = pairToLaunch(pair);
        if (!launch) continue;
        mergeDex(found, launch);
      }
    } catch { /* batch failed — continue */ }
  }
}

/* ─── Jupiter (jup.ag) — the canonical Kickstart source ───
 * datapi.jup.ag tags every pool with launchpad:"easya-kickstart" and carries the
 * REAL bonding-curve state: graduatedAt when the curve completed, bondingCurve %
 * while still bonding. Plus holder counts, organic scores and Jupiter verification.
 */
function jupPoolToLaunch(pool: Rec): LiveLaunch | null {
  const asset = pool.baseAsset as Rec | undefined;
  if (!asset) return null;
  const ca = typeof asset.id === "string" ? (asset.id as string) : "";
  if (!ca || BLOCKED_CAS.has(ca.toLowerCase())) return null;
  if (asset.launchpad !== "easya-kickstart") return null; // canonical provenance only
  const s24 = asset.stats24h as Rec | undefined;
  const s1 = asset.stats1h as Rec | undefined;
  const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : 0);
  return {
    name: String(asset.name ?? "Unknown"),
    symbol: String(asset.symbol ?? "?"),
    ca,
    icon: typeof asset.icon === "string" ? (asset.icon as string) : undefined,
    description: "",
    priceUsd: num(asset.usdPrice),
    mcap: num(asset.mcap) || num(asset.fdv),
    change24h: num(s24?.priceChange),
    change1h: num(s1?.priceChange),
    volume24h: num(s24?.buyVolume) + num(s24?.sellVolume),
    volume1h: num(s1?.buyVolume) + num(s1?.sellVolume),
    liquidity: num(asset.liquidity) || num(pool.liquidity),
    buys24h: num(s24?.numBuys),
    sells24h: num(s24?.numSells),
    buys1h: num(s1?.numBuys),
    sells1h: num(s1?.numSells),
    pairCreatedAt: typeof asset.createdAt === "string" ? Date.parse(asset.createdAt as string) : undefined,
    bondingCurve: typeof asset.bondingCurve === "number" ? (asset.bondingCurve as number) : undefined,
    graduatedAt: typeof asset.graduatedAt === "string" ? (asset.graduatedAt as string) : undefined,
    holderCount: typeof asset.holderCount === "number" ? (asset.holderCount as number) : undefined,
    organicScore: typeof asset.organicScore === "number" ? (asset.organicScore as number) : undefined,
    jupVerified: asset.isVerified === true,
    ...supplyFromAsset(asset),
    source: "KICKSTART" as const,
    links: {
      website: typeof asset.website === "string" ? (asset.website as string) : undefined,
      x: typeof asset.twitter === "string" ? (asset.twitter as string) : undefined,
      telegram: typeof asset.telegram === "string" ? (asset.telegram as string) : undefined,
      dexscreener: `https://dexscreener.com/solana/${ca}`,
    },
  };
}

/* ─── Meteora DBC — the launchpad's own protocol ───
 * Kickstart launches on Meteora's Dynamic Bonding Curve (metaLaunchpad "met-dbc").
 * Progress = quoteReserve / migration_quote_threshold from pool state. Meteora has
 * no stable public REST API, so we try known endpoints and fall back to Jupiter's
 * aggregated DBC state (which reads the same on-chain pools).
 */
async function enrichFromMeteora(found: Map<string, LiveLaunch>): Promise<void> {
  const bondingTokens = [...found.values()].filter((c) => !c.graduatedAt && typeof c.bondingCurve !== "number");
  if (!bondingTokens.length) return;
  for (const c of bondingTokens.slice(0, 10)) {
    for (const url of [
      `https://dbc-api.meteora.ag/pools/${c.ca}`,
      `https://launch-api.meteora.ag/pool/${c.ca}`,
    ]) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        const res = await fetch(url, { headers: { accept: "application/json" }, signal: ctrl.signal });
        clearTimeout(timer);
        if (!res.ok) continue;
        const data = (await res.json()) as Rec;
        const pool = (Array.isArray(data) ? data[0] : (data.pool ?? data)) as Rec | undefined;
        const quote = Number(pool?.quoteReserve ?? pool?.quote_reserve ?? NaN);
        const threshold = Number(pool?.migrationQuoteThreshold ?? pool?.migration_quote_threshold ?? NaN);
        if (isFinite(quote) && isFinite(threshold) && threshold > 0) {
          const pct = Math.min((quote / threshold) * 100, 100);
          found.set(c.ca.toLowerCase(), { ...c, bondingCurve: pct });
          break;
        }
        const direct = Number(pool?.bondingCurveProgress ?? pool?.progress ?? NaN);
        if (isFinite(direct)) {
          found.set(c.ca.toLowerCase(), { ...c, bondingCurve: Math.min(direct <= 1 ? direct * 100 : direct, 100) });
          break;
        }
      } catch { /* endpoint unavailable — Jupiter fallback stands */ }
    }
  }
}

async function fetchJupiterFeed(found: Map<string, LiveLaunch>): Promise<boolean> {
  let ok = false;
  for (const url of JUPITER_POOL_URLS) {
    try {
      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (!res.ok) continue;
      const data = (await res.json()) as Rec;
      const pools: Rec[] = Array.isArray(data.pools) ? (data.pools as Rec[]) : [];
      for (const pool of pools) {
        const launch = jupPoolToLaunch(pool);
        if (!launch) continue;
        ok = true;
        const existing = found.get(launch.ca.toLowerCase());
        // Jupiter data is canonical — prefer it, keep richest record
        if (!existing || existing.source !== "KICKSTART" || launch.liquidity > existing.liquidity) {
          found.set(launch.ca.toLowerCase(), launch);
        }
      }
    } catch { /* try next endpoint */ }
  }
  return ok;
}

/** Fetch live Kickstart tokens (…EASY contracts + curated tracked list), ranked by market cap. */
export async function fetchLiveFeed(): Promise<{ launches: LiveLaunch[]; source: "KICKSTART" | "DEXSCREENER" } | null> {
  // 1 · Kickstart's own API, if it ever opens
  const ks = await tryKickstartApi();
  if (ks?.length) return { launches: ks.sort((a, b) => b.mcap - a.mcap), source: "KICKSTART" };

  try {
    const found = new Map<string, LiveLaunch>();

    // 0a · Jupiter datapi — canonical: launchpad tag + real bonding-curve state
    const jupOk = await fetchJupiterFeed(found);

    // 0b · Curated tracked launches via DexScreener — fills anything Jupiter missed
    await fetchTrackedTokens(found);

    // 0c · Meteora DBC — direct curve progress for tokens still bonding (best-effort)
    await enrichFromMeteora(found);
    void jupOk;

    // 2 · Search DexScreener for Kickstart-suffixed tokens across several queries.
    //     Broad query set so the feed scales to 50+ tokens as launches accumulate —
    //     the …EASY / kickstart.easya.io filter guarantees only genuine launches pass.
    const queries = [
      "EASY", "easya", "kickstart.easya.io", "kickstart easya",
      "EASY SOL", "easya kickstart", "ideacoin easya",
      // known Kickstart project names — the …EASY filter keeps results genuine
      "Varsko", "Bit Agents", "CapIX", "Clan World", "MergeFund",
      "Synapse EASY", "KAI EASY", "LENS EASY", "PACT EASY", "FRAI", "MTF EASY",
      "Switch Board", "SCOUT AI", "Inferra", "EASY DYN2", "EASY meteora",
    ];
    for (const q of queries) {
      try {
        const res = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`, { headers: { accept: "application/json" } });
        if (!res.ok) continue;
        const data = (await res.json()) as Rec;
        const pairs: Rec[] = Array.isArray(data.pairs) ? (data.pairs as Rec[]) : [];
        for (const pair of pairs) {
          if (pair.chainId !== "solana") continue;
          const base = pair.baseToken as Rec | undefined;
          const ca = typeof base?.address === "string" ? (base.address as string) : "";
          const info = pair.info as Rec | undefined;
          const websites = Array.isArray(info?.websites) ? (info!.websites as Rec[]).map((w) => String(w.url ?? "")) : [];
          if (!ca || !isKickstartToken(ca, websites)) continue;
          const launch = pairToLaunch(pair);
          if (!launch) continue;
          mergeDex(found, launch);
        }
      } catch { /* try next query */ }
    }

    // 3 · Also scan the latest token profiles for EASY-suffixed addresses
    try {
      const profRes = await fetch("https://api.dexscreener.com/token-profiles/latest/v1", { headers: { accept: "application/json" } });
      if (profRes.ok) {
        const profiles = (await profRes.json()) as Rec[];
        const kickstartAddrs = profiles
          .filter((p) => p.chainId === "solana" && typeof p.tokenAddress === "string" && /easy$/i.test(p.tokenAddress as string))
          .map((p) => String(p.tokenAddress))
          .filter((a) => !found.has(a.toLowerCase()))
          .slice(0, 60);
        // batch calls (DexScreener allows 30 addresses per request)
        for (let i = 0; i < kickstartAddrs.length; i += 30) {
          const batch = kickstartAddrs.slice(i, i + 30);
          const pairRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${batch.join(",")}`, { headers: { accept: "application/json" } });
          if (pairRes.ok) {
            const pairData = (await pairRes.json()) as Rec;
            const pairs: Rec[] = Array.isArray(pairData.pairs) ? (pairData.pairs as Rec[]) : [];
            for (const pair of pairs) {
              const launch = pairToLaunch(pair);
              if (!launch) continue;
              mergeDex(found, launch);
            }
          }
        }
      }
    } catch { /* profiles scan optional */ }

    const supplyOverrides = await fetchSupplyOverrides();
    const launches = [...found.values()].map((launch) => applySupplyOverride(launch, supplyOverrides)).sort((a, b) => b.mcap - a.mcap);
    return launches.length ? { launches, source: "KICKSTART" } : null;
  } catch {
    return null;
  }
}

export const shortCa = (ca: string) => `${ca.slice(0, 4)}…${ca.slice(-4)}`;
export const fmtPrice = (p: number) => (p >= 1 ? `$${p.toFixed(2)}` : `$${p.toFixed(5)}`);

/** Canonical Kickstart project page for any token — kickstart.easya.io/token/{ca}. */
export const kickstartUrl = (ca: string) => `https://kickstart.easya.io/token/${ca}`;

/* ─── Discovery classification ───
 * VERIFIED: the project's X account is authorized — following Kickstart's
 * "address in bio" model, verification requires a linked X account on-chain.
 * It confirms the link only, not the project. BONDED: live, but no authorized X yet.
 */
export function isVerified(c: LiveLaunch): boolean {
  return !!c.links.x;
}
export const verifiedOf = (feed: LiveLaunch[]) => feed.filter(isVerified);
/** BONDED = completed the bonding curve (graduated to AMM) — real state from Jupiter. */
export const bondedOf = (feed: LiveLaunch[]) => feed.filter(isGraduated);
/** BONDING = still on the curve, with live % progress. */
export const bondingOf = (feed: LiveLaunch[]) => feed.filter(isBonding);
export const trendingOf = (feed: LiveLaunch[]) => [...feed].sort((a, b) => b.change24h - a.change24h);

/* ─── Signals: the daily-return engine, computed live per token ─── */
export interface Signal {
  kind: SignalKind;
  strength: SignalStrength;
  title: string;
  detail: string;
}

function toMetrics(c: LiveLaunch, rank?: number): import("../../shared/signals-core").SignalMetrics {
  return {
    symbol: c.symbol,
    mcap: c.mcap,
    change24h: c.change24h,
    volume24h: c.volume24h,
    volume1h: c.volume1h,
    liquidity: c.liquidity,
    buys24h: c.buys24h,
    sells24h: c.sells24h,
    buys1h: c.buys1h,
    sells1h: c.sells1h,
    rank,
    verified: isVerified(c),
    pairAgeDays: c.pairCreatedAt ? (Date.now() - c.pairCreatedAt) / 86400000 : undefined,
  };
}

/** Whale-move detection from live txn flow: large avg trade size + one-sided flow. */
export function whaleSignal(c: LiveLaunch): Signal | null {
  const trades24 = c.buys24h + c.sells24h;
  const m = toMetrics(c);
  const core = coreWhaleSignal(m);
  if (!core) {
    if (trades24 < 5 || c.volume24h <= 0) return null;
    const avgTrade = c.volume24h / trades24;
    if (avgTrade < 400) return null;
    return {
      kind: "WHALE", strength: "NEUTRAL",
      title: `🐋 Big clips trading $${c.symbol}`,
      detail: `Average trade size is $${avgTrade.toFixed(0)} across ${trades24} trades — whale-scale for this cap, but flow is balanced (${c.buys24h} buys / ${c.sells24h} sells).`,
    };
  }
  const avgTrade = c.volume24h / trades24;
  const flow = trades24 > 0 ? (c.buys24h - c.sells24h) / trades24 : 0;
  const liqImpact = c.liquidity > 0 ? avgTrade / c.liquidity : 0;
  const buying = core.strength === "BULLISH";
  if (core.title.includes("burst")) {
    return {
      kind: "WHALE", strength: core.strength,
      title: buying ? `🐋 Whale accumulation burst on $${c.symbol}` : `🐋 Whale exit burst on $${c.symbol}`,
      detail: `${(c.volume1h / Math.max(c.volume24h, 1) * 100).toFixed(0)}% of the day's volume traded in the last hour (${c.buys1h} buys vs ${c.sells1h} sells). ${buying ? "Someone is building a position fast." : "Someone large is heading for the exit — thin pools amplify this."}`,
    };
  }
  return {
    kind: "WHALE", strength: core.strength,
    title: buying ? `🐋 Large buyers active on $${c.symbol}` : `🐋 Large sellers active on $${c.symbol}`,
    detail: `Average clip $${avgTrade.toFixed(0)} across ${trades24} trades with ${buying ? c.buys24h + " buys vs " + c.sells24h + " sells" : c.sells24h + " sells vs " + c.buys24h + " buys"} (${(Math.abs(flow) * 100).toFixed(0)}% one-sided)${liqImpact >= 0.02 ? ` — each clip moves ~${(liqImpact * 100).toFixed(1)}% of the pool` : ""}.`,
  };
}

export function tokenSignals(c: LiveLaunch, feed: LiveLaunch[]): Signal[] {
  const out: Signal[] = [];
  const turnover = c.mcap > 0 ? c.volume24h / c.mcap : 0;
  const liqRatio = c.mcap > 0 ? c.liquidity / c.mcap : 0;
  const rank = [...feed].sort((a, b) => b.mcap - a.mcap).findIndex((x) => x.ca === c.ca) + 1;
  const avgTurnover = feed.length ? feed.reduce((s, x) => s + (x.mcap > 0 ? x.volume24h / x.mcap : 0), 0) / feed.length : 0;

  if (c.change24h >= 15) out.push({ kind: "MOMENTUM", strength: "BULLISH", title: `+${c.change24h.toFixed(1)}% in 24h`, detail: "Strong upside momentum. Historically, chasing >15% daily moves adds entry risk — scale in, don't lump in." });
  else if (c.change24h >= 5) out.push({ kind: "MOMENTUM", strength: "BULLISH", title: `+${c.change24h.toFixed(1)}% steady climb`, detail: "Constructive momentum without blow-off characteristics." });
  else if (c.change24h <= -15) out.push({ kind: "MOMENTUM", strength: "BEARISH", title: `${c.change24h.toFixed(1)}% drawdown`, detail: "Sharp 24h decline. Wait for stabilization before averaging — falling knives on micro-caps cut deep." });
  else out.push({ kind: "MOMENTUM", strength: "NEUTRAL", title: "Price consolidating", detail: `${c.change24h >= 0 ? "+" : ""}${c.change24h.toFixed(1)}% over 24h — no directional edge from momentum alone.` });

  if (turnover >= Math.max(avgTurnover * 1.5, 0.3)) out.push({ kind: "VOLUME", strength: "BULLISH", title: `Turnover ${(turnover * 100).toFixed(0)}% of cap`, detail: `Trading ${avgTurnover > 0 ? (turnover / avgTurnover).toFixed(1) + "× the board average" : "heavily"}. Sustained elevated volume for 48h historically precedes re-ratings.` });
  else if (turnover < 0.05) out.push({ kind: "VOLUME", strength: "BEARISH", title: "Volume drying up", detail: `Only ${(turnover * 100).toFixed(1)}% daily turnover — exits get expensive when attention leaves.` });
  else out.push({ kind: "VOLUME", strength: "NEUTRAL", title: `${(turnover * 100).toFixed(0)}% daily turnover`, detail: "In line with the board — neither accumulation nor distribution dominates." });

  if (liqRatio >= 0.4) out.push({ kind: "LIQUIDITY", strength: "BULLISH", title: "Deep liquidity", detail: `Pool holds ${(liqRatio * 100).toFixed(0)}% of market cap — slippage stays sane even on size.` });
  else if (liqRatio > 0 && liqRatio < 0.1) out.push({ kind: "LIQUIDITY", strength: "BEARISH", title: "Thin pool", detail: `Liquidity is just ${(liqRatio * 100).toFixed(0)}% of cap. A single large exit moves the price materially.` });

  if (rank === 1) out.push({ kind: "RANK", strength: "BULLISH", title: "#1 by market cap", detail: "Board leader. Leaders attract disproportionate attention flow — and disproportionate profit-taking." });
  else if (rank <= 3) out.push({ kind: "RANK", strength: "NEUTRAL", title: `Top-3 (#${rank})`, detail: "Within striking distance of the top spot — flippings of #1 are attention events." });

  out.push(isVerified(c)
    ? { kind: "VERIFY", strength: "BULLISH", title: "X account authorized", detail: "The project's X account is linked on-chain (address-in-bio model). This confirms the link only, not the project — impersonation risk is lower, DYOR still applies." }
    : { kind: "VERIFY", strength: "BEARISH", title: "No authorized X account", detail: "No linked X account found yet. Confirm the …EASY suffix and cross-check the project before sizing up." });

  const whale = whaleSignal(c);
  if (whale) out.push(whale);

  return out;
}

/* ─── Ecosystem Signals: everything happening, in real time ─── */
export interface EcoEvent {
  token: LiveLaunch;
  kind: Signal["kind"] | "LAUNCH";
  strength: Signal["strength"];
  title: string;
  detail: string;
  weight: number; // ordering: bigger = more important
}

export function ecosystemSignals(feed: LiveLaunch[]): EcoEvent[] {
  const events: EcoEvent[] = [];
  const ranked = [...feed].sort((a, b) => b.mcap - a.mcap);
  for (const c of feed) {
    const rank = ranked.findIndex((x) => x.ca === c.ca) + 1;
    const m = toMetrics(c, rank);
    if (c.pairCreatedAt) {
      const days = m.pairAgeDays ?? 0;
      if (days <= 7) {
        events.push({
          token: c, kind: "LAUNCH", strength: "BULLISH", weight: signalWeight("LAUNCH", "BULLISH", m),
          title: `New launch: ${c.name}`,
          detail: `$${c.symbol} paired ${days < 1 ? "today" : `${Math.floor(days)}d ago`} — ${c.mcap ? "trading at " + (c.mcap >= 1000 ? `$${(c.mcap / 1000).toFixed(1)}K` : `$${c.mcap.toFixed(0)}`) + " cap" : "price discovery underway"}.`,
        });
      }
    }
    for (const s of tokenSignals(c, feed)) {
      if (s.strength === "NEUTRAL" && s.kind !== "RANK" && s.kind !== "WHALE") continue;
      events.push({
        token: c, kind: s.kind, strength: s.strength, title: s.title, detail: s.detail,
        weight: signalWeight(s.kind, s.strength, m),
      });
    }
  }
  return events.sort((a, b) => b.weight - a.weight);
}

/* ─── EasyA Indexes: live baskets over the feed ─── */
export interface IndexDef {
  id: string;
  name: string;
  icon: string;
  method: string;
  pick: (feed: LiveLaunch[]) => LiveLaunch[];
}

export const INDEXES: IndexDef[] = [
  { id: "all", name: "EasyA Kickstart Composite", icon: "🧺", method: "All live …EASY tokens, market-cap weighted", pick: (f) => [...f].sort((a, b) => b.mcap - a.mcap) },
  { id: "verified", name: "EasyA Verified Index", icon: "✓", method: "Verified tokens only — on-chain Kickstart link required", pick: (f) => verifiedOf(f).sort((a, b) => b.mcap - a.mcap) },
  { id: "momentum", name: "EasyA Momentum 5", icon: "🔥", method: "Top 5 by 24h performance, refreshed continuously", pick: (f) => trendingOf(f).slice(0, 5) },
  { id: "liquid", name: "EasyA Liquid Index", icon: "💧", method: "Tokens with liquidity ≥ 20% of market cap", pick: (f) => f.filter((c) => c.mcap > 0 && c.liquidity / c.mcap >= 0.2).sort((a, b) => b.mcap - a.mcap) },
];

export function indexStats(coins: LiveLaunch[]) {
  const mcap = coins.reduce((s, c) => s + c.mcap, 0);
  const change = mcap > 0 ? coins.reduce((s, c) => s + c.change24h * c.mcap, 0) / mcap : 0; // cap-weighted
  const vol = coins.reduce((s, c) => s + c.volume24h, 0);
  return { mcap, change, vol, count: coins.length };
}

/* ─── Watchlist persistence ─── */
const WL_KEY = "easya-pulse:watchlist";
const WL_ALERTS_KEY = "easya-pulse:alerts";

export function loadWatchlist(): string[] {
  try { return JSON.parse(localStorage.getItem(WL_KEY) || "[]"); } catch { return []; }
}
export function saveWatchlist(cas: string[]) {
  try { localStorage.setItem(WL_KEY, JSON.stringify(cas)); } catch { /* noop */ }
}
export interface AlertPrefs { priceMove: boolean; volumeSpike: boolean; verification: boolean; newLaunch: boolean; whaleSignal: boolean }
export function loadAlertPrefs(): AlertPrefs {
  try { return { priceMove: true, volumeSpike: true, verification: true, newLaunch: true, whaleSignal: true, ...JSON.parse(localStorage.getItem(WL_ALERTS_KEY) || "{}") }; }
  catch { return { priceMove: true, volumeSpike: true, verification: true, newLaunch: true, whaleSignal: true }; }
}
export function saveAlertPrefs(p: AlertPrefs) {
  try { localStorage.setItem(WL_ALERTS_KEY, JSON.stringify(p)); } catch { /* noop */ }
}

/* ─── Read-only portfolio: watch any wallet, no signing ───
 * Balances prefer Solscan when a VITE_SOLSCAN_API_KEY is present, then fall back to
 * Solana JSON-RPC getTokenAccountsByOwner (public, read-only).
 * Holdings are intersected with the live Kickstart feed and valued at live prices.
 */

export interface Holding {
  coin: LiveLaunch;
  amount: number;    // UI amount (decimals applied)
  valueUsd: number;
}

/* CORS-friendly public RPCs first — api.mainnet-beta often 403s browser origins. */
const SOLANA_RPCS = [
  "https://solana-rpc.publicnode.com",
  "https://rpc.aex402.com",          // free, no key, no CORS restrictions
  "https://solana.drpc.org",
  "https://api.mainnet-beta.solana.com",
  "https://rpc.ankr.com/solana",
];

/** Known ecosystem wallets — one-click portfolio demos (dev wallets are public on Jupiter). */
export const KNOWN_WALLETS: { label: string; address: string; note: string }[] = [
  { label: "CapIX dev wallet", address: "8nu4XXu2S9BeGY5TptK3BG2S3e5jQBXg34Tcz3wqEMqt", note: "$CPX founder allocation · public via Jupiter" },
  { label: "Varsko dev wallet", address: "DdKQPQiapZvkFyfziidoXYHip77TZFkp1HLYhHMY68Ac", note: "$VSK founder wallet · public via Jupiter" },
];

const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

function getSolscanApiKey(): string | null {
  const key = (import.meta.env?.VITE_SOLSCAN_API_KEY as string | undefined)?.trim();
  return key ? key : null;
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function extractMint(record: Record<string, unknown>): string | null {
  const candidates = [
    record.tokenAddress,
    record.mint,
    record.address,
    record.contract,
    record.tokenMint,
    record.token_address,
    record.mint_address,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return null;
}

function extractAmount(record: Record<string, unknown>): number | null {
  const candidates = [
    record.amount,
    record.amountString,
    record.uiAmount,
    record.uiAmountString,
    record.balance,
    record.quantity,
    record.tokenAmount,
    record.token_amount,
    record.value,
  ];
  for (const candidate of candidates) {
    const parsed = coerceNumber(candidate);
    if (parsed !== null && parsed > 0) return parsed;
  }
  return null;
}

function parseSolscanBalances(payload: unknown): Map<string, number> | null {
  const balances = new Map<string, number>();
  const stack: unknown[] = [payload];
  while (stack.length > 0) {
    const item = stack.pop();
    if (Array.isArray(item)) {
      stack.push(...item);
      continue;
    }
    if (!item || typeof item !== "object") continue;

    const record = item as Record<string, unknown>;
    const mint = extractMint(record);
    const amount = extractAmount(record);
    if (mint && amount !== null) {
      balances.set(mint, (balances.get(mint) ?? 0) + amount);
    }

    for (const value of Object.values(record)) stack.push(value);
  }
  return balances.size > 0 ? balances : null;
}

async function fetchTokenBalancesViaSolscan(owner: string): Promise<Map<string, number> | null> {
  const key = getSolscanApiKey();
  if (!key) return null;

  const endpoints = [
    "https://pro-api.solscan.io/v2.0/account/tokens",
    "https://pro-api.solscan.io/v2.0/account/portfolio",
    "https://pro-api.solscan.io/v2.0/account/summary",
  ];

  const headers: HeadersInit = {
    accept: "application/json",
    token: key,
  };

  for (const endpoint of endpoints) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const url = new URL(endpoint);
      url.searchParams.set("address", owner.trim());
      const res = await fetch(url.toString(), { method: "GET", headers, signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) continue;
      const payload = (await res.json()) as unknown;
      const balances = parseSolscanBalances(payload);
      if (balances) return balances;
    } catch {
      // Try the next endpoint if Solscan rejects or returns an unexpected schema.
    }
  }

  return null;
}

export function isValidSolAddress(addr: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr.trim());
}

/** Last RPC endpoint that answered successfully — surfaced in the UI for transparency. */
export let lastRpcUsed: string | null = null;

async function rpcCall(method: string, params: unknown[]): Promise<Rec | null> {
  for (const url of SOLANA_RPCS) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      const data = (await res.json()) as Rec;
      if (data.error) continue; // e.g. rate limited — try next
      if (data.result !== undefined) {
        lastRpcUsed = url.replace(/^https:\/\//, "");
        return data.result as Rec;
      }
    } catch { /* try next RPC */ }
  }
  lastRpcUsed = null;
  return null;
}

/* ─── Solscan (solscan.io) — primary balance source ───
 * 1. Solscan Pro API v2 (pro-api.solscan.io) with an API key — the official,
 *    reliable way to read balances from solscan.io. Key via VITE_SOLSCAN_API_KEY
 *    (free tier available at solscan.io → API Management).
 * 2. Solscan public API (public-api.solscan.io) — keyless attempt; Cloudflare
 *    may gate some origins.
 * 3. Direct Solana RPC — always-works fallback.
 * Whichever source answers is surfaced in the UI (balanceSource).
 */
export let balanceSource: "solscan" | "rpc" | null = null;

const SOLSCAN_API_KEY = (import.meta.env?.VITE_SOLSCAN_API_KEY as string) || "";

async function solscanProGet(path: string): Promise<Rec | null> {
  if (!SOLSCAN_API_KEY) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`https://pro-api.solscan.io/v2.0${path}`, {
      headers: { accept: "application/json", token: SOLSCAN_API_KEY },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as Rec;
    return data.success === false ? null : data;
  } catch {
    return null;
  }
}

/** SOL balance via Solscan Pro /account/detail (lamports). */
async function fetchSolBalanceSolscanPro(owner: string): Promise<number | null> {
  const data = await solscanProGet(`/account/detail?address=${owner.trim()}`);
  const d = (data?.data ?? data) as Rec | undefined;
  const lamports = Number(d?.lamports ?? NaN);
  return isFinite(lamports) && lamports >= 0 ? lamports / 1_000_000_000 : null;
}

/** Token holdings via Solscan Pro /account/token-accounts: mint → uiAmount. */
async function fetchTokenBalancesSolscanPro(owner: string): Promise<Map<string, number> | null> {
  const balances = new Map<string, number>();
  let anyPage = false;
  for (let page = 1; page <= 3; page++) { // up to 120 token accounts
    const data = await solscanProGet(`/account/token-accounts?address=${owner.trim()}&type=token&page=${page}&page_size=40&hide_zero=true`);
    const arr = Array.isArray(data?.data) ? (data!.data as Rec[]) : null;
    if (!arr) break;
    anyPage = true;
    for (const t of arr) {
      try {
        const mint = String(t.token_address ?? t.tokenAddress ?? "");
        const raw = Number(t.amount ?? NaN);
        const decimals = Number(t.token_decimals ?? t.decimals ?? NaN);
        const ui = isFinite(raw) && isFinite(decimals) ? raw / Math.pow(10, decimals) : Number(t.balance ?? NaN);
        if (mint && isFinite(ui) && ui > 0) balances.set(mint, (balances.get(mint) ?? 0) + ui);
      } catch { /* skip malformed entry */ }
    }
    if (arr.length < 40) break; // last page
  }
  return anyPage ? balances : null;
}

async function solscanGet(path: string): Promise<Rec | Rec[] | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(`https://public-api.solscan.io${path}`, {
      headers: { accept: "application/json" },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as Rec | Rec[];
  } catch {
    return null; // CORS / Cloudflare — RPC fallback stands
  }
}

/** SOL balance via Solscan account endpoint; falls back to RPC getBalance. */
async function fetchSolBalanceSolscan(owner: string): Promise<number | null> {
  const data = await solscanGet(`/account/${owner.trim()}`);
  if (data && !Array.isArray(data)) {
    const lamports = Number((data as Rec).lamports ?? ((data as Rec).data as Rec | undefined)?.lamports ?? NaN);
    if (isFinite(lamports) && lamports >= 0) return lamports / 1_000_000_000;
  }
  return null;
}

/** Token holdings via Solscan; returns mint → uiAmount, or null when gated. */
async function fetchTokenBalancesSolscan(owner: string): Promise<Map<string, number> | null> {
  const data = await solscanGet(`/account/tokens?account=${owner.trim()}`);
  const arr = Array.isArray(data) ? data : Array.isArray((data as Rec | null)?.data) ? (((data as Rec).data) as Rec[]) : null;
  if (!arr) return null;
  const balances = new Map<string, number>();
  for (const t of arr) {
    try {
      const mint = String(t.tokenAddress ?? t.mint ?? "");
      const amt = t.tokenAmount as Rec | undefined;
      const ui = Number(amt?.uiAmount ?? t.uiAmount ?? NaN);
      if (mint && isFinite(ui) && ui > 0) balances.set(mint, (balances.get(mint) ?? 0) + ui);
    } catch { /* skip malformed entry */ }
  }
  return balances;
}

/** Native SOL balance in SOL units — Solscan Pro → Solscan public → RPC. */
export async function fetchSolBalance(owner: string): Promise<number | null> {
  const viaPro = await fetchSolBalanceSolscanPro(owner);
  if (viaPro !== null) { balanceSource = "solscan"; return viaPro; }
  const viaSolscan = await fetchSolBalanceSolscan(owner);
  if (viaSolscan !== null) { balanceSource = "solscan"; return viaSolscan; }
  const result = await rpcCall("getBalance", [owner.trim(), { commitment: "confirmed" }]);
  if (!result) return null;
  const lamports = typeof (result as Rec).value === "number" ? ((result as Rec).value as number) : null;
  if (lamports !== null) balanceSource = "rpc";
  return lamports === null ? null : lamports / 1_000_000_000;
}

/** Live SOL/USD price via Jupiter (wSOL mint). */
export async function fetchSolPrice(): Promise<number | null> {
  try {
    const res = await fetch("https://lite-api.jup.ag/price/v3?ids=So11111111111111111111111111111111111111112", { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as Rec;
    const entry = (data["So11111111111111111111111111111111111111112"] ?? (data.data as Rec | undefined)?.["So11111111111111111111111111111111111111112"]) as Rec | undefined;
    const p = Number(entry?.usdPrice ?? entry?.price ?? NaN);
    return isFinite(p) && p > 0 ? p : null;
  } catch {
    return null;
  }
}

/** Fetch a wallet's raw SPL token balances: mint → uiAmount. Solscan Pro → public → RPC. */
async function fetchTokenBalances(owner: string): Promise<Map<string, number> | null> {
  // 1 · Solscan Pro API (official, keyed — reads directly from solscan.io)
  const viaPro = await fetchTokenBalancesSolscanPro(owner);
  if (viaPro !== null) {
    balanceSource = "solscan";
    return viaPro;
  }

  // 2 · Solscan public API (keyless; may be origin-gated)
  const viaSolscan = await fetchTokenBalancesSolscan(owner);
  if (viaSolscan !== null && viaSolscan.size > 0) {
    balanceSource = "solscan";
    return viaSolscan;
  }

  // 3 · Direct Solana RPC
  const balances = new Map<string, number>();
  let anySuccess = false;
  for (const programId of [TOKEN_PROGRAM, TOKEN_2022_PROGRAM]) {
    const result = await rpcCall("getTokenAccountsByOwner", [
      owner.trim(),
      { programId },
      { encoding: "jsonParsed", commitment: "confirmed" },
    ]);
    if (!result) continue;
    anySuccess = true;
    const accounts = Array.isArray((result as Rec).value) ? ((result as Rec).value as Rec[]) : [];
    for (const acc of accounts) {
      try {
        const info = ((((acc.account as Rec).data as Rec).parsed as Rec).info as Rec);
        const mint = String(info.mint);
        const amt = ((info.tokenAmount as Rec).uiAmount as number) ?? 0;
        if (amt > 0) balances.set(mint, (balances.get(mint) ?? 0) + amt);
      } catch { /* skip malformed account */ }
    }
  }
  if (anySuccess) balanceSource = "rpc";
  return anySuccess ? balances : null;
}

export interface PortfolioResult {
  holdings: Holding[];
  totalUsd: number;
  scanned: number;
  sol: { amount: number; priceUsd: number | null; valueUsd: number | null } | null;
  rpc: string | null;
  source: "solscan" | "rpc" | null;
  /** Raw on-chain balances — used to re-value holdings when the live feed refreshes. */
  balanceSnapshot: Record<string, number>;
  fetchedAt: number;
}

function lookupBalance(balances: Map<string, number>, ca: string): number | undefined {
  const direct = balances.get(ca);
  if (direct !== undefined) return direct;
  const lower = ca.toLowerCase();
  for (const [mint, amt] of balances) {
    if (mint.toLowerCase() === lower) return amt;
  }
  return undefined;
}

function snapshotBalances(balances: Map<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  balances.forEach((v, k) => { out[k] = v; });
  return out;
}

/** Build portfolio holdings from cached balances + current live feed prices. */
export function buildPortfolioFromBalances(
  balances: Map<string, number>,
  feed: LiveLaunch[],
  meta: Pick<PortfolioResult, "sol" | "rpc" | "source" | "fetchedAt">,
): PortfolioResult {
  const holdings: Holding[] = [];
  for (const coin of feed) {
    const amount = lookupBalance(balances, coin.ca);
    if (amount && amount > 0) {
      holdings.push({ coin, amount, valueUsd: amount * (coin.priceUsd || 0) });
    }
  }
  holdings.sort((a, b) => b.valueUsd - a.valueUsd);
  return {
    holdings,
    totalUsd: holdings.reduce((s, h) => s + h.valueUsd, 0),
    scanned: balances.size,
    balanceSnapshot: snapshotBalances(balances),
    ...meta,
  };
}

/** Re-value an existing portfolio against a fresh live feed (no new RPC calls). */
export function revaluePortfolioFromFeed(portfolio: PortfolioResult, feed: LiveLaunch[]): PortfolioResult {
  if (!portfolio.balanceSnapshot || Object.keys(portfolio.balanceSnapshot).length === 0) return portfolio;
  const balances = new Map(Object.entries(portfolio.balanceSnapshot));
  return buildPortfolioFromBalances(balances, feed, {
    sol: portfolio.sol,
    rpc: portfolio.rpc,
    source: portfolio.source,
    fetchedAt: portfolio.fetchedAt,
  });
}

const SOLANA_RPC = "https://api.mainnet-beta.solana.com";

/**
 * Fetch the balance of a specific SPL token for a wallet.
 * Tries browser-friendly RPCs first, then mainnet-beta.
 */
export async function fetchTokenBalance(
  walletAddress: string,
  tokenMint: string,
): Promise<number> {
  try {
    const walletPubkey = new PublicKey(walletAddress);
    const mintPubkey = new PublicKey(tokenMint);
    const endpoints = [...new Set([...SOLANA_RPCS, SOLANA_RPC])];

    for (const url of endpoints) {
      try {
        const connection = new Connection(url, "confirmed");
        const tokenAccounts = await connection.getTokenAccountsByOwner(walletPubkey, {
          mint: mintPubkey,
        });

        if (tokenAccounts.value.length === 0) return 0;

        const tokenAccount = tokenAccounts.value[0].pubkey;
        const balance = await connection.getTokenAccountBalance(tokenAccount);
        return balance.value.uiAmount ?? 0;
      } catch (err) {
        console.error(`Error fetching token balance via ${url}:`, err);
      }
    }

    return 0;
  } catch (error) {
    console.error("Error fetching token balance:", error);
    return 0;
  }
}

/** Connected-wallet portfolio: per-token RPC balance checks (same path as thesis / WalletGate). */
export async function fetchConnectedWalletPortfolio(
  owner: string,
  feed: LiveLaunch[],
): Promise<PortfolioResult | null> {
  try {
    const pairs = await Promise.all(
      feed.map(async (coin) => [coin.ca, await fetchTokenBalance(owner, coin.ca)] as const),
    );
    const balances = new Map<string, number>();
    for (const [ca, amount] of pairs) {
      if (amount > 0) balances.set(ca, amount);
    }
    const [solAmount, solPrice] = await Promise.all([fetchSolBalance(owner), fetchSolPrice()]);
    const portfolio = buildPortfolioFromBalances(balances, feed, {
      sol:
        solAmount !== null
          ? { amount: solAmount, priceUsd: solPrice, valueUsd: solPrice !== null ? solAmount * solPrice : null }
          : null,
      rpc: lastRpcUsed,
      source: "rpc",
      fetchedAt: Date.now(),
    });
    return { ...portfolio, scanned: feed.length };
  } catch {
    return null;
  }
}

/** Full SPL scan portfolio — used for founder wallet forensics, not user watch flows. */
export async function fetchPortfolio(owner: string, feed: LiveLaunch[]): Promise<PortfolioResult | null> {
  const [balances, solAmount, solPrice] = await Promise.all([
    fetchTokenBalances(owner),
    fetchSolBalance(owner),
    fetchSolPrice(),
  ]);
  if (balances === null) return null;
  return buildPortfolioFromBalances(balances, feed, {
    sol: solAmount !== null
      ? { amount: solAmount, priceUsd: solPrice, valueUsd: solPrice !== null ? solAmount * solPrice : null }
      : null,
    rpc: lastRpcUsed,
    source: balanceSource,
    fetchedAt: Date.now(),
  });
}

/** True when the Phantom extension is injected into this browser. */
export function isPhantomAvailable(): boolean {
  const w = window as unknown as { solana?: { isPhantom?: boolean } };
  return !!w.solana?.isPhantom;
}

/** Connect Phantom in read-only mode (connect() shares the public key; no transaction signing requested). */
export async function connectPhantomReadOnly(): Promise<string | null> {
  try {
    const w = window as unknown as { solana?: { isPhantom?: boolean; connect: (o?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString(): string } }> } };
    if (!w.solana?.isPhantom) return null;
    const res = await w.solana.connect();
    return res.publicKey.toString();
  } catch {
    return null; // user rejected
  }
}

/** Simple AI note for a token's terminal page, computed from live data. */
export function tokenNote(c: LiveLaunch, feed: LiveLaunch[]): { rating: string; cls: string; note: string } {
  const turnover = c.mcap > 0 ? c.volume24h / c.mcap : 0;
  const liqRatio = c.mcap > 0 ? c.liquidity / c.mcap : 0;
  const rank = [...feed].sort((a, b) => b.mcap - a.mcap).findIndex((x) => x.ca === c.ca) + 1;
  const parts: string[] = [];
  parts.push(`#${rank} of ${feed.length} live Kickstart tokens by market cap.`);
  if (turnover >= 0.5) parts.push(`Turnover is ${(turnover * 100).toFixed(0)}% of cap in 24h — heavy trading interest.`);
  else if (turnover >= 0.15) parts.push(`Healthy ${(turnover * 100).toFixed(0)}% daily turnover.`);
  else parts.push(`Thin trading (${(turnover * 100).toFixed(0)}% daily turnover) — moves may be sharp.`);
  if (liqRatio >= 0.4) parts.push("Liquidity is deep relative to cap — exits are realistic.");
  else if (liqRatio > 0) parts.push(`Liquidity is ${(liqRatio * 100).toFixed(0)}% of cap — size positions accordingly.`);
  if (c.change24h >= 15) parts.push(`Momentum is hot (+${c.change24h.toFixed(1)}% 24h); chasing here adds entry risk.`);
  else if (c.change24h <= -15) parts.push(`Down ${Math.abs(c.change24h).toFixed(1)}% in 24h — watch for a base before averaging.`);
  parts.push(isVerified(c) ? "Verified: X account authorized (address-in-bio)." : "Not yet verified — no authorized X account found.");
  const good = (turnover >= 0.15 ? 1 : 0) + (liqRatio >= 0.25 ? 1 : 0) + (c.change24h > 0 ? 1 : 0) + (isVerified(c) ? 1 : 0);
  const rating = good >= 3 ? "CONSTRUCTIVE" : good === 2 ? "NEUTRAL" : "CAUTION";
  const cls = good >= 3 ? "bg-emerald-600" : good === 2 ? "bg-amber-500" : "bg-red-500";
  return { rating, cls, note: parts.join(" ") };
}

/* ─── Daily Brief, computed from the live Kickstart feed ─── */
export interface LiveBrief {
  date: string;
  headline: string;
  summary: string;
  picks: { coin: LiveLaunch; reason: string; conviction: number }[];
  watch: string[];
}

const fUsd = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toFixed(0)}`);

export function liveBrief(feed: LiveLaunch[]): LiveBrief {
  const totalMcap = feed.reduce((s, c) => s + c.mcap, 0);
  const totalVol = feed.reduce((s, c) => s + c.volume24h, 0);
  const byMcap = [...feed].sort((a, b) => b.mcap - a.mcap);
  const topMover = [...feed].sort((a, b) => b.change24h - a.change24h)[0];
  const mostTraded = [...feed].sort((a, b) => b.volume24h - a.volume24h)[0];

  // conviction: liquidity depth + turnover + momentum, normalized
  const score = (c: LiveLaunch) => {
    const turnover = c.mcap > 0 ? Math.min(c.volume24h / c.mcap, 2) : 0;
    const liqRatio = c.mcap > 0 ? Math.min(c.liquidity / c.mcap, 1) : 0;
    return Math.min(96, Math.round(40 + turnover * 22 + liqRatio * 20 + Math.max(-15, Math.min(c.change24h, 30)) * 0.6));
  };

  const picks = [...feed]
    .sort((a, b) => score(b) - score(a))
    .slice(0, 3)
    .map((coin) => {
      const turnover = coin.mcap > 0 ? coin.volume24h / coin.mcap : 0;
      const reasons: string[] = [];
      if (coin.change24h >= 10) reasons.push(`+${coin.change24h.toFixed(1)}% in 24h`);
      if (coin.change24h <= -10) reasons.push(`${coin.change24h.toFixed(1)}% pullback — watch for a base`);
      if (turnover >= 0.3) reasons.push(`${(turnover * 100).toFixed(0)}% daily turnover — real trading interest`);
      if (coin.mcap > 0 && coin.liquidity / coin.mcap >= 0.3) reasons.push("deep liquidity relative to cap");
      if (coin === byMcap[0]) reasons.push("largest Kickstart launch by market cap");
      if (!reasons.length) reasons.push("holding steady while the rest of the board churns");
      return { coin, conviction: score(coin), reason: reasons.slice(0, 2).join(" · ") + "." };
    });

  return {
    date: new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
    headline: topMover && topMover.change24h > 5
      ? `$${topMover.symbol} leads the board, +${topMover.change24h.toFixed(1)}% in 24h`
      : byMcap[0] ? `$${byMcap[0].symbol} holds the top spot at ${fUsd(byMcap[0].mcap)}` : "Quiet session on Kickstart",
    summary: `${feed.length} Kickstart launch${feed.length !== 1 ? "es" : ""} live on-chain, ${fUsd(totalMcap)} combined market cap with ${fUsd(totalVol)} traded in the last 24h. ${
      mostTraded ? `$${mostTraded.symbol} is the most-traded name (${fUsd(mostTraded.volume24h)} volume). ` : ""
    }${topMover && topMover.change24h > 0 ? `Momentum is concentrated in $${topMover.symbol}.` : "No breakout momentum today — a session for accumulation lists, not chasing."} All data live from DexScreener; only …EASY contracts qualify.`,
    picks,
    watch: [
      byMcap[0] ? `$${byMcap[0].symbol} mcap ${fUsd(byMcap[0].mcap)} — does it hold the #1 spot through the next launch window?` : "Next Kickstart launch window",
      mostTraded ? `$${mostTraded.symbol} turnover — sustained volume for 48h historically precedes a re-rating` : "Volume leaders",
      "New …EASY pairs — fresh launches are indexed here automatically within minutes",
    ],
  };
}

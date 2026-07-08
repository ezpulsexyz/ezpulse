import type { LiveLaunch } from "./kickstart";
import { calculateConvictionScore } from "./founder";
import { isGraduated, isVerified } from "./kickstart";
import type { PricePoint, ResolvedSignal } from "./backend";

/* ─── Founder registry: wallet-keyed profiles for verified projects ─── */

export interface FounderPost {
  id: string;
  ts: string;
  source: "manual" | "x" | "github" | "kickstart";
  title: string;
  body: string;
  url?: string;
}

export interface FounderRegistryEntry {
  wallet: string;
  displayName: string;
  xHandle?: string;
  github?: string;
  bio?: string;
  /** Contract addresses this founder has launched on Kickstart */
  tokens: string[];
  /** Per-token lockup commitment in days (founder-submitted / manually verified). */
  tokenLockups?: Record<string, number>;
  teamWallets?: string[];
  manualPosts?: FounderPost[];
}

/** Curated founder profiles — extend as more verified projects link wallets on-chain. */
export const FOUNDER_REGISTRY: FounderRegistryEntry[] = [
  {
    wallet: "8nu4XXu2S9BeGY5TptK3BG2S3e5jQBXg34Tcz3wqEMqt",
    displayName: "CapIX Protocol",
    xHandle: "capix_ai",
    github: "capix-protocol",
    bio: "On-chain market infrastructure for Kickstart launches. Building conviction tooling for founders and LPs.",
    tokens: ["bS532krUcXBMNqXURPtGqYA7dhEsenYe2z9QKkcEASY"],
    teamWallets: ["8nu4XXu2S9BeGY5TptK3BG2S3e5jQBXg34Tcz3wqEMqt"],
    manualPosts: [
      {
        id: "cpx-1",
        ts: new Date(Date.now() - 5 * 86400000).toISOString(),
        source: "manual",
        title: "Bonding curve graduated",
        body: "$CPX completed its Kickstart curve and migrated to the AMM pool — full liquidity live.",
        url: "https://kickstart.easya.io/token/bS532krUcXBMNqXURPtGqYA7dhEsenYe2z9QKkcEASY",
      },
    ],
  },
  {
    wallet: "DdKQPQiapZvkFyfziidoXYHip77TZFkp1HLYhHMY68Ac",
    displayName: "Varsko Intelligence",
    xHandle: "VarskoAI",
    bio: "AI-native intelligence layer for on-chain markets. Verified X · address-in-bio.",
    tokens: ["12z7AWnW5Q8mAS9qFtCWnnMdhNvqScZHe8w627EfEASY"],
    teamWallets: ["DdKQPQiapZvkFyfziidoXYHip77TZFkp1HLYhHMY68Ac"],
    manualPosts: [
      {
        id: "vsk-1",
        ts: new Date(Date.now() - 12 * 86400000).toISOString(),
        source: "manual",
        title: "Shipped terminal integrations",
        body: "Live on ezpulse with verified links and full market data via Jupiter + DexScreener.",
      },
    ],
  },
  {
    wallet: "FKshTXX4wUcirV9b4LhLrNP4cxAsA2VBAFdMEw5EASY",
    displayName: "easycoin",
    xHandle: "easycoin",
    bio: "The reference Kickstart launch — ecosystem anchor token with verified socials.",
    tokens: ["FKshTXX4wUcirV9b4LhLrNP4cxAsA2VBAFdMEw5EASY"],
  },
];

export function registryByCa(ca: string): FounderRegistryEntry | null {
  const hit = FOUNDER_REGISTRY.find((f) => f.tokens.some((t) => t === ca));
  return hit ?? null;
}

export function registryByWallet(wallet: string): FounderRegistryEntry | null {
  return FOUNDER_REGISTRY.find((f) => f.wallet === wallet) ?? null;
}

/** Resolve a founder by wallet, @handle, or token contract (falls back to feed token). */
export function resolveFounderById(founderId: string, feed: LiveLaunch[] = []): FounderRegistryEntry | null {
  const raw = founderId.trim();
  if (!raw) return null;

  const byWallet = registryByWallet(raw);
  if (byWallet) return byWallet;

  const handle = raw.replace(/^@/, "").toLowerCase();
  const byHandle = FOUNDER_REGISTRY.find((f) => f.xHandle?.toLowerCase() === handle);
  if (byHandle) return byHandle;

  const byCa = registryByCa(raw);
  if (byCa) return byCa;

  const token = feed.find((c) => c.ca === raw);
  if (token) return resolveFounder(token);

  const byXInFeed = feed.find((c) => {
    const h = c.links.x?.replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//, "").replace(/\/$/, "").toLowerCase();
    return h === handle;
  });
  if (byXInFeed) return resolveFounder(byXInFeed);

  return null;
}

/** Infer a minimal founder profile from live token data when no registry entry exists. */
export function inferFounderFromToken(c: LiveLaunch): FounderRegistryEntry {
  const xHandle = c.links.x?.replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//, "").replace(/\/$/, "");
  return {
    wallet: c.ca,
    displayName: c.name,
    xHandle: xHandle || undefined,
    bio: c.description || `Verified Kickstart founder · $${c.symbol}`,
    tokens: [c.ca],
  };
}

export function resolveFounder(c: LiveLaunch): FounderRegistryEntry {
  return registryByCa(c.ca) ?? inferFounderFromToken(c);
}

export function founderLaunches(founder: FounderRegistryEntry, feed: LiveLaunch[]): LiveLaunch[] {
  const set = new Set(founder.tokens);
  return feed
    .filter((c) => set.has(c.ca))
    .map((c) => ({
      ...c,
      lockupDays: founder.tokenLockups?.[c.ca] ?? c.lockupDays,
    }));
}

/* ─── Performance metrics ─── */

export interface LaunchPerformance {
  ca: string;
  symbol: string;
  name: string;
  ageDays: number;
  peakMcap: number;
  currentMcap: number;
  exitMultiple: number;
  survived7d: boolean;
  survived30d: boolean;
  graduated: boolean;
  verified: boolean;
}

export function computeLaunchPerformance(c: LiveLaunch, history: PricePoint[] | null): LaunchPerformance {
  const ageDays = c.pairCreatedAt ? Math.max(1, (Date.now() - c.pairCreatedAt) / 86400000) : 1;
  const prices = history?.map((p) => p.mcap).filter((m) => m > 0) ?? [];
  const peakMcap = prices.length ? Math.max(...prices, c.mcap) : c.mcap;
  const launchMcap = prices.length ? prices[0] : c.mcap || 1;
  const exitMultiple = launchMcap > 0 ? peakMcap / launchMcap : 1;
  const alive = c.mcap > 5_000;
  return {
    ca: c.ca,
    symbol: c.symbol,
    name: c.name,
    ageDays: Math.round(ageDays),
    peakMcap,
    currentMcap: c.mcap,
    exitMultiple: Math.round(exitMultiple * 10) / 10,
    survived7d: ageDays >= 7 ? alive : ageDays < 7 ? true : alive,
    survived30d: ageDays >= 30 ? alive : ageDays < 30 ? true : alive,
    graduated: isGraduated(c),
    verified: isVerified(c),
  };
}

export interface FounderMetrics {
  launchCount: number;
  avgExitMultiple: number;
  survival7d: number;
  survival30d: number;
  graduatedCount: number;
  verifiedCount: number;
  signalHitRate: number | null;
  convictionScore: number;
}

export function computeFounderMetrics(
  performances: LaunchPerformance[],
  signalHits: { total: number; hits: number } | null,
  launches?: LiveLaunch[],
): FounderMetrics {
  const n = performances.length || 1;
  const avgExit = performances.reduce((s, p) => s + p.exitMultiple, 0) / n;
  const s7 = performances.filter((p) => p.ageDays >= 7);
  const s30 = performances.filter((p) => p.ageDays >= 30);
  const survival7d = s7.length ? s7.filter((p) => p.survived7d).length / s7.length : 1;
  const survival30d = s30.length ? s30.filter((p) => p.survived30d).length / s30.length : 1;
  const hitRate = signalHits && signalHits.total > 0 ? signalHits.hits / signalHits.total : null;

  const score = launches
    ? calculateConvictionScore(launches)
    : (() => {
        let legacy = 40;
        legacy += Math.min(20, performances.filter((p) => p.graduated).length * 8);
        legacy += Math.min(15, performances.filter((p) => p.verified).length * 5);
        legacy += Math.min(15, avgExit * 3);
        legacy += survival7d * 10;
        legacy += (hitRate ?? 0.5) * 10;
        return Math.round(Math.min(99, Math.max(10, legacy)));
      })();

  return {
    launchCount: performances.length,
    avgExitMultiple: Math.round(avgExit * 10) / 10,
    survival7d: Math.round(survival7d * 100),
    survival30d: Math.round(survival30d * 100),
    graduatedCount: performances.filter((p) => p.graduated).length,
    verifiedCount: performances.filter((p) => p.verified).length,
    signalHitRate: hitRate !== null ? Math.round(hitRate * 100) : null,
    convictionScore: score,
  };
}

/* ─── On-chain forensics (heuristic from live data + registry) ─── */

export interface ForensicsReport {
  founderWallet: string;
  teamWallets: string[];
  teamConcentrationPct: number;
  devHoldingsUsd: number | null;
  postLaunchActivity: "ACTIVE" | "QUIET" | "UNKNOWN";
  rugRisk: "LOW" | "MEDIUM" | "HIGH";
  rugFlags: string[];
  priorLaunchCount: number;
}

export function computeForensics(
  founder: FounderRegistryEntry,
  launches: LiveLaunch[],
  devHoldingsUsd: number | null,
): ForensicsReport {
  const flags: string[] = [];
  const primary = launches[0];
  const holderCount = primary?.holderCount ?? 0;
  const liqRatio = primary && primary.mcap > 0 ? primary.liquidity / primary.mcap : 0;

  let rugRisk: ForensicsReport["rugRisk"] = "LOW";
  if (liqRatio < 0.1 && primary?.mcap) {
    flags.push("Thin liquidity relative to market cap");
    rugRisk = "MEDIUM";
  }
  if (primary && primary.change24h < -40) {
    flags.push("Sharp 24h drawdown");
    rugRisk = rugRisk === "MEDIUM" ? "HIGH" : "MEDIUM";
  }
  if (!isVerified(primary ?? { links: {} } as LiveLaunch)) {
    flags.push("X account not yet authorized");
  }

  const teamPct = holderCount > 50 ? Math.min(35, 8 + launches.length * 3) : 45;

  return {
    founderWallet: founder.wallet,
    teamWallets: founder.teamWallets ?? [founder.wallet],
    teamConcentrationPct: teamPct,
    devHoldingsUsd,
    postLaunchActivity: primary && (primary.buys24h + primary.sells24h) > 20 ? "ACTIVE" : primary ? "QUIET" : "UNKNOWN",
    rugRisk: flags.length === 0 ? "LOW" : rugRisk,
    rugFlags: flags,
    priorLaunchCount: Math.max(0, founder.tokens.length - 1),
  };
}

/* ─── Build-in-public feed ─── */

export function buildPublicFeed(
  founder: FounderRegistryEntry,
  launches: LiveLaunch[],
): FounderPost[] {
  const posts: FounderPost[] = [...(founder.manualPosts ?? [])];

  for (const c of launches) {
    if (c.graduatedAt) {
      posts.push({
        id: `grad-${c.ca}`,
        ts: c.graduatedAt,
        source: "kickstart",
        title: `$${c.symbol} graduated bonding curve`,
        body: `${c.name} completed its Kickstart curve and migrated to the AMM pool.`,
        url: `https://kickstart.easya.io/token/${c.ca}`,
      });
    }
    if (isVerified(c) && c.links.x) {
      posts.push({
        id: `verify-${c.ca}`,
        ts: c.pairCreatedAt ? new Date(c.pairCreatedAt).toISOString() : new Date().toISOString(),
        source: "kickstart",
        title: `$${c.symbol} verified on Kickstart`,
        body: "X account authorized via address-in-bio verification.",
        url: c.links.x,
      });
    }
  }

  if (founder.xHandle) {
    posts.push({
      id: `x-sync-${founder.wallet}`,
      ts: new Date(Date.now() - 2 * 3600000).toISOString(),
      source: "x",
      title: `@${founder.xHandle} · auto-sync queued`,
      body: "X timeline sync ships with the founder accounts backend — posts will appear here automatically.",
      url: `https://x.com/${founder.xHandle}`,
    });
  }
  if (founder.github) {
    posts.push({
      id: `gh-sync-${founder.wallet}`,
      ts: new Date(Date.now() - 6 * 3600000).toISOString(),
      source: "github",
      title: `${founder.github} · commits & releases`,
      body: "GitHub activity feed connects via public API — push events and releases surface here.",
      url: `https://github.com/${founder.github}`,
    });
  }

  return posts.sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));
}

/* ─── Community sentiment ─── */

export interface SentimentSnapshot {
  score: number;
  label: "BULLISH" | "NEUTRAL" | "BEARISH";
  buyPressure: number;
  organicScore: number | null;
  xLinked: boolean;
  websiteLinked: boolean;
  kickstartVerified: boolean;
  trend: number[];
}

export function computeSentiment(c: LiveLaunch): SentimentSnapshot {
  const trades = c.buys24h + c.sells24h;
  const buyPressure = trades > 0 ? c.buys24h / trades : 0.5;
  const momentum = c.change24h / 100;
  const organic = c.organicScore ?? null;
  const organicNorm = organic !== null ? organic / 100 : 0.5;

  let score = 50;
  score += buyPressure * 25;
  score += momentum * 20;
  score += organicNorm * 15;
  if (isVerified(c)) score += 10;
  score = Math.round(Math.min(95, Math.max(5, score)));

  const label: SentimentSnapshot["label"] = score >= 60 ? "BULLISH" : score <= 40 ? "BEARISH" : "NEUTRAL";
  const trend = [
    Math.round(score * 0.85),
    Math.round(score * 0.9),
    Math.round(score * 0.88),
    Math.round(score * 0.92),
    Math.round(score),
  ];

  return {
    score,
    label,
    buyPressure: Math.round(buyPressure * 100),
    organicScore: organic,
    xLinked: !!c.links.x,
    websiteLinked: !!c.links.website,
    kickstartVerified: isVerified(c),
    trend,
  };
}

export function filterSignalsForFounder(
  signals: ResolvedSignal[] | null,
  cas: string[],
): ResolvedSignal[] {
  if (!signals) return [];
  const set = new Set(cas);
  return signals.filter((s) => set.has(s.ca));
}

export const SOURCE_ICON: Record<FounderPost["source"], string> = {
  manual: "✍️",
  x: "𝕏",
  github: "⌥",
  kickstart: "🚀",
};
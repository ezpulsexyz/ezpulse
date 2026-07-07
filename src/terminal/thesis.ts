import {
  resolveFounder,
  computeFounderMetrics,
  computeForensics,
  computeSentiment,
  computeLaunchPerformance,
  type FounderRegistryEntry,
} from "./founders";
import type { PricePoint } from "./backend";
import {
  isVerified,
  isGraduated,
  tokenSignals,
  tokenNote,
  type LiveLaunch,
} from "./kickstart";
import type { ResolvedSignal } from "./backend";

export interface GeneratedThesis {
  verdict: "BULL CASE" | "BEAR CASE" | "NEUTRAL";
  horizon: string;
  keyMetric: string;
  thesis: string;
  risk: string;
  falsifiableClaim: string;
  resolveDate: string;
  conviction: number;
  signalSummary: string;
  founderInsight: string | null;
  sources: string[];
}

function horizonFromAge(days: number): string {
  if (days <= 7) return "7 days";
  if (days <= 14) return "14 days";
  return "30 days";
}

function resolveInDays(days: number): string {
  const d = new Date(Date.now() + days * 86400000);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function generateThesis(
  c: LiveLaunch,
  feed: LiveLaunch[],
  opts?: {
    founder?: FounderRegistryEntry;
    history?: PricePoint[] | null;
    founderSignals?: ResolvedSignal[] | null;
  },
): GeneratedThesis {
  const sigs = tokenSignals(c, feed);
  const note = tokenNote(c, feed);
  const sentiment = computeSentiment(c);
  const founder = opts?.founder ?? resolveFounder(c);
  const perf = computeLaunchPerformance(c, opts?.history ?? null);
  const signalHits = opts?.founderSignals
    ? { total: opts.founderSignals.length, hits: opts.founderSignals.filter((s) => s.hit).length }
    : null;
  const metrics = computeFounderMetrics([perf], signalHits);
  const forensics = computeForensics(founder, [c], null);

  const bulls = sigs.filter((s) => s.strength === "BULLISH").length;
  const bears = sigs.filter((s) => s.strength === "BEARISH").length;
  const whale = sigs.find((s) => s.kind === "WHALE" && s.strength !== "NEUTRAL");
  const momentum = sigs.find((s) => s.kind === "MOMENTUM");

  let score = sentiment.score;
  score += bulls * 4;
  score -= bears * 5;
  if (isVerified(c)) score += 8;
  if (isGraduated(c)) score += 6;
  if (c.change24h >= 15) score += 5;
  if (c.change24h <= -20) score -= 12;
  if (forensics.rugRisk === "HIGH") score -= 15;
  if (metrics.convictionScore >= 70) score += 5;

  const verdict: GeneratedThesis["verdict"] =
    score >= 62 ? "BULL CASE" : score <= 42 ? "BEAR CASE" : "NEUTRAL";

  const turnover = c.mcap > 0 ? (c.volume24h / c.mcap) * 100 : 0;
  const liqPct = c.mcap > 0 ? (c.liquidity / c.mcap) * 100 : 0;
  const horizon = horizonFromAge(perf.ageDays);
  const resolveDays = perf.ageDays <= 7 ? 7 : 30;

  const keyMetric = c.holderCount
    ? `Holder count — currently ${c.holderCount.toLocaleString()}, thesis breaks below ${Math.max(50, Math.round(c.holderCount * 0.75)).toLocaleString()}`
    : `24h turnover — currently ${turnover.toFixed(0)}% of cap, thesis breaks below ${Math.max(5, Math.round(turnover * 0.5))}%`;

  const thesisParts: string[] = [];
  thesisParts.push(note.note);
  if (whale) thesisParts.push(whale.detail);
  if (momentum && momentum.strength !== "NEUTRAL") thesisParts.push(momentum.detail);
  if (founder.xHandle) thesisParts.push(`Founder @${founder.xHandle} · conviction score ${metrics.convictionScore}/99.`);

  const risks: string[] = [];
  if (forensics.rugFlags.length) risks.push(...forensics.rugFlags);
  if (liqPct < 15 && c.mcap) risks.push(`Liquidity only ${liqPct.toFixed(0)}% of cap — large exits move price.`);
  if (!isVerified(c)) risks.push("X account not authorized — social proof unverified.");
  if (c.change24h <= -15) risks.push(`Down ${Math.abs(c.change24h).toFixed(0)}% in 24h — momentum against.`);
  if (!risks.length) risks.push("Micro-cap volatility — size positions to liquidity, not conviction alone.");

  const mcapTarget = verdict === "BULL CASE"
    ? Math.round(c.mcap * 1.5)
    : verdict === "BEAR CASE"
      ? Math.round(c.mcap * 0.6)
      : Math.round(c.mcap * 1.1);

  const falsifiableClaim = verdict === "BULL CASE"
    ? `Mcap ≥ $${(mcapTarget / 1000).toFixed(0)}K within ${horizon}`
    : verdict === "BEAR CASE"
      ? `Mcap ≤ $${(mcapTarget / 1000).toFixed(0)}K or 24h drawdown ≥ 25% within ${horizon}`
      : `Price holds within ±15% of current level through ${horizon}`;

  const signalSummary = `${bulls} bullish · ${bears} bearish signals firing · ecosystem sentiment ${sentiment.label} (${sentiment.score}/100).`;

  const founderInsight = founder.bio
    ? `${founder.displayName}: ${founder.bio}${metrics.signalHitRate !== null ? ` Historical signal hit rate on founder tokens: ${metrics.signalHitRate}%.` : ""}`
    : null;

  const sources = ["live DexScreener", "ezpulse signals", "founder registry"];
  if (opts?.history?.length) sources.push("ezpulse price snapshots");

  return {
    verdict,
    horizon,
    keyMetric,
    thesis: thesisParts.join(" "),
    risk: risks[0],
    falsifiableClaim,
    resolveDate: resolveInDays(resolveDays),
    conviction: Math.min(95, Math.max(20, Math.round(score))),
    signalSummary,
    founderInsight,
    sources,
  };
}
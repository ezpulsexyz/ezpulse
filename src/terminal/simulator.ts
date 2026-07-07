import type { PricePoint } from "./backend";
import type { LiveLaunch } from "./kickstart";

/** Kickstart / Meteora DBC curve start — used when no snapshot exists at pair creation. */
export const KICKSTART_LAUNCH_MCAP_USD = 5_000;

/** Window after pair creation to read earliest mcap uplift (founder initial buy on curve). */
const DEV_BUY_SNAPSHOT_WINDOW_MS = 24 * 3600000;

/** Min mcap uplift vs $5K start before we treat it as a dev buy at launch. */
const DEV_BUY_MCAP_UPLIFT_RATIO = 1.05;

export type SimEntryMode = "launch" | "days_ago";
export type LaunchEntrySource = "history" | "launch_mcap" | "dev_buy_at_launch" | "mcap_ratio" | "estimate";

export interface SimOptions {
  investUsd: number;
  entryMode?: SimEntryMode;
  /** Used when entryMode is "days_ago" — buy at the snapshot nearest this many days ago. */
  daysAgo?: number;
}

export interface LaunchSimResult {
  entryPrice: number;
  entryMcap: number;
  currentPrice: number;
  currentMcap: number;
  peakPrice: number;
  troughPrice: number;
  investUsd: number;
  tokensBought: number;
  currentValue: number;
  peakValue: number;
  troughValue: number;
  multiple: number;
  peakMultiple: number;
  troughMultiple: number;
  pnlUsd: number;
  roiPct: number;
  drawdownFromPeakPct: number;
  drawdownFromTroughPct: number;
  entryTs: number | null;
  ageDays: number;
  daysToPeak: number | null;
  annualizedRoiPct: number | null;
  chart: { ts: number; portfolioValue: number; price: number; mcap?: number }[];
  source: LaunchEntrySource;
  confidence: "high" | "low";
  entryMode: SimEntryMode;
  entryLabel: string;
  /** Kickstart curve start ($5K) before any buys. */
  startingMcap: number;
  /** Mcap uplift from founder initial buy at launch (0 if none detected). */
  devBuyMcap: number;
  /** @deprecated use entryPrice */
  launchPrice: number;
  /** @deprecated use entryTs */
  launchTs: number | null;
}

export interface SimCompareRow {
  coin: LiveLaunch;
  result: LaunchSimResult;
}

function tokenSupply(c: LiveLaunch): number | null {
  const supply = c.totalSupply ?? c.maxSupply ?? c.circulatingSupply;
  return supply && supply > 0 ? supply : null;
}

function priceFromMcap(mcap: number, supply: number | null, fallbackPrice?: number): number | null {
  if (mcap > 0 && supply && supply > 0) return mcap / supply;
  return fallbackPrice && fallbackPrice > 0 ? fallbackPrice : null;
}

function nearestSnapshot(history: PricePoint[], targetTs: number): { price: number; ts: number; mcap: number; index: number } {
  let best = 0;
  let bestDist = Math.abs(history[0].ts - targetTs);
  for (let i = 1; i < history.length; i++) {
    const d = Math.abs(history[i].ts - targetTs);
    if (d < bestDist) {
      best = i;
      bestDist = d;
    }
  }
  const p = history[best];
  return { price: p.price, ts: p.ts, mcap: p.mcap, index: best };
}

function earliestPostLaunchSnapshot(
  history: PricePoint[] | null,
  launchTs: number | null,
): { price: number; ts: number; mcap: number; index: number } | null {
  if (!history?.length || !launchTs) return null;
  const windowEnd = launchTs + DEV_BUY_SNAPSHOT_WINDOW_MS;
  let best: { price: number; ts: number; mcap: number; index: number } | null = null;
  for (let i = 0; i < history.length; i++) {
    const p = history[i];
    if (p.ts < launchTs - 60_000 || p.ts > windowEnd) continue;
    if (!best || p.ts < best.ts) {
      best = { price: p.price, ts: p.ts, mcap: p.mcap, index: i };
    }
  }
  return best?.price > 0 ? best : null;
}

/** Entry at Kickstart $5K curve start, uplifted if founder initial buy is visible in early snapshots. */
function launchEntryFromToken(
  c: LiveLaunch,
  history: PricePoint[] | null,
): {
  price: number;
  ts: number | null;
  mcap: number;
  startingMcap: number;
  devBuyMcap: number;
  source: LaunchEntrySource;
  label: string;
  sliceFrom: number;
} {
  const launchTs = c.pairCreatedAt ?? null;
  const supply = tokenSupply(c);
  const startingMcap = KICKSTART_LAUNCH_MCAP_USD;
  const postLaunch = earliestPostLaunchSnapshot(history, launchTs);

  let entryMcap = startingMcap;
  let devBuyMcap = 0;
  let source: LaunchEntrySource = "launch_mcap";
  let label = `at launch · $${(startingMcap / 1000).toFixed(0)}K start`;
  let sliceFrom = 0;
  let priceHint: number | undefined;

  if (
    postLaunch &&
    postLaunch.mcap > startingMcap * DEV_BUY_MCAP_UPLIFT_RATIO
  ) {
    entryMcap = postLaunch.mcap;
    devBuyMcap = Math.max(0, entryMcap - startingMcap);
    source = "dev_buy_at_launch";
    label = `at launch · $${(startingMcap / 1000).toFixed(0)}K start + dev buy`;
    sliceFrom = postLaunch.index;
    priceHint = postLaunch.price;
  } else if (postLaunch?.price > 0 && postLaunch.mcap > 0 && postLaunch.mcap >= startingMcap) {
    entryMcap = Math.max(startingMcap, postLaunch.mcap);
    devBuyMcap = Math.max(0, entryMcap - startingMcap);
    if (devBuyMcap > 0) {
      source = "dev_buy_at_launch";
      label = `at launch · $${(startingMcap / 1000).toFixed(0)}K start + dev buy`;
      sliceFrom = postLaunch.index;
      priceHint = postLaunch.price;
    }
  }

  const price = priceFromMcap(entryMcap, supply, priceHint)
    ?? priceFromMcap(startingMcap, supply)
    ?? (c.priceUsd > 0 && c.mcap > 0 ? c.priceUsd * (entryMcap / c.mcap) : 0);

  if (price <= 0) {
    const fallbackPrice = c.priceUsd > 0 && c.mcap > 0
      ? c.priceUsd * (startingMcap / c.mcap)
      : 0.00001;
    return {
      price: fallbackPrice,
      ts: launchTs,
      mcap: startingMcap,
      startingMcap,
      devBuyMcap: 0,
      source: "estimate",
      label: "at launch · estimated",
      sliceFrom: 0,
    };
  }

  return {
    price,
    ts: launchTs ?? postLaunch?.ts ?? null,
    mcap: entryMcap,
    startingMcap,
    devBuyMcap,
    source,
    label,
    sliceFrom,
  };
}

type ResolvedEntry = ReturnType<typeof launchEntryFromToken>;

function resolveEntry(
  c: LiveLaunch,
  history: PricePoint[] | null,
  mode: SimEntryMode,
  daysAgo: number,
): ResolvedEntry {
  if (mode === "days_ago" && history?.length) {
    const targetTs = Date.now() - daysAgo * 86400000;
    const near = nearestSnapshot(history, targetTs);
    if (near.price > 0) {
      const supply = tokenSupply(c);
      const mcap = near.mcap > 0 ? near.mcap : (supply ? near.price * supply : 0);
      return {
        price: near.price,
        ts: near.ts,
        mcap,
        startingMcap: KICKSTART_LAUNCH_MCAP_USD,
        devBuyMcap: 0,
        source: "history",
        label: `${daysAgo}d ago`,
        sliceFrom: near.index,
      };
    }
  }

  return launchEntryFromToken(c, history);
}

function annualizedRoi(multiple: number, holdDays: number): number | null {
  if (holdDays < 1 || multiple <= 0) return null;
  const years = holdDays / 365;
  if (years <= 0) return null;
  return (Math.pow(multiple, 1 / years) - 1) * 100;
}

function buildChartSeries(
  history: PricePoint[] | null,
  entry: ReturnType<typeof resolveEntry>,
  tokensBought: number,
  investUsd: number,
  livePrice: number,
): LaunchSimResult["chart"] {
  const series = history?.length
    ? history.slice(entry.sliceFrom)
    : [];

  const chart: LaunchSimResult["chart"] = [];

  if (entry.ts && (series.length === 0 || series[0].ts > entry.ts + 60_000)) {
    chart.push({
      ts: entry.ts,
      price: entry.price,
      mcap: entry.mcap,
      portfolioValue: investUsd,
    });
  }

  for (const p of series) {
    const price = p.price > 0 ? p.price : entry.price;
    chart.push({
      ts: p.ts,
      price,
      mcap: p.mcap,
      portfolioValue: tokensBought * price,
    });
  }

  const last = chart[chart.length - 1];
  const liveValue = tokensBought * livePrice;
  if (!last || Math.abs(last.price - livePrice) / Math.max(livePrice, 1e-12) > 0.002 || Date.now() - last.ts > 15 * 60_000) {
    chart.push({
      ts: Date.now(),
      price: livePrice,
      portfolioValue: liveValue,
    });
  } else if (last) {
    last.price = livePrice;
    last.portfolioValue = liveValue;
    last.ts = Date.now();
  }

  return chart.length ? chart : [{
    ts: entry.ts ?? Date.now() - 86400000,
    price: entry.price,
    mcap: entry.mcap,
    portfolioValue: investUsd,
  }, {
    ts: Date.now(),
    price: livePrice,
    portfolioValue: liveValue,
  }];
}

/** Simulate buying `investUsd` at a chosen entry point and holding to today. */
export function simulatePortfolio(
  c: LiveLaunch,
  history: PricePoint[] | null,
  options: SimOptions | number,
): LaunchSimResult | null {
  const opts: SimOptions = typeof options === "number" ? { investUsd: options } : options;
  const { investUsd, entryMode = "launch", daysAgo = 7 } = opts;
  if (investUsd <= 0 || !c.priceUsd) return null;

  const entry = resolveEntry(c, history, entryMode, Math.max(1, Math.round(daysAgo)));
  if (entry.price <= 0) return null;

  const tokensBought = investUsd / entry.price;
  const currentPrice = c.priceUsd;
  const currentMcap = c.mcap;
  const currentValue = tokensBought * currentPrice;

  const chart = buildChartSeries(history, entry, tokensBought, investUsd, currentPrice);
  const prices = chart.map((p) => p.price).filter((p) => p > 0);
  const portfolioValues = chart.map((p) => p.portfolioValue);

  const peakPrice = Math.max(...prices, currentPrice, entry.price);
  const troughPrice = Math.min(...prices, entry.price);
  const peakValue = tokensBought * peakPrice;
  const troughValue = tokensBought * troughPrice;

  const multiple = currentValue / investUsd;
  const peakMultiple = peakValue / investUsd;
  const troughMultiple = troughValue / investUsd;
  const pnlUsd = currentValue - investUsd;
  const roiPct = (pnlUsd / investUsd) * 100;
  const drawdownFromPeakPct = peakValue > 0 ? ((peakValue - currentValue) / peakValue) * 100 : 0;
  const drawdownFromTroughPct = troughValue > 0 ? ((currentValue - troughValue) / troughValue) * 100 : 0;

  const entryTs = entry.ts;
  const ageDays = entryTs ? Math.max(1, (Date.now() - entryTs) / 86400000) : 1;

  let daysToPeak: number | null = null;
  if (chart.length && entryTs) {
    let peakIdx = 0;
    let peakVal = portfolioValues[0];
    for (let i = 1; i < portfolioValues.length; i++) {
      if (portfolioValues[i] > peakVal) {
        peakVal = portfolioValues[i];
        peakIdx = i;
      }
    }
    daysToPeak = Math.round((chart[peakIdx].ts - entryTs) / 86400000);
  }

  const confidence: "high" | "low" =
    entry.source === "dev_buy_at_launch" || entry.source === "launch_mcap"
      ? "high"
      : entry.source === "history" && (history?.length ?? 0) >= 5
        ? "high"
        : "low";

  return {
    entryPrice: entry.price,
    entryMcap: entry.mcap,
    startingMcap: entry.startingMcap,
    devBuyMcap: entry.devBuyMcap,
    currentPrice,
    currentMcap,
    peakPrice,
    troughPrice,
    investUsd,
    tokensBought,
    currentValue,
    peakValue,
    troughValue,
    multiple: Math.round(multiple * 100) / 100,
    peakMultiple: Math.round(peakMultiple * 100) / 100,
    troughMultiple: Math.round(troughMultiple * 100) / 100,
    pnlUsd: Math.round(pnlUsd * 100) / 100,
    roiPct: Math.round(roiPct * 10) / 10,
    drawdownFromPeakPct: Math.round(drawdownFromPeakPct * 10) / 10,
    drawdownFromTroughPct: Math.round(drawdownFromTroughPct * 10) / 10,
    entryTs,
    ageDays: Math.round(ageDays),
    daysToPeak,
    annualizedRoiPct: annualizedRoi(multiple, ageDays) !== null
      ? Math.round((annualizedRoi(multiple, ageDays) as number) * 10) / 10
      : null,
    chart,
    source: entry.source,
    confidence,
    entryMode,
    entryLabel: entry.label,
    launchPrice: entry.price,
    launchTs: entryTs,
  };
}

/** @deprecated use simulatePortfolio */
export function simulateLaunchBuy(
  c: LiveLaunch,
  history: PricePoint[] | null,
  investUsd: number,
): LaunchSimResult | null {
  return simulatePortfolio(c, history, { investUsd, entryMode: "launch" });
}

/** Rank tokens by ROI for the same simulation settings (highest first). */
export function rankSimulations(
  rows: { coin: LiveLaunch; history: PricePoint[] | null }[],
  options: SimOptions,
): SimCompareRow[] {
  const out: SimCompareRow[] = [];
  for (const { coin, history } of rows) {
    const result = simulatePortfolio(coin, history, options);
    if (result) out.push({ coin, result });
  }
  return out.sort((a, b) => b.result.roiPct - a.result.roiPct);
}
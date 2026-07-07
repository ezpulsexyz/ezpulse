import type { PricePoint } from "./backend";
import type { LiveLaunch } from "./kickstart";

export type SimEntryMode = "launch" | "days_ago";

export interface SimOptions {
  investUsd: number;
  entryMode?: SimEntryMode;
  /** Used when entryMode is "days_ago" — buy at the snapshot nearest this many days ago. */
  daysAgo?: number;
}

export interface LaunchSimResult {
  entryPrice: number;
  currentPrice: number;
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
  chart: { ts: number; portfolioValue: number; price: number }[];
  source: "history" | "estimate";
  confidence: "high" | "low";
  entryMode: SimEntryMode;
  entryLabel: string;
  /** @deprecated use entryPrice */
  launchPrice: number;
  /** @deprecated use entryTs */
  launchTs: number | null;
}

export interface SimCompareRow {
  coin: LiveLaunch;
  result: LaunchSimResult;
}

function launchPriceFromHistory(
  history: PricePoint[] | null,
  c: LiveLaunch,
): { price: number; ts: number | null; source: "history" | "estimate" } {
  if (history?.length) {
    const first = history[0];
    if (first.price > 0) return { price: first.price, ts: first.ts, source: "history" };
  }
  if (c.pairCreatedAt && c.change24h !== 0 && c.priceUsd > 0) {
    const implied = c.priceUsd / (1 + c.change24h / 100);
    if (implied > 0) return { price: implied, ts: c.pairCreatedAt, source: "estimate" };
  }
  const est = c.priceUsd > 0 ? c.priceUsd * 0.4 : 0.00001;
  return { price: est, ts: c.pairCreatedAt ?? null, source: "estimate" };
}

function nearestSnapshot(history: PricePoint[], targetTs: number): { price: number; ts: number; index: number } {
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
  return { price: p.price, ts: p.ts, index: best };
}

function resolveEntry(
  c: LiveLaunch,
  history: PricePoint[] | null,
  mode: SimEntryMode,
  daysAgo: number,
): { price: number; ts: number | null; source: "history" | "estimate"; label: string; sliceFrom: number } {
  if (mode === "days_ago" && history?.length) {
    const targetTs = Date.now() - daysAgo * 86400000;
    const { price, ts, index } = nearestSnapshot(history, targetTs);
    if (price > 0) {
      return {
        price,
        ts,
        source: "history",
        label: `${daysAgo}d ago`,
        sliceFrom: index,
      };
    }
  }

  const launch = launchPriceFromHistory(history, c);
  return {
    ...launch,
    label: "at launch",
    sliceFrom: 0,
  };
}

function annualizedRoi(multiple: number, holdDays: number): number | null {
  if (holdDays < 1 || multiple <= 0) return null;
  const years = holdDays / 365;
  if (years <= 0) return null;
  return (Math.pow(multiple, 1 / years) - 1) * 100;
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
  const currentValue = tokensBought * c.priceUsd;

  const series = history?.length
    ? history.slice(entry.sliceFrom)
    : [{ ts: entry.ts ?? Date.now() - 86400000, price: entry.price, mcap: 0 }];

  const prices = series.map((p) => p.price).filter((p) => p > 0);
  const portfolioValues = series.map((p) => tokensBought * (p.price > 0 ? p.price : entry.price));

  const peakPrice = Math.max(...prices, c.priceUsd, entry.price);
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
  if (series.length && entryTs) {
    let peakIdx = 0;
    let peakVal = portfolioValues[0];
    for (let i = 1; i < portfolioValues.length; i++) {
      if (portfolioValues[i] > peakVal) {
        peakVal = portfolioValues[i];
        peakIdx = i;
      }
    }
    daysToPeak = Math.round((series[peakIdx].ts - entryTs) / 86400000);
  }

  const chart = series.map((p) => ({
    ts: p.ts,
    price: p.price,
    portfolioValue: tokensBought * (p.price > 0 ? p.price : entry.price),
  }));

  const confidence: "high" | "low" =
    entry.source === "history" && (history?.length ?? 0) >= 5 ? "high" : "low";

  return {
    entryPrice: entry.price,
    currentPrice: c.priceUsd,
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
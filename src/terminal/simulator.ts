import type { PricePoint } from "./backend";
import type { LiveLaunch } from "./kickstart";

export interface LaunchSimResult {
  launchPrice: number;
  currentPrice: number;
  peakPrice: number;
  investUsd: number;
  tokensBought: number;
  currentValue: number;
  peakValue: number;
  multiple: number;
  peakMultiple: number;
  drawdownFromPeakPct: number;
  launchTs: number | null;
  ageDays: number;
  chart: { ts: number; portfolioValue: number; price: number }[];
  source: "history" | "estimate";
}

function launchPriceFromHistory(history: PricePoint[] | null, c: LiveLaunch): { price: number; ts: number | null; source: "history" | "estimate" } {
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

/** Simulate buying `investUsd` at launch (first snapshot or pair creation). */
export function simulateLaunchBuy(
  c: LiveLaunch,
  history: PricePoint[] | null,
  investUsd: number,
): LaunchSimResult | null {
  if (investUsd <= 0 || !c.priceUsd) return null;

  const { price: launchPrice, ts: launchTs, source } = launchPriceFromHistory(history, c);
  if (launchPrice <= 0) return null;

  const tokensBought = investUsd / launchPrice;
  const currentValue = tokensBought * c.priceUsd;
  const prices = history?.map((p) => p.price).filter((p) => p > 0) ?? [launchPrice, c.priceUsd];
  const peakPrice = Math.max(...prices, c.priceUsd);
  const peakValue = tokensBought * peakPrice;
  const multiple = currentValue / investUsd;
  const peakMultiple = peakValue / investUsd;
  const drawdownFromPeakPct = peakValue > 0 ? ((peakValue - currentValue) / peakValue) * 100 : 0;
  const ageDays = launchTs ? Math.max(1, (Date.now() - launchTs) / 86400000) : 1;

  const chart = (history?.length ? history : [{ ts: launchTs ?? Date.now() - 86400000, price: launchPrice, mcap: 0 }])
    .map((p) => ({
      ts: p.ts,
      price: p.price,
      portfolioValue: tokensBought * p.price,
    }));

  return {
    launchPrice,
    currentPrice: c.priceUsd,
    peakPrice,
    investUsd,
    tokensBought,
    currentValue,
    peakValue,
    multiple: Math.round(multiple * 100) / 100,
    peakMultiple: Math.round(peakMultiple * 100) / 100,
    drawdownFromPeakPct: Math.round(drawdownFromPeakPct * 10) / 10,
    launchTs,
    ageDays: Math.round(ageDays),
    chart,
    source,
  };
}
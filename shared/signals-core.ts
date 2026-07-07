/**
 * Canonical signal engine — shared by the live UI (kickstart.ts) and the
 * snapshot Edge Function (supabase/functions/snapshot). Keep thresholds here
 * so archived track-record signals match what users see in the feed.
 */

export type SignalKind = "MOMENTUM" | "VOLUME" | "LIQUIDITY" | "RANK" | "VERIFY" | "RISK" | "WHALE" | "LAUNCH";
export type SignalStrength = "BULLISH" | "NEUTRAL" | "BEARISH";

export interface SignalMetrics {
  symbol: string;
  mcap: number;
  change24h: number;
  volume24h: number;
  volume1h: number;
  liquidity: number;
  buys24h: number;
  sells24h: number;
  buys1h: number;
  sells1h: number;
  rank?: number;
  verified?: boolean;
  pairAgeDays?: number;
}

export interface CoreSignal {
  kind: SignalKind;
  strength: SignalStrength;
  title: string;
}

export interface ArchivableSignal extends CoreSignal {
  /** Stable dedupe key: ca:kind:strength */
  key: string;
}

export const SIGNAL_KINDS: SignalKind[] = ["WHALE", "MOMENTUM", "VOLUME", "LIQUIDITY", "RANK", "LAUNCH"];

export const KIND_ICON: Record<string, string> = {
  WHALE: "🐋",
  MOMENTUM: "📈",
  VOLUME: "🔊",
  LIQUIDITY: "💧",
  RANK: "👑",
  LAUNCH: "🚀",
  VERIFY: "✓",
  RISK: "⚠️",
};

/** Score a +24h price move against the called direction. */
export function signalHit(strength: SignalStrength, change24h: number): boolean {
  if (strength === "NEUTRAL") return Math.abs(change24h) < 5;
  return strength === "BULLISH" ? change24h > 0 : change24h < 0;
}

export function whaleSignal(m: SignalMetrics): CoreSignal | null {
  const trades24 = m.buys24h + m.sells24h;
  if (trades24 < 5 || m.volume24h <= 0) return null;

  const avgTrade = m.volume24h / trades24;
  const bigTrade = avgTrade >= 400;
  const flow = (m.buys24h - m.sells24h) / trades24;
  const oneSided = Math.abs(flow) >= 0.25;
  const burst = m.volume1h > 0 && m.volume24h > 0 && m.volume1h >= m.volume24h * 0.25;

  if (!bigTrade && !oneSided && !burst) return null;

  if (burst && (m.buys1h > m.sells1h * 2 || m.sells1h > m.buys1h * 2)) {
    const buying = m.buys1h >= m.sells1h;
    return {
      kind: "WHALE",
      strength: buying ? "BULLISH" : "BEARISH",
      title: buying
        ? `Whale accumulation burst on $${m.symbol}`
        : `Whale exit burst on $${m.symbol}`,
    };
  }
  if (bigTrade && oneSided) {
    const buying = flow > 0;
    return {
      kind: "WHALE",
      strength: buying ? "BULLISH" : "BEARISH",
      title: buying
        ? `Large buyers active on $${m.symbol}`
        : `Large sellers active on $${m.symbol}`,
    };
  }
  return null;
}

/** Signals written to signal_events — directional only, same rules as the cron. */
export function archivableSignals(
  ca: string,
  m: SignalMetrics,
  ctx?: { avgTurnover: number },
): ArchivableSignal[] {
  const out: ArchivableSignal[] = [];
  const push = (kind: SignalKind, strength: SignalStrength, title: string) => {
    if (strength === "NEUTRAL") return;
    out.push({ kind, strength, title, key: `${ca}:${kind}:${strength}` });
  };

  const turnover = m.mcap > 0 ? m.volume24h / m.mcap : 0;
  const liqRatio = m.mcap > 0 ? m.liquidity / m.mcap : 0;
  const avgTurnover = ctx?.avgTurnover ?? 0.15;

  const whale = whaleSignal(m);
  if (whale && whale.strength !== "NEUTRAL") push(whale.kind, whale.strength, whale.title);

  if (m.change24h >= 15) {
    push("MOMENTUM", "BULLISH", `+${m.change24h.toFixed(1)}% in 24h on $${m.symbol}`);
  } else if (m.change24h <= -15) {
    push("MOMENTUM", "BEARISH", `${m.change24h.toFixed(1)}% drawdown on $${m.symbol}`);
  }

  if (turnover >= Math.max(avgTurnover * 1.5, 0.3)) {
    push("VOLUME", "BULLISH", `Turnover ${(turnover * 100).toFixed(0)}% of cap on $${m.symbol}`);
  } else if (turnover < 0.05 && m.mcap > 0) {
    push("VOLUME", "BEARISH", `Volume drying up on $${m.symbol}`);
  }

  if (liqRatio >= 0.4) {
    push("LIQUIDITY", "BULLISH", `Deep liquidity on $${m.symbol}`);
  } else if (liqRatio > 0 && liqRatio < 0.1) {
    push("LIQUIDITY", "BEARISH", `Thin pool on $${m.symbol}`);
  }

  if (m.rank === 1) {
    push("RANK", "BULLISH", `#1 by market cap: $${m.symbol}`);
  }

  if (m.pairAgeDays !== undefined && m.pairAgeDays <= 1) {
    push("LAUNCH", "BULLISH", `New launch: $${m.symbol}`);
  }

  return out;
}

/** Ecosystem-wide weight for feed ordering (higher = more significant). */
export function signalWeight(kind: SignalKind, strength: SignalStrength, m: SignalMetrics): number {
  if (kind === "LAUNCH") return 90 - (m.pairAgeDays ?? 0) * 8;
  if (kind === "WHALE") return 85;
  if (kind === "MOMENTUM") return Math.abs(m.change24h) * 2;
  if (kind === "VOLUME") return m.mcap > 0 ? Math.min((m.volume24h / m.mcap) * 60, 70) : 10;
  if (kind === "LIQUIDITY") return strength === "BEARISH" ? 40 : 30;
  if (kind === "RANK") return 45;
  if (kind === "VERIFY") return strength === "BEARISH" ? 35 : 25;
  return 20;
}

/** Find snapshot price closest to targetTs (ms). Returns null if none within maxDriftMs. */
export function priceAtTarget(
  snapshots: { ts: number; price: number }[],
  targetTs: number,
  maxDriftMs = 2 * 3600_000,
): number | null {
  if (!snapshots.length) return null;
  let best = snapshots[0];
  let bestDrift = Math.abs(best.ts - targetTs);
  for (const s of snapshots) {
    const drift = Math.abs(s.ts - targetTs);
    if (drift < bestDrift) {
      best = s;
      bestDrift = drift;
    }
  }
  return bestDrift <= maxDriftMs ? best.price : null;
}
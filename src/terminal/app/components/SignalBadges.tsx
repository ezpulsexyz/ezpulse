import { KIND_ICON } from "../../kickstart";
import type { SignalKind, SignalStrength } from "../../../../shared/signals-core";

export function KindBadge({ kind }: { kind: string }) {
  return (
    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[8px] font-bold tracking-widest text-zinc-500">
      {KIND_ICON[kind] ?? "•"} {kind}
    </span>
  );
}

export function StrengthBadge({ strength }: { strength: SignalStrength | string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[8px] font-black tracking-widest text-white ${
      strength === "BULLISH" ? "bg-emerald-600" : strength === "BEARISH" ? "bg-red-500" : "bg-zinc-400"
    }`}>{strength}</span>
  );
}

export function HitRateBadge({ rate, total }: { rate: number; total: number }) {
  if (total < 3) return null;
  const pct = Math.round(rate * 100);
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[8px] font-bold tabular-nums ${
        rate >= 0.5 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
      }`}
      title={`${pct}% hit rate across ${total} archived ${total === 1 ? "signal" : "signals"}`}
    >
      {pct}% track record
    </span>
  );
}

export function signalIcon(kind: SignalKind | string, strength: string): string {
  if (kind === "WHALE") return "🐋";
  if (kind === "LAUNCH") return "🚀";
  if (kind === "MOMENTUM") return strength === "BULLISH" ? "📈" : "📉";
  if (kind === "VOLUME") return "🔊";
  if (kind === "LIQUIDITY") return "💧";
  if (kind === "RANK") return "👑";
  return "✓";
}
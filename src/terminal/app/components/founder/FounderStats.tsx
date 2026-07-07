import { fmtUsd } from "../../../data";
import { Stat } from "../../../components";
import type { FounderProfile } from "../../types";

export function FounderStats({ founder }: { founder: FounderProfile }) {
  const { stats, metrics, sentiment } = founder;
  const best = stats.bestLaunch;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 p-6 text-white shadow-sm">
        <div className="text-sm opacity-75">Conviction Score</div>
        <div className="mt-1 text-5xl font-semibold tabular-nums">{stats.convictionScore}</div>
        <div className="mt-2 text-xs opacity-75">Based on history, performance & lockup commitment</div>
      </div>
      <Stat label="Success rate" value={`${stats.successRate}%`} sub="launches that bonded" accent />
      <Stat
        label="Best launch"
        value={best ? `$${best.symbol}` : "—"}
        sub={best ? fmtUsd(best.mcap) : ""}
      />
      <Stat
        label="Avg 24h"
        value={`${stats.avgPerformance24h >= 0 ? "+" : ""}${stats.avgPerformance24h}%`}
        sub="across launches"
      />
      <Stat label="Total launches" value={String(stats.totalLaunches)} sub={`${metrics.verifiedCount} verified`} />
      <Stat label="Total mcap" value={fmtUsd(stats.totalMcapLaunched)} sub="live · all launches" />
      <Stat label="Avg exit ×" value={`${metrics.avgExitMultiple}×`} sub="peak / launch mcap" />
      <Stat label="Signal hits" value={metrics.signalHitRate !== null ? `${metrics.signalHitRate}%` : "—"} sub="founder tokens · +24h" />
      <div className={`col-span-2 rounded-2xl px-4 py-3.5 text-white shadow-sm ${sentiment.label === "BULLISH" ? "bg-emerald-600" : sentiment.label === "BEARISH" ? "bg-red-500" : "bg-zinc-600"}`}>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-white/60">Market sentiment</div>
        <div className="mt-1 font-display text-xl font-semibold">{sentiment.label}</div>
        <div className="mt-0.5 text-[11px] text-white/70">score {sentiment.score}/100 · {sentiment.buyPressure}% buy pressure</div>
      </div>
    </div>
  );
}
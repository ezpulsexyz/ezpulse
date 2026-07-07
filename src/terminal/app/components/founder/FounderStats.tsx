import { fmtUsd } from "../../../data";
import { Stat } from "../../../components";
import type { FounderProfile } from "../../types";

export function FounderStats({ founder }: { founder: FounderProfile }) {
  const { metrics, performances, sentiment } = founder;
  const bestLaunch = performances.length
    ? performances.reduce((a, b) => (b.exitMultiple > a.exitMultiple ? b : a))
    : null;

  return (
    <div className="grid grid-cols-2 gap-3">
      <Stat label="Success rate" value={`${founder.successRate}%`} sub="launches that bonded" accent />
      <Stat label="Avg exit multiple" value={`${metrics.avgExitMultiple}×`} sub="peak mcap / launch mcap" />
      <Stat label="Best launch" value={bestLaunch ? `$${bestLaunch.symbol}` : "—"} sub={bestLaunch ? `${bestLaunch.exitMultiple}× peak` : ""} />
      <Stat label="Active projects" value={String(metrics.launchCount)} sub={`${metrics.verifiedCount} verified`} />
      <Stat label="7d survival" value={`${metrics.survival7d}%`} sub="mcap &gt; $5K" />
      <Stat label="30d survival" value={`${metrics.survival30d}%`} sub="still trading" />
      <Stat label="Signal hit rate" value={metrics.signalHitRate !== null ? `${metrics.signalHitRate}%` : "—"} sub="founder tokens · +24h" />
      <Stat label="Total mcap" value={fmtUsd(founder.totalMcapLaunched)} sub="live · all launches" />
      <div className={`col-span-2 rounded-2xl px-4 py-3.5 text-white shadow-sm ${sentiment.label === "BULLISH" ? "bg-emerald-600" : sentiment.label === "BEARISH" ? "bg-red-500" : "bg-zinc-600"}`}>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-white/60">Market sentiment</div>
        <div className="mt-1 font-display text-xl font-semibold">{sentiment.label}</div>
        <div className="mt-0.5 text-[11px] text-white/70">score {sentiment.score}/100 · {sentiment.buyPressure}% buy pressure</div>
      </div>
    </div>
  );
}
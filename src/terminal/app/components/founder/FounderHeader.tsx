import { BLUE } from "../../../components";
import type { FounderProfile } from "../../types";

export function FounderHeader({ founder }: { founder: FounderProfile }) {
  const { founder: entry, metrics, primaryToken, totalMcapLaunched, successRate } = founder;
  const icon = primaryToken?.icon;

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white px-5 py-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-[9px] font-black tracking-widest text-white">FOUNDER TERMINAL</span>
          {primaryToken && (
            <span className="text-[11px] font-semibold text-indigo-600">Verified · ${primaryToken.symbol}</span>
          )}
        </div>
        <div className="mt-3 flex items-start gap-3">
          {icon ? (
            <img src={icon} alt="" className="h-12 w-12 shrink-0 rounded-full border border-zinc-100" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-lg">👤</div>
          )}
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-zinc-900">{entry.displayName}</h2>
            {entry.bio && <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-zinc-500">{entry.bio}</p>}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {entry.xHandle && (
            <a href={`https://x.com/${entry.xHandle}`} target="_blank" rel="noopener noreferrer"
              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-700 transition hover:border-indigo-300">
              𝕏 @{entry.xHandle}
            </a>
          )}
          {entry.github && (
            <a href={`https://github.com/${entry.github}`} target="_blank" rel="noopener noreferrer"
              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-700 transition hover:border-indigo-300">
              GitHub ↗
            </a>
          )}
          <a href={`https://solscan.io/account/${entry.wallet}`} target="_blank" rel="noopener noreferrer"
            className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 font-mono text-[11px] text-zinc-500 transition hover:border-indigo-300">
            {entry.wallet.slice(0, 4)}…{entry.wallet.slice(-4)} ⧉
          </a>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-zinc-500">
          <span><strong className="text-zinc-800">{metrics.launchCount}</strong> launches</span>
          <span><strong className="text-zinc-800">{successRate}%</strong> bonded</span>
          <span><strong className="text-zinc-800">${totalMcapLaunched >= 1_000_000 ? `${(totalMcapLaunched / 1_000_000).toFixed(1)}M` : totalMcapLaunched >= 1000 ? `${(totalMcapLaunched / 1000).toFixed(0)}K` : totalMcapLaunched.toFixed(0)}</strong> total mcap launched</span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-center rounded-2xl border border-indigo-200 bg-white px-6 py-4 shadow-sm">
        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Conviction Score</div>
        <div className="relative mt-1 flex h-20 w-20 items-center justify-center">
          <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e4e4e7" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.5" fill="none" stroke={BLUE} strokeWidth="3"
              strokeDasharray={`${metrics.convictionScore} 100`} strokeLinecap="round" />
          </svg>
          <span className="absolute font-display text-xl font-bold text-indigo-700">{metrics.convictionScore}</span>
        </div>
        <div className="mt-1 text-[10px] text-zinc-400">history + on-chain</div>
      </div>
    </div>
  );
}
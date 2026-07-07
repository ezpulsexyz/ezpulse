import type { ReactNode } from "react";
import { BLUE, Delta } from "../../components";
import { fmtUsd } from "../../data";
import { fmtPrice, isVerified, kickstartUrl, type LiveLaunch } from "../../kickstart";
import { CurveBadge } from "./CurveBadge";

export function CoinRow({ c, i, onOpen, copiedCa, copyCa, metric, watched, onWatch, onShare }: {
  c: LiveLaunch; i: number; onOpen: (c: LiveLaunch) => void; copiedCa: string | null; copyCa: (ca: string) => void; metric?: React.ReactNode;
  watched?: boolean; onWatch?: (ca: string) => void; onShare?: (c: LiveLaunch) => void;
}) {
  return (
    <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 border-b border-zinc-50 px-5 py-3 text-left transition last:border-0 hover:bg-indigo-50/30">
      <span className={`w-5 text-[12px] font-semibold tabular-nums ${i < 3 ? "text-indigo-600" : "text-zinc-300"}`}>{i + 1}</span>
      <button onClick={() => onOpen(c)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        {c.icon && <img src={c.icon} alt="" className="h-7 w-7 rounded-full border border-zinc-100" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[14px] font-semibold text-zinc-900">{c.name}</span>
            <span className="text-[11px] font-semibold text-zinc-400">${c.symbol}</span>
            {isVerified(c) && <span className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black text-white" style={{ background: BLUE }} title="Verified — X account authorized (address-in-bio). Confirms the link only, not the project — DYOR.">✓</span>}
            <CurveBadge c={c} />
            {c.pairCreatedAt && Date.now() - c.pairCreatedAt < 3 * 86400000 && (
              <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[8px] font-black tracking-widest text-red-500">NEW</span>
            )}
            {typeof c.holderCount === "number" && c.holderCount > 0 && (
              <span className="hidden text-[10px] text-zinc-400 xl:inline" title="Holders · via Jupiter">👥 {c.holderCount}</span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span onClick={(e) => { e.stopPropagation(); copyCa(c.ca); }} title={c.ca}
              className="flex cursor-pointer items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-700">
              {copiedCa === c.ca ? "✓ copied" : (
                <>{c.ca.slice(0, 4)}…{/easy$/i.test(c.ca)
                  ? <><span>{c.ca.slice(-8, -4)}</span><span className="font-black text-indigo-600">{c.ca.slice(-4)}</span></>
                  : c.ca.slice(-4)} ⧉</>
              )}
            </span>
            <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">SOL</span>
            {/* mobile-only inline metrics (columns hidden below lg) */}
            <span className="text-[11px] font-semibold tabular-nums text-zinc-700 lg:hidden">{c.mcap ? fmtUsd(c.mcap) : "—"}</span>
            <span className={`text-[11px] font-semibold tabular-nums lg:hidden ${c.change24h >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {c.change24h >= 0 ? "▲" : "▼"}{Math.abs(c.change24h).toFixed(1)}%
            </span>
          </div>
        </div>
      </button>
      {metric ?? (
        <>
          <span className="hidden w-20 text-right text-[13px] font-semibold tabular-nums text-zinc-800 lg:block">{c.priceUsd ? fmtPrice(c.priceUsd) : "—"}</span>
          <span className="hidden w-16 text-right lg:block"><Delta v={c.change24h} suffix="%" /></span>
          <span className="hidden w-20 text-right text-[13px] font-semibold tabular-nums text-zinc-800 lg:block">{c.mcap ? fmtUsd(c.mcap) : "—"}</span>
          <span className="hidden w-20 text-right text-[12px] tabular-nums text-zinc-500 lg:block">{c.volume24h ? fmtUsd(c.volume24h) : "—"}</span>
        </>
      )}
      {onWatch && (
        <button onClick={() => onWatch(c.ca)} title={watched ? "Remove from watchlist" : "Add to watchlist"}
          className={`text-[16px] transition hover:scale-110 ${watched ? "text-amber-500" : "text-zinc-300 hover:text-amber-400"}`}>
          {watched ? "★" : "☆"}
        </button>
      )}
      {onShare && (
        <button onClick={() => onShare(c)} title="Share card"
          className="hidden h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 bg-white text-[11px] text-zinc-500 transition hover:-translate-y-px hover:border-indigo-300 hover:text-indigo-700 sm:flex">
          📤
        </button>
      )}
      <a href={kickstartUrl(c.ca)} target="_blank" rel="noopener noreferrer" title="Open on Kickstart"
        onClick={(e) => e.stopPropagation()}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50/50 text-[12px] transition hover:-translate-y-px hover:border-indigo-300">
        🚀
      </a>
      <button onClick={() => onOpen(c)} className="rounded-lg bg-zinc-900 px-2.5 py-1.5 text-[10px] font-bold text-white transition hover:-translate-y-px">
        📟 Terminal
      </button>
    </div>
  );
}

export function ColumnHead() {
  return (
    <div className="hidden items-center gap-3 border-b border-zinc-100 px-5 py-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 lg:flex">
      <span className="w-5">#</span>
      <span className="flex-1">Token</span>
      <span className="w-20 text-right">Price</span>
      <span className="w-16 text-right">24h</span>
      <span className="w-20 text-right">MCap</span>
      <span className="w-20 text-right">Vol 24h</span>
      <span className="w-20 text-right" />
    </div>
  );
}

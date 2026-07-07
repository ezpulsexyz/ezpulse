import { BLUE, Delta } from "../../components";
import { fmtUsd } from "../../data";
import { fmtPrice, isVerified, kickstartUrl, type LiveLaunch } from "../../kickstart";
import { CurveBadge } from "./CurveBadge";
import { COIN_COLS, COIN_GRID, TermActions, TermHead, TermHeadCell, TermNum, TermRow } from "./TermTable";

export function CoinRow({ c, i, onOpen, copiedCa, copyCa, metric, watched, onWatch, onShare }: {
  c: LiveLaunch; i: number; onOpen: (c: LiveLaunch) => void; copiedCa: string | null; copyCa: (ca: string) => void; metric?: React.ReactNode;
  watched?: boolean; onWatch?: (ca: string) => void; onShare?: (c: LiveLaunch) => void;
}) {
  return (
    <TermRow grid={COIN_GRID}>
      <TermNum className={`text-left ${i < 3 ? "font-bold text-indigo-600" : "text-zinc-400"}`}>{i + 1}</TermNum>

      <button onClick={() => onOpen(c)} className="min-w-0 text-left">
        <div className="flex min-w-0 items-center gap-2.5">
          {c.icon && <img src={c.icon} alt="" className="h-7 w-7 shrink-0 rounded-full border border-zinc-100" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate font-mono text-[13px] font-semibold text-zinc-900">{c.name}</span>
              <span className="shrink-0 font-mono text-[11px] text-zinc-400">${c.symbol}</span>
              {isVerified(c) && <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-black text-white" style={{ background: BLUE }} title="Verified">✓</span>}
              <CurveBadge c={c} />
              {c.pairCreatedAt && Date.now() - c.pairCreatedAt < 3 * 86400000 && (
                <span className="shrink-0 rounded-full bg-red-50 px-1.5 py-0.5 font-mono text-[8px] font-black tracking-widest text-red-500">NEW</span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span onClick={(e) => { e.stopPropagation(); copyCa(c.ca); }} title={c.ca}
                className="inline-flex cursor-pointer items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-700">
                {copiedCa === c.ca ? "✓ copied" : (
                  <>{c.ca.slice(0, 4)}…{/easy$/i.test(c.ca)
                    ? <><span>{c.ca.slice(-8, -4)}</span><span className="font-black text-indigo-600">{c.ca.slice(-4)}</span></>
                    : c.ca.slice(-4)} ⧉</>
                )}
              </span>
              <span className="rounded bg-violet-50 px-1.5 py-0.5 font-mono text-[9px] font-bold text-violet-600">SOL</span>
              <span className="font-mono text-[11px] text-zinc-600 lg:hidden">{c.mcap ? fmtUsd(c.mcap) : "—"}</span>
              <span className={`font-mono text-[11px] lg:hidden ${c.change24h >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {c.change24h >= 0 ? "▲" : "▼"}{Math.abs(c.change24h).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </button>

      {metric ?? (
        <>
          <TermNum className="hidden lg:block">{c.priceUsd ? fmtPrice(c.priceUsd) : "—"}</TermNum>
          <span className="hidden justify-end lg:flex"><Delta v={c.change24h} suffix="%" /></span>
          <TermNum className="hidden lg:block" bold>{c.mcap ? fmtUsd(c.mcap) : "—"}</TermNum>
          <TermNum className="hidden text-zinc-500 lg:block">{c.volume24h ? fmtUsd(c.volume24h) : "—"}</TermNum>
        </>
      )}

      <TermActions>
        {onWatch && (
          <button onClick={() => onWatch(c.ca)} title={watched ? "Remove from watchlist" : "Add to watchlist"}
            className={`font-mono text-[15px] transition hover:scale-110 ${watched ? "text-amber-500" : "text-zinc-300 hover:text-amber-400"}`}>
            {watched ? "★" : "☆"}
          </button>
        )}
        {onShare && (
          <button onClick={() => onShare(c)} title="Share card"
            className="hidden h-7 w-7 items-center justify-center rounded border border-zinc-200 bg-white font-mono text-[10px] text-zinc-500 transition hover:border-indigo-300 hover:text-indigo-700 sm:flex">
            📤
          </button>
        )}
        <a href={kickstartUrl(c.ca)} target="_blank" rel="noopener noreferrer" title="Open on Kickstart"
          onClick={(e) => e.stopPropagation()}
          className="flex h-7 w-7 items-center justify-center rounded border border-indigo-100 bg-indigo-50/50 font-mono text-[11px] transition hover:border-indigo-300">
          🚀
        </a>
        <button onClick={() => onOpen(c)} className="rounded bg-zinc-900 px-2 py-1.5 font-mono text-[10px] font-bold text-white transition hover:-translate-y-px">
          📟
        </button>
      </TermActions>
    </TermRow>
  );
}

export function ColumnHead() {
  return (
    <TermHead cols={COIN_COLS}>
      <TermHeadCell>#</TermHeadCell>
      <TermHeadCell>Token</TermHeadCell>
      <TermHeadCell align="right">Price</TermHeadCell>
      <TermHeadCell align="right">24h</TermHeadCell>
      <TermHeadCell align="right">MCap</TermHeadCell>
      <TermHeadCell align="right">Vol</TermHeadCell>
      <TermHeadCell align="right">Act</TermHeadCell>
    </TermHead>
  );
}
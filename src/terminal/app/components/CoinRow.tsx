import { terminalHref } from "../../../routes";
import { BLUE, Delta } from "../../components";
import CategoryTag from "../../components/CategoryTag";
import { fmtUsd } from "../../data";
import { fmtPrice, isVerified, kickstartUrl, type LiveLaunch } from "../../kickstart";
import { CurveBadge } from "./CurveBadge";
import { COIN_COLS, TermHead, TermHeadCell } from "./TermTable";

export interface CoinRowProps {
  c: LiveLaunch;
  i: number;
  onOpen: (c: LiveLaunch) => void;
  copiedCa?: string | null;
  copyCa?: (ca: string) => void;
  metric?: React.ReactNode;
  watched?: boolean;
  onWatch?: (ca: string) => void;
  onShare?: (c: LiveLaunch) => void;
}

export function CoinRow({
  c,
  i,
  onOpen,
  copiedCa,
  copyCa,
  metric,
  watched,
  onWatch,
  onShare,
}: CoinRowProps) {
  return (
    <a
      href={terminalHref({ section: "projects", projectCa: c.ca })}
      onClick={(e) => {
        e.preventDefault();
        onOpen(c);
      }}
      className="coin-row flex cursor-pointer flex-col gap-x-4 gap-y-3 border-b border-zinc-50 px-4 py-4 no-underline transition active:bg-zinc-50 lg:flex-row lg:items-center lg:px-5"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className={`w-5 shrink-0 text-sm font-semibold tabular-nums ${
            i < 3 ? "text-blue-600" : "text-zinc-300"
          }`}
        >
          {i + 1}
        </span>

        {c.icon && (
          <img
            src={c.icon}
            alt=""
            className="h-8 w-8 shrink-0 rounded-full border border-zinc-100"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate-mobile lg:max-w-none truncate font-semibold text-zinc-900">
              {c.name}
            </span>
            <span className="shrink-0 text-xs text-zinc-400">${c.symbol}</span>
            {c.pairCreatedAt && Date.now() - c.pairCreatedAt < 3 * 86400000 && (
              <span className="shrink-0 rounded-full bg-red-50 px-1.5 py-0.5 text-[8px] font-black tracking-widest text-red-500">
                NEW
              </span>
            )}
          </div>

          {c.categories && c.categories.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {c.categories.slice(0, 3).map((cat) => (
                <CategoryTag key={cat} category={cat} size="sm" />
              ))}
            </div>
          )}

          <div className="mt-1 flex flex-wrap items-center gap-2">
            {isVerified(c) && (
              <span
                className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black text-white"
                style={{ background: BLUE }}
                title="Verified"
              >
                ✓
              </span>
            )}
            <CurveBadge c={c} />
            {copyCa && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  copyCa(c.ca);
                }}
                title={c.ca}
                className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 transition hover:bg-zinc-200"
              >
                {copiedCa === c.ca ? "✓ copied" : `${c.ca.slice(0, 4)}…${c.ca.slice(-4)}`}
              </button>
            )}
          </div>
        </div>

        <div className="shrink-0 text-right lg:hidden">
          <div className="font-mono text-sm font-semibold">{c.mcap ? fmtUsd(c.mcap) : "—"}</div>
          <Delta v={c.change24h} suffix="%" />
        </div>
      </div>

      {metric ?? (
        <div className="hidden flex-1 items-center gap-4 lg:flex">
          <div className="w-24 text-right font-mono text-sm">{c.priceUsd ? fmtPrice(c.priceUsd) : "—"}</div>
          <div className="w-16 text-right">
            <Delta v={c.change24h} suffix="%" />
          </div>
          <div className="w-24 text-right font-mono text-sm font-semibold">
            {c.mcap ? fmtUsd(c.mcap) : "—"}
          </div>
          <div className="w-24 text-right text-sm text-zinc-500">
            {c.volume24h ? fmtUsd(c.volume24h) : "—"}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 lg:ml-auto">
        {onWatch && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onWatch(c.ca);
            }}
            title={watched ? "Remove from watchlist" : "Add to watchlist"}
            className={`px-2 text-xl transition ${watched ? "text-amber-500" : "text-zinc-300 hover:text-amber-400"}`}
          >
            {watched ? "★" : "☆"}
          </button>
        )}

        {onShare && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onShare(c);
            }}
            title="Share card"
            className="hidden h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 text-sm text-zinc-500 transition hover:border-indigo-300 sm:flex"
          >
            📤
          </button>
        )}

        <a
          href={kickstartUrl(c.ca)}
          target="_blank"
          rel="noopener noreferrer"
          title="Open on Kickstart"
          onClick={(e) => e.stopPropagation()}
          className="hidden h-9 w-9 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50/50 text-sm transition hover:border-indigo-300 sm:flex"
        >
          🚀
        </a>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(c);
          }}
          className="rounded-xl bg-zinc-900 px-4 py-1.5 text-xs font-bold text-white active:bg-black"
        >
          Terminal
        </button>
      </div>
    </a>
  );
}

export function ColumnHead() {
  return (
    <div className="hidden lg:block">
      <TermHead cols={COIN_COLS}>
        <TermHeadCell>#</TermHeadCell>
        <TermHeadCell>Token</TermHeadCell>
        <TermHeadCell align="right">Price</TermHeadCell>
        <TermHeadCell align="right">24h</TermHeadCell>
        <TermHeadCell align="right">MCap</TermHeadCell>
        <TermHeadCell align="right">Vol</TermHeadCell>
        <TermHeadCell align="right">Act</TermHeadCell>
      </TermHead>
    </div>
  );
}
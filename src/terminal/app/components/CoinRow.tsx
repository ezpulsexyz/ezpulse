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
  const isNew = c.pairCreatedAt && Date.now() - c.pairCreatedAt < 3 * 86400000;

  return (
    <a
      href={terminalHref({ section: "projects", projectCa: c.ca })}
      onClick={(e) => {
        e.preventDefault();
        onOpen(c);
      }}
      className="coin-row block cursor-pointer border-b no-underline transition"
      style={{ borderColor: "var(--term-border-subtle)" }}
    >
      {/* Mobile */}
      <div className="coin-row-mobile px-3 py-3.5 sm:px-4 lg:hidden">
        <div className="flex items-start gap-2.5">
          <span
            className={`coin-row__rank w-5 shrink-0 pt-0.5 text-sm font-semibold tabular-nums ${
              i < 3 ? "text-blue-600" : ""
            }`}
            style={i >= 3 ? { color: "var(--term-text-subtle)" } : undefined}
          >
            {i + 1}
          </span>

          {c.icon && (
            <img
              src={c.icon}
              alt=""
              className="h-9 w-9 shrink-0 rounded-full border"
              style={{ borderColor: "var(--term-border)" }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
                  <span className="truncate font-semibold" style={{ color: "var(--term-text)" }}>
                    {c.name}
                  </span>
                  <span className="shrink-0 text-xs" style={{ color: "var(--term-text-subtle)" }}>
                    ${c.symbol}
                  </span>
                  {isNew && (
                    <span className="shrink-0 rounded-full bg-red-50 px-1.5 py-0.5 text-[8px] font-black tracking-widest text-red-500">
                      NEW
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-mono text-[13px] font-semibold tabular-nums" style={{ color: "var(--term-text)" }}>
                  {c.mcap ? fmtUsd(c.mcap) : "—"}
                </div>
                <Delta v={c.change24h} suffix="%" />
              </div>
            </div>

            {c.categories && c.categories.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {c.categories.slice(0, 3).map((cat) => (
                  <CategoryTag key={cat} category={cat} size="sm" />
                ))}
              </div>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
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
                    e.preventDefault();
                    copyCa(c.ca);
                  }}
                  title={c.ca}
                  className="coin-row__chip rounded px-1.5 py-0.5 font-mono text-[10px] transition"
                  style={{ background: "var(--term-surface-3)", color: "var(--term-text-muted)" }}
                >
                  {copiedCa === c.ca ? "✓ copied" : `${c.ca.slice(0, 4)}…${c.ca.slice(-4)}`}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="coin-row__stats mt-3 grid grid-cols-3 gap-2 rounded-lg px-2 py-2" style={{ background: "var(--term-surface-2)" }}>
          <div>
            <div className="font-mono text-[9px] uppercase tracking-wide" style={{ color: "var(--term-text-subtle)" }}>Price</div>
            <div className="mt-0.5 font-mono text-[11px] tabular-nums" style={{ color: "var(--term-text-secondary)" }}>
              {c.priceUsd ? fmtPrice(c.priceUsd) : "—"}
            </div>
          </div>
          <div className="text-center">
            <div className="font-mono text-[9px] uppercase tracking-wide" style={{ color: "var(--term-text-subtle)" }}>24h</div>
            <div className="mt-0.5 flex justify-center">
              <Delta v={c.change24h} suffix="%" />
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[9px] uppercase tracking-wide" style={{ color: "var(--term-text-subtle)" }}>Vol</div>
            <div className="mt-0.5 font-mono text-[11px] tabular-nums" style={{ color: "var(--term-text-secondary)" }}>
              {c.volume24h ? fmtUsd(c.volume24h) : "—"}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          {onWatch ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onWatch(c.ca);
              }}
              title={watched ? "Remove from watchlist" : "Add to watchlist"}
              className={`coin-row__chip flex h-8 w-8 items-center justify-center rounded-lg text-lg transition ${
                watched ? "text-amber-500" : ""
              }`}
              style={watched ? undefined : { color: "var(--term-text-subtle)" }}
            >
              {watched ? "★" : "☆"}
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onOpen(c);
            }}
            className="coin-row__terminal rounded-lg px-4 py-2 text-xs font-bold text-white transition"
            style={{ background: "var(--term-text)" }}
          >
            Terminal
          </button>
        </div>
      </div>

      {/* Desktop */}
      <div className="coin-row-desktop hidden items-center gap-x-4 px-5 py-3 lg:flex">
        <span
          className={`w-5 shrink-0 text-sm font-semibold tabular-nums ${
            i < 3 ? "text-blue-600" : ""
          }`}
          style={i >= 3 ? { color: "var(--term-text-subtle)" } : undefined}
        >
          {i + 1}
        </span>

        {c.icon && (
          <img
            src={c.icon}
            alt=""
            className="h-8 w-8 shrink-0 rounded-full border"
            style={{ borderColor: "var(--term-border)" }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-semibold" style={{ color: "var(--term-text)" }}>
              {c.name}
            </span>
            <span className="shrink-0 text-xs" style={{ color: "var(--term-text-subtle)" }}>${c.symbol}</span>
            {isNew && (
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
                  e.preventDefault();
                  copyCa(c.ca);
                }}
                title={c.ca}
                className="coin-row__chip rounded px-1.5 py-0.5 font-mono text-[10px] transition"
                style={{ background: "var(--term-surface-3)", color: "var(--term-text-muted)" }}
              >
                {copiedCa === c.ca ? "✓ copied" : `${c.ca.slice(0, 4)}…${c.ca.slice(-4)}`}
              </button>
            )}
          </div>
        </div>

        {metric ?? (
          <div className="flex flex-1 items-center gap-4">
            <div className="w-24 text-right font-mono text-sm">{c.priceUsd ? fmtPrice(c.priceUsd) : "—"}</div>
            <div className="w-16 text-right">
              <Delta v={c.change24h} suffix="%" />
            </div>
            <div className="w-24 text-right font-mono text-sm font-semibold">
              {c.mcap ? fmtUsd(c.mcap) : "—"}
            </div>
            <div className="w-24 text-right text-sm" style={{ color: "var(--term-text-muted)" }}>
              {c.volume24h ? fmtUsd(c.volume24h) : "—"}
            </div>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {onWatch && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onWatch(c.ca);
              }}
              title={watched ? "Remove from watchlist" : "Add to watchlist"}
              className={`coin-row__chip px-2 text-xl transition ${watched ? "text-amber-500" : ""}`}
              style={watched ? undefined : { color: "var(--term-text-subtle)" }}
            >
              {watched ? "★" : "☆"}
            </button>
          )}

          {onShare && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onShare(c);
              }}
              title="Share card"
              className="coin-row__chip flex h-9 w-9 items-center justify-center rounded-xl border text-sm transition"
              style={{ borderColor: "var(--term-border)", color: "var(--term-text-muted)" }}
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
            className="coin-row__chip flex h-9 w-9 items-center justify-center rounded-xl border text-sm transition"
            style={{ borderColor: "var(--term-border)", background: "var(--term-surface-2)" }}
          >
            🚀
          </a>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onOpen(c);
            }}
            className="coin-row__terminal rounded-xl px-4 py-1.5 text-xs font-bold text-white transition"
            style={{ background: "var(--term-text)" }}
          >
            Terminal
          </button>
        </div>
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
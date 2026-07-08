import { terminalHref } from "../../../routes";
import { Delta } from "../../components";
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

function TokenAvatar({ c }: { c: LiveLaunch }) {
  if (c.icon) {
    return (
      <img
        src={c.icon}
        alt=""
        className="coin-row__avatar"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }
  return (
    <span className="coin-row__avatar coin-row__avatar--fallback" aria-hidden>
      {(c.symbol || c.name || "?").slice(0, 1).toUpperCase()}
    </span>
  );
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
      className="coin-row group block no-underline transition"
    >
      {/* Mobile & tablet */}
      <div className="coin-row-mobile lg:hidden">
        <div className="coin-row-mobile__main">
          <span className={`coin-row__rank ${i < 3 ? "coin-row__rank--top" : ""}`}>{i + 1}</span>
          <TokenAvatar c={c} />
          <div className="coin-row-mobile__content">
            <div className="coin-row-mobile__head">
              <div className="min-w-0">
                <div className="coin-row__title">
                  <span className="coin-row__name">{c.name}</span>
                  <span className="coin-row__sym">${c.symbol}</span>
                </div>
                <div className="coin-row__badges">
                  {isNew && <span className="coin-row__pill coin-row__pill--new">NEW</span>}
                  {isVerified(c) && (
                    <span className="coin-row__pill coin-row__pill--verified" title="Verified">✓</span>
                  )}
                  <CurveBadge c={c} />
                </div>
              </div>
              <div className="coin-row-mobile__quote">
                <div className="coin-row__mcap">{c.mcap ? fmtUsd(c.mcap) : "—"}</div>
                <Delta v={c.change24h} suffix="%" />
              </div>
            </div>

            {c.categories && c.categories.length > 0 && (
              <div className="coin-row__tags">
                {c.categories.slice(0, 2).map((cat) => (
                  <CategoryTag key={cat} category={cat} size="sm" />
                ))}
              </div>
            )}

            <div className="coin-row-mobile__foot">
              <div className="coin-row-mobile__metrics">
                <span>
                  <span className="coin-row__metric-label">Price</span>
                  <span className="coin-row__metric-val">{c.priceUsd ? fmtPrice(c.priceUsd) : "—"}</span>
                </span>
                <span className="coin-row__metric-sep" aria-hidden>·</span>
                <span>
                  <span className="coin-row__metric-label">Vol</span>
                  <span className="coin-row__metric-val">{c.volume24h ? fmtUsd(c.volume24h) : "—"}</span>
                </span>
                {copyCa && (
                  <>
                    <span className="coin-row__metric-sep" aria-hidden>·</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        copyCa(c.ca);
                      }}
                      title={c.ca}
                      className="coin-row__ca"
                    >
                      {copiedCa === c.ca ? "copied" : `${c.ca.slice(0, 4)}…${c.ca.slice(-4)}`}
                    </button>
                  </>
                )}
              </div>
              {onWatch && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onWatch(c.ca);
                  }}
                  title={watched ? "Remove from watchlist" : "Add to watchlist"}
                  className={`coin-row__watch ${watched ? "coin-row__watch--on" : ""}`}
                  aria-label={watched ? "Unwatch" : "Watch"}
                >
                  {watched ? "★" : "☆"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop */}
      <div className="coin-row-desktop hidden lg:flex">
        <span className={`coin-row__rank ${i < 3 ? "coin-row__rank--top" : ""}`}>{i + 1}</span>
        <TokenAvatar c={c} />

        <div className="coin-row-desktop__token min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="coin-row__name truncate">{c.name}</span>
            <span className="coin-row__sym shrink-0">${c.symbol}</span>
            {isNew && <span className="coin-row__pill coin-row__pill--new">NEW</span>}
          </div>
          {c.categories && c.categories.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {c.categories.slice(0, 3).map((cat) => (
                <CategoryTag key={cat} category={cat} size="sm" />
              ))}
            </div>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {isVerified(c) && (
              <span className="coin-row__pill coin-row__pill--verified" title="Verified">✓</span>
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
                className="coin-row__ca"
              >
                {copiedCa === c.ca ? "✓ copied" : `${c.ca.slice(0, 4)}…${c.ca.slice(-4)}`}
              </button>
            )}
          </div>
        </div>

        {metric ?? (
          <div className="coin-row-desktop__nums">
            <div className="coin-row__metric-val w-24 text-right">{c.priceUsd ? fmtPrice(c.priceUsd) : "—"}</div>
            <div className="w-16 text-right">
              <Delta v={c.change24h} suffix="%" />
            </div>
            <div className="coin-row__mcap w-24 text-right">{c.mcap ? fmtUsd(c.mcap) : "—"}</div>
            <div className="coin-row__metric-val w-24 text-right" style={{ color: "var(--term-text-muted)" }}>
              {c.volume24h ? fmtUsd(c.volume24h) : "—"}
            </div>
          </div>
        )}

        <div className="coin-row-desktop__actions">
          {onWatch && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onWatch(c.ca);
              }}
              title={watched ? "Remove from watchlist" : "Add to watchlist"}
              className={`coin-row__watch ${watched ? "coin-row__watch--on" : ""}`}
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
              className="coin-row__action-btn"
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
            className="coin-row__action-btn"
          >
            🚀
          </a>
          <span className="coin-row__open-btn">Open</span>
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
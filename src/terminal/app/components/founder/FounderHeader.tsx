import { BLUE } from "../../../components";
import type { FounderProfile } from "../../types";

function ConvictionRing({ score, size = "lg" }: { score: number; size?: "sm" | "lg" }) {
  const dim = size === "sm" ? "h-14 w-14" : "h-20 w-20";
  const text = size === "sm" ? "text-base" : "text-xl";

  return (
    <div className={`relative flex ${dim} shrink-0 items-center justify-center`}>
      <svg viewBox="0 0 36 36" className={`${dim} -rotate-90`}>
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--term-border)" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r="15.5"
          fill="none"
          stroke={BLUE}
          strokeWidth="3"
          strokeDasharray={`${score} 100`}
          strokeLinecap="round"
        />
      </svg>
      <span className={`absolute font-display font-bold ${text}`} style={{ color: "var(--term-accent)" }}>
        {score}
      </span>
    </div>
  );
}

export function FounderHeader({ founder }: { founder: FounderProfile }) {
  const { stats, primaryToken } = founder;
  const mcapLabel = stats.totalMcapLaunched >= 1_000_000
    ? `${(stats.totalMcapLaunched / 1_000_000).toFixed(1)}M`
    : stats.totalMcapLaunched >= 1000
      ? `${(stats.totalMcapLaunched / 1000).toFixed(0)}K`
      : stats.totalMcapLaunched.toFixed(0);

  return (
    <div className="term-founder-card">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="rounded-full px-2.5 py-1 text-[9px] font-black tracking-widest text-white"
          style={{ background: "var(--term-accent)" }}
        >
          FOUNDER TERMINAL
        </span>
        {founder.verified && (
          <span className="text-[11px] font-semibold" style={{ color: "var(--term-accent)" }}>
            Verified founder
          </span>
        )}
      </div>

      <div className="term-founder-card__main mt-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            {founder.avatar ? (
              <img
                src={founder.avatar}
                alt=""
                className="h-11 w-11 shrink-0 rounded-full border sm:h-12 sm:w-12"
                style={{ borderColor: "var(--term-border)" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg sm:h-12 sm:w-12"
                style={{ background: "color-mix(in srgb, var(--term-accent) 12%, var(--term-surface))" }}
              >
                👤
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h2 className="term-proj-title min-w-0 text-xl sm:text-2xl">{founder.name}</h2>
                <div className="sm:hidden">
                  <ConvictionRing score={stats.convictionScore} size="sm" />
                </div>
              </div>
              {founder.bio && (
                <p className="mt-1 text-[13px] leading-relaxed" style={{ color: "var(--term-text-muted)" }}>
                  {founder.bio}
                </p>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {founder.xHandle && (
              <a
                href={`https://x.com/${founder.xHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="term-founder-link"
              >
                𝕏 @{founder.xHandle}
              </a>
            )}
            {founder.registry.github && (
              <a
                href={`https://github.com/${founder.registry.github}`}
                target="_blank"
                rel="noopener noreferrer"
                className="term-founder-link"
              >
                GitHub ↗
              </a>
            )}
            <a
              href={`https://solscan.io/account/${founder.wallet}`}
              target="_blank"
              rel="noopener noreferrer"
              className="term-founder-link font-mono"
            >
              {founder.wallet.slice(0, 4)}…{founder.wallet.slice(-4)} ⧉
            </a>
          </div>

          <div className="term-founder-stats mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] sm:flex sm:flex-wrap sm:gap-4">
            <span style={{ color: "var(--term-text-muted)" }}>
              <strong style={{ color: "var(--term-text)" }}>{stats.totalLaunches}</strong> launches
            </span>
            <span style={{ color: "var(--term-text-muted)" }}>
              <strong style={{ color: "var(--term-text)" }}>{stats.successRate}%</strong> bonded
            </span>
            <span style={{ color: "var(--term-text-muted)" }}>
              <strong style={{ color: "var(--term-text)" }}>${mcapLabel}</strong> mcap launched
            </span>
            {primaryToken && (
              <span style={{ color: "var(--term-text-muted)" }}>
                <strong style={{ color: "var(--term-text)" }}>${primaryToken.symbol}</strong> primary
              </span>
            )}
          </div>
        </div>

        <div className="term-founder-card__conviction hidden shrink-0 sm:flex">
          <div className="term-founder-conviction flex flex-col items-center rounded-2xl px-5 py-4 sm:px-6">
            <div className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--term-text-subtle)" }}>
              Conviction score
            </div>
            <ConvictionRing score={stats.convictionScore} size="lg" />
            <div className="mt-1 text-center text-[10px]" style={{ color: "var(--term-text-subtle)" }}>
              history · performance · lockup
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
import { useEffect, useState } from "react";
import { BLUE } from "../../components";
import {
  isVerified,
  isGraduated,
  kickstartUrl,
  type LiveLaunch,
  type PortfolioResult,
} from "../../kickstart";
import type { Section } from "../types";
import { FounderTerminal } from "../components/FounderTerminal";
import { OverviewTab } from "../components/project/OverviewTab";
import { SignalsTab } from "../components/project/SignalsTab";
import InvestorThesis from "../../sections/InvestorThesis";

type ProjTab = "overview" | "signals" | "founder" | "thesis";

export interface ProjectDetailProps {
  token: LiveLaunch;
  onBack: () => void;
  feed: LiveLaunch[];
  watchlist: string[];
  toggleWatch: (ca: string) => void;
  setShareToken: (token: LiveLaunch) => void;
  copyCa: (ca: string) => void;
  copiedCa: string | null;
  onOpenToken: (c: LiveLaunch) => void;
  wallet: string | null;
  portfolio: PortfolioResult | null | "loading";
  goto: (s: Section) => void;
}

export default function ProjectDetail({
  token,
  onBack,
  feed,
  watchlist,
  toggleWatch,
  setShareToken,
  copyCa,
  copiedCa,
  onOpenToken,
  wallet,
  portfolio,
  goto,
}: ProjectDetailProps) {
  const [projTab, setProjTab] = useState<ProjTab>("overview");
  const isWatching = watchlist.includes(token.ca);
  const verified = isVerified(token);

  useEffect(() => {
    setProjTab("overview");
  }, [token.ca]);

  return (
    <div className="animate-fade-up">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 flex items-center gap-1.5 text-[13px] font-semibold text-zinc-400 transition hover:text-indigo-600"
      >
        ← All tokens
      </button>

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {token.icon && (
            <img
              src={token.icon}
              alt=""
              className="h-10 w-10 shrink-0 rounded-full border border-zinc-100 sm:h-12 sm:w-12"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
                {token.name}
              </h1>
              <span className="text-[14px] font-semibold text-zinc-400">${token.symbol}</span>
              {verified && (
                <span
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-white"
                  style={{ background: BLUE }}
                >
                  ✓ VERIFIED
                </span>
              )}
              {isGraduated(token) ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                  🔗 BONDED
                </span>
              ) : (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">
                  ⏳ BONDING{" "}
                  {typeof token.bondingCurve === "number"
                    ? `${Math.min(token.bondingCurve, 100).toFixed(0)}%`
                    : ""}
                </span>
              )}
              <span className="rounded-full bg-red-50 px-2 py-1 text-[9px] font-black tracking-widest text-red-500">
                ● LIVE
              </span>
            </div>
            <button
              type="button"
              onClick={() => copyCa(token.ca)}
              className="mt-1 flex max-w-full items-center gap-1 font-mono text-[11px] text-zinc-400 transition hover:text-zinc-700"
            >
              <span className="truncate">
                {copiedCa === token.ca ? "✓ copied to clipboard" : token.ca}
              </span>{" "}
              ⧉
            </button>
          </div>
        </div>

        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
          <button
            type="button"
            onClick={() => setShareToken(token)}
            className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-zinc-600 transition hover:border-indigo-300 hover:text-indigo-700 sm:px-5 sm:py-2.5 sm:text-[12px]"
          >
            📤 Share
          </button>
          <button
            type="button"
            onClick={() => toggleWatch(token.ca)}
            className={`rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wide transition sm:px-5 sm:py-2.5 sm:text-[12px] ${
              isWatching
                ? "text-white shadow-lg"
                : "border border-zinc-200 bg-white text-zinc-600 hover:border-amber-300 hover:text-amber-600"
            }`}
            style={isWatching ? { background: "#f59e0b" } : undefined}
          >
            {isWatching ? "★ Watching" : "☆ Watch"}
          </button>
          {isGraduated(token) ? (
            <a
              href={token.links.dexscreener}
              target="_blank"
              rel="noopener noreferrer"
              className="col-span-2 rounded-full px-5 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-white shadow-lg transition hover:-translate-y-px sm:col-span-1 sm:px-6 sm:py-2.5 sm:text-[12px]"
              style={{ background: "#0b0e13" }}
            >
              📊 Trade →
            </a>
          ) : (
            <a
              href={kickstartUrl(token.ca)}
              target="_blank"
              rel="noopener noreferrer"
              className="col-span-2 rounded-full px-5 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-white shadow-lg shadow-indigo-600/25 transition hover:-translate-y-px sm:col-span-1 sm:px-6 sm:py-2.5 sm:text-[12px]"
              style={{ background: BLUE }}
            >
              🚀 Buy on Kickstart →
            </a>
          )}
          {verified && (
            <button
              type="button"
              onClick={() => setProjTab("founder")}
              className="col-span-2 rounded-full px-5 py-2 text-[11px] font-bold uppercase tracking-wide text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-px sm:col-span-1 sm:py-2.5 sm:text-[12px]"
              style={{ background: `linear-gradient(135deg, ${BLUE}, #4f2ff0)` }}
            >
              👤 Founder Terminal
            </button>
          )}
          <a
            href={kickstartUrl(token.ca)}
            target="_blank"
            rel="noopener noreferrer"
            className="col-span-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-zinc-600 transition hover:border-indigo-300 hover:text-indigo-700 sm:col-span-1 sm:px-5 sm:py-2.5 sm:text-[12px]"
          >
            Kickstart ↗
          </a>
        </div>
      </div>

      <div className="term-tab-rail term-scroll-x mt-5 max-w-full">
        {(
          [
            ["overview", "Overview"],
            ["signals", "⚡ Signals"],
            ["thesis", "🧠 Thesis"],
            ...(verified ? [["founder", "👤 Founder"] as const] : []),
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setProjTab(id)}
            className={`rounded-full px-4 py-2 text-[11px] font-bold transition sm:px-5 sm:text-[12px] ${
              projTab === id ? "text-white" : "text-zinc-500 hover:text-zinc-800"
            }`}
            style={projTab === id ? { background: BLUE } : undefined}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {projTab === "overview" && (
          <OverviewTab
            token={token}
            feed={feed}
            wallet={wallet}
            portfolio={portfolio}
            goto={goto}
            openToken={onOpenToken}
            onViewSignals={() => setProjTab("signals")}
          />
        )}
        {projTab === "signals" && <SignalsTab token={token} feed={feed} />}
        {projTab === "thesis" && <InvestorThesis token={token} feed={feed} />}
        {projTab === "founder" && verified && (
          <FounderTerminal token={token} feed={feed} onOpenToken={onOpenToken} />
        )}
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import { BLUE } from "../../components";
import {
  fmtPrice,
  isVerified,
  isGraduated,
  kickstartUrl,
  type LiveLaunch,
  type PortfolioResult,
} from "../../kickstart";
import type { Section } from "../types";
import { CurveBadge } from "../components/CurveBadge";
import { HistoryChart } from "../components/HistoryChart";
import { FounderTerminal } from "../components/FounderTerminal";
import { OverviewTab } from "../components/project/OverviewTab";
import { SignalsTab } from "../components/project/SignalsTab";

type ProjTab = "overview" | "signals" | "history" | "founder";

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
  const tradeHref = isGraduated(token)
    ? token.links.dexscreener
    : kickstartUrl(token.ca);

  useEffect(() => {
    setProjTab("overview");
  }, [token.ca]);

  const tabs: { id: ProjTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "signals", label: "Live Signals" },
    { id: "history", label: "Price History" },
    ...(verified ? [{ id: "founder" as const, label: "Founder" }] : []),
  ];

  return (
    <div className="animate-fade-up space-y-8 pb-12">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-700"
      >
        ← Back to tokens
      </button>

      <div className="flex flex-col justify-between gap-6 lg:flex-row">
        <div className="flex items-center gap-5">
          {token.icon && (
            <img
              src={token.icon}
              alt={token.name}
              className="h-20 w-20 rounded-2xl border border-zinc-100 shadow-sm"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">{token.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <span className="font-mono text-2xl text-zinc-500">${token.symbol}</span>
              {verified && (
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                  ✓ VERIFIED
                </span>
              )}
              <CurveBadge c={token} />
              {token.priceUsd > 0 && (
                <span className="font-mono text-sm text-zinc-500">
                  {fmtPrice(token.priceUsd)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShareToken(token)}
            className="rounded-2xl border border-zinc-200 px-6 py-3 transition hover:bg-zinc-50"
          >
            📤 Share
          </button>

          <button
            type="button"
            onClick={() => toggleWatch(token.ca)}
            className={`rounded-2xl px-6 py-3 font-medium transition ${
              isWatching
                ? "bg-amber-500 text-white"
                : "border border-zinc-200 hover:bg-amber-50"
            }`}
          >
            {isWatching ? "★ Watching" : "☆ Watch"}
          </button>

          {verified && (
            <button
              type="button"
              onClick={() => setProjTab("founder")}
              className="rounded-2xl px-6 py-3 font-medium text-white transition hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${BLUE}, #4f2ff0)` }}
            >
              👤 Founder
            </button>
          )}

          <a
            href={tradeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl bg-zinc-900 px-8 py-3 font-medium text-white transition hover:bg-black"
          >
            {isGraduated(token) ? "Trade →" : "Buy on Kickstart →"}
          </a>
        </div>
      </div>

      <div className="flex border-b border-zinc-200 text-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setProjTab(tab.id)}
            className={`border-b-2 px-8 py-4 font-medium transition-all ${
              projTab === tab.id
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="pt-4">
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
        {projTab === "history" && <HistoryChart ca={token.ca} />}
        {projTab === "founder" && verified && (
          <FounderTerminal token={token} feed={feed} onOpenToken={onOpenToken} />
        )}
      </div>
    </div>
  );
}
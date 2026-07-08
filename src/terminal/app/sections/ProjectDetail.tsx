import { useEffect, useState } from "react";
import { terminalHref } from "../../../routes";
import { BLUE } from "../../components";
import {
  isVerified,
  isGraduated,
  type LiveLaunch,
} from "../../kickstart";
import { getRecentThesesCount } from "../../backend";
import type { Section } from "../types";
import { HistoryChart } from "../components/HistoryChart";
import { ProjectActions } from "../components/ProjectActions";
import { FounderTerminal } from "../components/FounderTerminal";
import { OverviewTab } from "../components/project/OverviewTab";
import { SignalsTab } from "../components/project/SignalsTab";
import InvestorThesis from "../../sections/InvestorThesis";

type ProjTab = "overview" | "signals" | "history" | "thesis" | "founder";

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
  goto: (s: Section) => void;
  feedUpdatedAt?: number | null;
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
  goto,
  feedUpdatedAt,
}: ProjectDetailProps) {
  const [projTab, setProjTab] = useState<ProjTab>("overview");
  const [recentThesesCount, setRecentThesesCount] = useState(0);
  const isWatching = watchlist.includes(token.ca);
  const verified = isVerified(token);

  useEffect(() => {
    setProjTab("overview");
  }, [token.ca]);

  useEffect(() => {
    let alive = true;
    void getRecentThesesCount(token.ca, 7).then((count) => {
      if (alive) setRecentThesesCount(count);
    });
    return () => {
      alive = false;
    };
  }, [token.ca]);

  const tabs: { id: ProjTab; label: string; shortLabel: string; count?: number }[] = [
    { id: "overview", label: "Overview", shortLabel: "Overview" },
    { id: "signals", label: "Live Signals", shortLabel: "Signals" },
    { id: "history", label: "Price History", shortLabel: "History" },
    { id: "thesis", label: "Investor Thesis", shortLabel: "Thesis", count: recentThesesCount },
    ...(verified ? [{ id: "founder" as const, label: "Founder Terminal", shortLabel: "Founder" }] : []),
  ];

  return (
    <div className="animate-fade-up min-w-0 space-y-6 pb-12 sm:space-y-8">
      <a
        href={terminalHref({ section: "projects" })}
        onClick={(e) => {
          e.preventDefault();
          onBack();
        }}
        className="term-back-link mb-4 inline-flex items-center gap-1.5 font-mono text-[11px]"
      >
        ← All projects
      </a>

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
              <h1 className="term-proj-title">
                {token.name}
              </h1>
              <span className="text-[14px] font-semibold" style={{ color: "var(--term-text-subtle)" }}>${token.symbol}</span>
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
              className="term-back-link mt-1 flex max-w-full items-center gap-1 font-mono text-[11px]"
            >
              <span className="truncate">
                {copiedCa === token.ca ? "✓ copied to clipboard" : token.ca}
              </span>{" "}
              ⧉
            </button>
          </div>
        </div>

        <ProjectActions
          token={token}
          isWatching={isWatching}
          onShare={() => setShareToken(token)}
          onWatch={() => toggleWatch(token.ca)}
          onFounder={verified ? () => setProjTab("founder") : undefined}
        />
      </div>

      <div className="term-proj-tabs term-scroll-x flex border-b text-sm" style={{ borderColor: "var(--term-border)" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setProjTab(tab.id)}
            className={`term-proj-tab ${projTab === tab.id ? "term-proj-tab--active" : ""}`}
          >
            <span className="sm:hidden">{tab.shortLabel}</span>
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count != null && tab.count > 0 && (
              <span className="min-w-[18px] rounded-full bg-emerald-500 px-2 py-0.5 text-center text-[10px] font-black text-white">
                +{tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="min-w-0 pt-2">
        {projTab === "overview" && (
          <OverviewTab
            token={token}
            feed={feed}
            goto={goto}
            openToken={onOpenToken}
            onViewSignals={() => setProjTab("signals")}
          />
        )}
        {projTab === "signals" && <SignalsTab token={token} feed={feed} feedUpdatedAt={feedUpdatedAt} />}
        {projTab === "history" && <HistoryChart ca={token.ca} />}
        {projTab === "thesis" && <InvestorThesis token={token} feed={feed} />}
        {projTab === "founder" && verified && (
          <FounderTerminal token={token} feed={feed} onOpenToken={onOpenToken} />
        )}
      </div>
    </div>
  );
}
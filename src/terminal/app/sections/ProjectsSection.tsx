import { fmtUsd } from "../../data";
import { BLUE, Delta } from "../../components";
import { isVerified } from "../../kickstart";
import ProjectDetail from "./ProjectDetail";
import { useTokenSupply } from "../hooks/useTokenSupply";
import { PageHead, EmptyState, LaunchCta, LoadingRows } from "../components/PageLayout";
import { Card } from "../../components";
import { useTerminalContext } from "../TerminalContext";

export function ProjectsSection() {
  const {
    feed,
    loading,
    selected,
    setSelected,
    setLiveFeed,
    copiedCa,
    copyCa,
    watchlist,
    toggleWatch,
    setShareToken,
    openToken,
    wallet,
    portfolio,
    goto,
  } = useTerminalContext();

  useTokenSupply(selected, (enriched) => {
    setSelected(enriched);
    setLiveFeed((prev) => (Array.isArray(prev) ? prev.map((c) => (c.ca === enriched.ca ? enriched : c)) : prev));
  });

  return (
    <>
      {!selected ? (
        <>
          <PageHead
            title="Projects"
            sub="Research them — every Kickstart token gets its own Bloomberg-style page. Pick one."
          />
          {loading && (
            <Card>
              <LoadingRows />
            </Card>
          )}
          {!loading && feed.length === 0 && (
            <EmptyState
              icon="📟"
              title="No tokens to inspect yet"
              body="The moment a …EASY pair is indexed, its terminal page is available here."
              cta={<LaunchCta />}
            />
          )}
          {!loading && feed.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {feed.map((c) => (
                <button
                  key={c.ca}
                  type="button"
                  onClick={() => openToken(c)}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
                >
                  <div className="flex items-center gap-2.5">
                    {c.icon && (
                      <img
                        src={c.icon}
                        alt=""
                        className="h-9 w-9 rounded-full border border-zinc-100"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                    <div>
                      <div className="flex items-center gap-1.5 text-[15px] font-semibold text-zinc-900">
                        {c.name}
                        {isVerified(c) && (
                          <span
                            className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black text-white"
                            style={{ background: BLUE }}
                          >
                            ✓
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-400">${c.symbol} · SOL</div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3">
                    <span className="text-[13px] font-semibold tabular-nums text-zinc-800">
                      {c.mcap ? fmtUsd(c.mcap) : "—"}
                    </span>
                    <div className="flex items-center gap-2">
                      {isVerified(c) && (
                        <span className="text-[10px] font-bold text-indigo-600">👤 Founder</span>
                      )}
                      <Delta v={c.change24h} suffix="%" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <ProjectDetail
          token={selected}
          onBack={() => setSelected(null)}
          feed={feed}
          watchlist={watchlist}
          toggleWatch={toggleWatch}
          setShareToken={setShareToken}
          copyCa={copyCa}
          copiedCa={copiedCa}
          onOpenToken={openToken}
          wallet={wallet}
          portfolio={portfolio}
          goto={goto}
        />
      )}
    </>
  );
}
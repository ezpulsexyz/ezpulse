import { landingHref, navigateToLanding } from "../../../routes";
import { Logo } from "../../brand";
import { LiveBadge } from "../components/LiveBadge";
import { NAV_GROUPS } from "../types";
import { useTerminalContext } from "../TerminalContext";

export function Sidebar() {
  const { section, menuOpen, setMenuOpen, goto, feed, loading, watchlist, lastUpdated } = useTerminalContext();
  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[min(15rem,85vw)] flex-col overflow-y-auto border-r border-zinc-200 bg-white transition-transform scrollbar-thin lg:w-60 lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-between px-4 py-4 sm:px-5 sm:py-5">
          <a href={landingHref()} onClick={(e) => { e.preventDefault(); navigateToLanding(); }} title="Back to ezpulse.xyz">
            <Logo />
          </a>
          <button
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="rounded-lg border border-zinc-200 px-2 py-1 text-[11px] font-bold text-zinc-500 transition hover:border-indigo-300 hover:text-indigo-700 lg:hidden"
          >
            ✕
          </button>
        </div>
        <nav className="px-3 pb-4">
          {NAV_GROUPS.map((g) => (
            <div key={g.workflow} className="mb-3">
              <div className="mb-1 px-3 text-[9px] font-black uppercase tracking-[.2em] text-zinc-400">{g.workflow}</div>
              <div className="space-y-0.5">
                {g.items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => goto(n.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13.5px] transition ${
                      section === n.id ? "bg-indigo-50 font-semibold text-indigo-700" : "text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    <span className="w-4 shrink-0 text-center text-[12px]">{n.icon}</span>
                    <span className="min-w-0 truncate">{n.label}</span>
                    {n.soon && <span className="ml-auto shrink-0 rounded bg-zinc-100 px-1.5 py-px text-[8px] font-black tracking-widest text-zinc-400">SOON</span>}
                    {n.id === "signals" && feed.length > 0 && (
                      <span className="ml-auto flex shrink-0 items-center gap-1 text-[9px] font-bold text-red-500">
                        <span className="term-blink h-1.5 w-1.5 rounded-full bg-red-500" />LIVE
                      </span>
                    )}
                    {n.id === "watchlist" && watchlist.length > 0 && (
                      <span className="ml-auto shrink-0 rounded-full bg-amber-50 px-1.5 text-[9px] font-bold text-amber-500">{watchlist.length}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="mx-3 rounded-xl bg-zinc-50 p-3.5 text-[11px] leading-relaxed text-zinc-500">
          <span className="font-bold text-zinc-700">100% live data.</span> Only contracts ending in{" "}
          <span className="font-mono font-bold text-indigo-600">EASY</span> — the Kickstart on-chain fingerprint — are listed.
        </div>
        <div className="mt-auto border-t border-zinc-100 px-4 py-4 sm:px-5">
          <LiveBadge
            label={loading ? "Connecting…" : feed.length ? `Live · ${feed.length} tokens` : "Awaiting launches"}
            ts={lastUpdated}
            tone={loading ? "amber" : feed.length ? "emerald" : "zinc"}
            size="sm"
          />
        </div>
      </aside>
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-zinc-900/30 backdrop-blur-[1px] lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden
        />
      )}
    </>
  );
}
import { landingHref } from "../../../routes";
import { Logo } from "../../brand";
import { NAV_GROUPS } from "../types";
import { useTerminalContext } from "../TerminalContext";

export function Sidebar() {
  const { section, menuOpen, setMenuOpen, goto, feed, loading, watchlist } = useTerminalContext();

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-zinc-200 bg-white shadow-2xl transition-transform duration-300 lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-5">
          <a href={landingHref()} title="Back to ezpulse.xyz" onClick={() => setMenuOpen(false)}>
            <Logo />
          </a>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="text-zinc-400 transition hover:text-zinc-600 lg:hidden"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 pb-36 scrollbar-thin">
          {NAV_GROUPS.map((group) => (
            <div key={group.workflow} className="mb-6">
              <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                {group.workflow}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => goto(item.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all ${
                      section === item.id
                        ? "bg-indigo-50 font-semibold text-indigo-700 shadow-sm"
                        : "text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    <span className="w-5 shrink-0 text-center text-lg">{item.icon}</span>
                    <span className="min-w-0 truncate">{item.label}</span>
                    {item.soon && (
                      <span className="ml-auto shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-400">
                        soon
                      </span>
                    )}
                    {item.id === "signals" && feed.length > 0 && !item.soon && (
                      <span className="ml-auto flex shrink-0 items-center gap-1 text-[9px] font-bold text-red-500">
                        <span className="term-blink h-1.5 w-1.5 rounded-full bg-red-500" />
                        LIVE
                      </span>
                    )}
                    {item.id === "watchlist" && watchlist.length > 0 && (
                      <span className="ml-auto shrink-0 rounded-full bg-amber-100 px-2 py-0.5 font-mono text-xs text-amber-600">
                        {watchlist.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-zinc-100 bg-white p-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${feed.length ? "animate-pulse bg-emerald-500" : "bg-amber-400"}`} />
            <span>{loading ? "Connecting…" : `${feed.length} live tokens`}</span>
          </div>
          <p className="mt-3 text-[10px] leading-relaxed">
            100% on-chain data · Only <span className="font-mono font-bold text-indigo-600">…EASY</span> contracts
          </p>
        </div>
      </aside>

      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-lg transition-opacity lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden
        />
      )}
    </>
  );
}
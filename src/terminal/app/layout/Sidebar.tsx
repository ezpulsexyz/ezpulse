import { landingHref, terminalHref } from "../../../routes";
import { Logo } from "../../brand";
import { NAV_GROUPS } from "../types";
import { useTerminalContext } from "../TerminalContext";

export function Sidebar() {
  const { section, menuOpen, setMenuOpen, goto, feed, loading, watchlist } = useTerminalContext();

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[var(--term-sidebar)] flex-col border-r border-zinc-200/90 bg-[#fafafa] transition-transform duration-200 lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-between border-b border-zinc-200/80 px-3 py-2.5">
          <a href={landingHref()} title="Back to ezpulse.xyz" onClick={() => setMenuOpen(false)}>
            <Logo size={22} textClass="text-[11px]" />
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

        <nav className="flex-1 overflow-y-auto px-2 py-2 pb-28 scrollbar-thin">
          {NAV_GROUPS.map((group) => (
            <div key={group.workflow} className="mb-4">
              <div className="mb-1 px-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                {group.workflow}
              </div>
              <div className="space-y-px">
                {group.items.map((item) => (
                  <a
                    key={item.id}
                    href={terminalHref({ section: item.id })}
                    onClick={(e) => {
                      e.preventDefault();
                      goto(item.id);
                    }}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11.5px] transition-colors ${
                      section === item.id
                        ? "bg-white font-medium text-zinc-900 shadow-[inset_2px_0_0_0_#2743f0]"
                        : "text-zinc-600 hover:bg-white/70 hover:text-zinc-800"
                    }`}
                  >
                    <span className="term-nav-icon">{item.icon}</span>
                    <span className="min-w-0 truncate">{item.label}</span>
                    {item.soon && (
                      <span className="ml-auto shrink-0 rounded border border-zinc-200 bg-white px-1 py-px font-mono text-[8px] uppercase tracking-wide text-zinc-400">
                        soon
                      </span>
                    )}
                    {item.id === "signals" && feed.length > 0 && !item.soon && (
                      <span className="ml-auto flex shrink-0 items-center gap-1 font-mono text-[8px] font-semibold uppercase tracking-wide text-red-600">
                        <span className="term-blink h-1 w-1 rounded-full bg-red-500" />
                        live
                      </span>
                    )}
                    {item.id === "watchlist" && watchlist.length > 0 && (
                      <span className="ml-auto shrink-0 rounded border border-zinc-200 bg-white px-1 py-px font-mono text-[9px] tabular-nums text-zinc-500">
                        {watchlist.length}
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-zinc-200/80 bg-[#fafafa] px-3 py-2.5 text-[10px] text-zinc-500">
          <div className="flex items-center gap-1.5">
            <div className={`h-1.5 w-1.5 rounded-full ${feed.length ? "bg-emerald-500" : "bg-amber-400"}`} />
            <span className="font-mono tabular-nums">{loading ? "Connecting…" : `${feed.length} tokens`}</span>
          </div>
          <p className="mt-1.5 font-mono text-[9px] leading-snug text-zinc-400">
            on-chain · <span className="text-zinc-600">…EASY</span> only
          </p>
        </div>
      </aside>

      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden
        />
      )}
    </>
  );
}
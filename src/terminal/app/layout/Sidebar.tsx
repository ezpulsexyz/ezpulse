import { landingHref, terminalHref } from "../../../routes";
import { Logo } from "../../brand";
import { NavIcon } from "../components/NavIcon";
import { NAV_GROUPS } from "../types";
import { useTerminalContext } from "../TerminalContext";

export function Sidebar() {
  const { section, menuOpen, setMenuOpen, goto, feed, loading, watchlist } = useTerminalContext();

  return (
    <>
      <aside
        className={`term-sidebar fixed inset-y-0 left-0 z-50 flex w-[var(--term-sidebar)] flex-col border-r transition-transform duration-200 lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <a href={landingHref()} title="Back to ezpulse.xyz" onClick={() => setMenuOpen(false)} className="min-w-0">
            <Logo size={26} textClass="text-[13px]" />
          </a>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="term-icon-btn lg:hidden"
          >
            ×
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-32 scrollbar-thin">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.workflow} className={gi > 0 ? "term-nav-divider mt-5 border-t pt-5" : ""}>
              <div className="term-nav-section mb-2 px-2 text-[10px] font-medium uppercase tracking-[0.16em]">
                {group.workflow}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = section === item.id;
                  return (
                    <a
                      key={item.id}
                      href={terminalHref({ section: item.id })}
                      onClick={(e) => {
                        e.preventDefault();
                        goto(item.id);
                      }}
                      className={`term-nav-item ${active ? "term-nav-item--active" : ""}`}
                    >
                      <span className="term-nav-item__icon">
                        <NavIcon id={item.id} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{item.label}</span>
                      {item.soon && (
                        <span className="shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide" style={{ background: "var(--term-surface-3)", color: "var(--term-text-subtle)" }}>
                          soon
                        </span>
                      )}
                      {item.id === "signals" && feed.length > 0 && !item.soon && (
                        <span className="flex shrink-0 items-center gap-1 rounded-md bg-red-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-red-500">
                          <span className="term-blink h-1.5 w-1.5 rounded-full bg-red-500" />
                          live
                        </span>
                      )}
                      {item.id === "watchlist" && watchlist.length > 0 && (
                        <span className="shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] tabular-nums" style={{ background: "var(--term-surface-3)", color: "var(--term-text-muted)" }}>
                          {watchlist.length}
                        </span>
                      )}
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t px-4 py-3" style={{ borderColor: "var(--term-border-subtle)", background: "var(--term-surface)" }}>
          <div className="term-status-card flex items-center gap-2 px-3 py-2">
            <div className={`h-2 w-2 shrink-0 rounded-full ${feed.length ? "bg-emerald-500" : "bg-amber-400"}`} />
            <div className="min-w-0">
              <div className="truncate text-[11px] font-medium" style={{ color: "var(--term-text-secondary)" }}>
                {loading ? "Connecting…" : `${feed.length} live tokens`}
              </div>
              <div className="truncate text-[10px]" style={{ color: "var(--term-text-subtle)" }}>On-chain · …EASY only</div>
            </div>
          </div>
        </div>
      </aside>

      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden
        />
      )}
    </>
  );
}
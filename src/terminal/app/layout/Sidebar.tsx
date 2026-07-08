import { landingHref, terminalHref } from "../../../routes";
import { Logo } from "../../brand";
import { NavIcon } from "../components/NavIcon";
import { ThemeToggle } from "../components/ThemeToggle";
import { NAV_GROUPS } from "../types";
import { useTerminalContext } from "../TerminalContext";

export function Sidebar() {
  const {
    section,
    menuOpen,
    sidebarHidden,
    hideSidebar,
    openSidebar,
    closeSidebar,
    goto,
    feed,
    loading,
    watchlist,
  } = useTerminalContext();

  const sidebarTranslate = menuOpen ? "translate-x-0" : "-translate-x-full";

  return (
    <>
      <aside
        className={`term-sidebar fixed inset-y-0 left-0 z-50 flex w-[var(--term-sidebar)] flex-col border-r ${sidebarTranslate} lg:translate-x-0 ${sidebarHidden ? "term-sidebar--collapsed" : ""}`}
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="term-sidebar__head flex items-center justify-between gap-2 px-4 py-4">
          <a
            href={landingHref()}
            title="Back to ezpulse.xyz"
            onClick={closeSidebar}
            className="min-w-0"
          >
            <span className="lg:hidden">
              <Logo size={26} textClass="text-[13px]" />
            </span>
            <span className="hidden lg:inline-flex">
              <Logo size={26} textClass="text-[13px]" compact={sidebarHidden} />
            </span>
          </a>
          <button
            type="button"
            onClick={sidebarHidden ? openSidebar : hideSidebar}
            aria-label={sidebarHidden ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarHidden ? "Expand sidebar" : "Collapse sidebar"}
            className="term-icon-btn hidden shrink-0 lg:flex"
          >
            {sidebarHidden ? <SidebarExpandIcon /> : <SidebarCollapseIcon />}
          </button>
        </div>

        <nav className="term-sidebar__nav flex-1 overflow-y-auto px-3 pb-32 scrollbar-thin">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.workflow} className={gi > 0 ? "mt-5" : ""}>
              {gi > 0 && <div className="term-nav-divider mb-5 border-t" aria-hidden />}
              <div className="term-nav-section mb-2 px-2 text-[10px] font-medium uppercase tracking-[0.16em]">
                {group.workflow}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = section === item.id;
                  const showLive = item.id === "signals" && feed.length > 0 && !item.soon;
                  const watchCount = item.id === "watchlist" ? watchlist.length : 0;
                  return (
                    <a
                      key={item.id}
                      href={terminalHref({ section: item.id })}
                      title={item.label}
                      onClick={(e) => {
                        e.preventDefault();
                        goto(item.id);
                        closeSidebar();
                      }}
                      className={`term-nav-item ${active ? "term-nav-item--active" : ""}`}
                    >
                      <span className="term-nav-item__icon relative">
                        <NavIcon id={item.id} />
                        {sidebarHidden && showLive && (
                          <span className="term-nav-live-dot absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
                        )}
                        {sidebarHidden && watchCount > 0 && (
                          <span className="term-nav-count-dot absolute -right-1 -top-1 min-w-[14px] rounded-full bg-[var(--term-accent)] px-1 text-center text-[8px] font-bold leading-[14px] text-white">
                            {watchCount}
                          </span>
                        )}
                      </span>
                      <span className="term-nav-item__label min-w-0 flex-1 truncate text-[13px] font-medium">
                        {item.label}
                      </span>
                      {item.soon && (
                        <span className="term-nav-item__meta shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide" style={{ background: "var(--term-surface-3)", color: "var(--term-text-subtle)" }}>
                          soon
                        </span>
                      )}
                      {showLive && (
                        <span className="term-nav-item__meta flex shrink-0 items-center gap-1 rounded-md bg-red-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-red-500">
                          <span className="term-blink h-1.5 w-1.5 rounded-full bg-red-500" />
                          live
                        </span>
                      )}
                      {watchCount > 0 && (
                        <span className="term-nav-item__meta shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] tabular-nums" style={{ background: "var(--term-surface-3)", color: "var(--term-text-muted)" }}>
                          {watchCount}
                        </span>
                      )}
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div
          className="term-sidebar__footer absolute bottom-0 left-0 right-0 border-t px-3 py-3"
          style={{ borderColor: "var(--term-border-subtle)", background: "var(--term-surface)" }}
        >
          <ThemeToggle variant="row" />
          <div className="term-status-card mt-2 flex items-center gap-2 px-3 py-2">
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
          onClick={closeSidebar}
          aria-hidden
        />
      )}
    </>
  );
}

function SidebarCollapseIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path d="M2.5 3.5h11M2.5 8h7M2.5 12.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12.5 6.5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SidebarExpandIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path d="M2.5 3.5h11M2.5 8h7M2.5 12.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11.5 6.5v5M13.5 8.5h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
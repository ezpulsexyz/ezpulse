import { fmtUsd } from "../../data";
import { Delta } from "../../components";
import { LiveBadge } from "../components/LiveBadge";
import { ThemeToggle } from "../components/ThemeToggle";
import { useTerminalContext } from "../TerminalContext";

export function Header() {
  const {
    openSidebar, query, setQuery, searchRef, results, feed, loading, lastUpdated,
    notifOpen, setNotifOpen, notifs, unseenCount, openNotifs, phantom, watchlist,
    signInPhantom, signOutPhantom, goto, openToken, setPaletteOpen,
  } = useTerminalContext();

  return (
    <header className="term-header sticky top-0 z-20">
      <div className="term-safe-x flex flex-wrap items-center gap-1.5 px-2 py-1.5 sm:gap-2 sm:px-3 sm:py-2 lg:px-5">
        <button
          onClick={openSidebar}
          aria-label="Open menu"
          title="Open menu"
          className="term-icon-btn hidden shrink-0 font-mono text-[10px] max-lg:flex"
        >
          ≡
        </button>

        <button
          onClick={() => setPaletteOpen(true)}
          title="Command palette (⌘K)"
          className="term-chip-btn hidden shrink-0 px-2 py-1 font-mono text-[9px] sm:flex"
        >
          ⌘K
        </button>

        <div className="relative min-w-0 flex-1 basis-[min(100%,12rem)]">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px]" style={{ color: "var(--term-text-subtle)" }}>/</span>
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tokens"
            className="term-input py-1.5 pl-7 pr-14 font-mono text-[11px]"
          />
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="term-chip-btn absolute right-1.5 top-1/2 hidden -translate-y-1/2 px-1 py-px font-mono text-[8px] sm:inline"
          >
            ⌘K
          </button>
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px]" style={{ color: "var(--term-text-subtle)" }}>
              ×
            </button>
          )}
          {results && <div className="fixed inset-0 z-30" onClick={() => setQuery("")} />}
          {results && (
            <div className="term-panel absolute left-0 right-0 top-full z-40 mt-1 max-h-[min(20rem,55vh)] overflow-y-auto rounded-md scrollbar-thin">
              {results.length === 0 && (
                <div className="px-3 py-4 text-center font-mono text-[11px]" style={{ color: "var(--term-text-subtle)" }}>No matches for “{query}”</div>
              )}
              {results.map((c) => (
                <button
                  key={c.ca}
                  onClick={() => openToken(c)}
                  className="flex w-full items-center gap-2 border-b px-3 py-2 text-left text-[11px] last:border-0 sm:gap-2.5"
                  style={{ borderColor: "var(--term-border-subtle)", color: "var(--term-text-secondary)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--term-hover)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <span className="min-w-0 truncate font-medium" style={{ color: "var(--term-text)" }}>{c.name}</span>
                  <span className="shrink-0 font-mono text-[10px]" style={{ color: "var(--term-text-subtle)" }}>${c.symbol}</span>
                  <span className="ml-auto shrink-0 font-mono tabular-nums">{c.mcap ? fmtUsd(c.mcap) : "—"}</span>
                  <Delta v={c.change24h} suffix="%" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <ThemeToggle />

          <span className="hidden min-[400px]:inline-flex">
            <LiveBadge
              label={loading ? "Scanning" : feed.length ? "Live" : "Idle"}
              ts={lastUpdated}
              tone={loading ? "amber" : feed.length ? "emerald" : "zinc"}
            />
          </span>

          <div className="relative">
            <button
              onClick={openNotifs}
              title="Watchlist notifications"
              aria-label="Watchlist notifications"
              className="term-icon-btn relative"
            >
              <BellIcon />
              {unseenCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-sm bg-red-600 px-0.5 font-mono text-[8px] font-semibold text-white">
                  {unseenCount > 9 ? "9+" : unseenCount}
                </span>
              )}
            </button>
            {notifOpen && <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />}
            {notifOpen && (
              <div className="term-panel term-notif-panel fixed inset-x-2 z-50 overflow-hidden rounded-md sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-1 sm:w-72">
                <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: "var(--term-border-subtle)" }}>
                  <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--term-text-subtle)" }}>Alerts</span>
                  <button onClick={() => { setNotifOpen(false); goto("watchlist"); }} className="font-mono text-[10px]" style={{ color: "var(--term-text-muted)" }}>Preferences</button>
                </div>
                <div className="max-h-[min(18rem,45vh)] overflow-y-auto scrollbar-thin">
                  {!phantom && (
                    <div className="px-3 py-5 text-center text-[11px]" style={{ color: "var(--term-text-muted)" }}>
                      <button onClick={() => { setNotifOpen(false); signInPhantom(); }} className="font-medium" style={{ color: "var(--term-text-secondary)" }}>Connect wallet</button> to star tokens and get alerts.
                    </div>
                  )}
                  {phantom && watchlist.length === 0 && (
                    <div className="px-3 py-5 text-center text-[11px]" style={{ color: "var(--term-text-muted)" }}>Star tokens to get alerts when signals fire.</div>
                  )}
                  {watchlist.length > 0 && notifs.length === 0 && (
                    <div className="px-3 py-5 text-center text-[11px]" style={{ color: "var(--term-text-muted)" }}>No alerts on {watchlist.length} watched token{watchlist.length !== 1 ? "s" : ""}.</div>
                  )}
                  {notifs.map((n) => (
                    <button
                      key={n.key}
                      onClick={() => { setNotifOpen(false); openToken(n.token); }}
                      className="flex w-full items-start gap-2 border-b px-3 py-2.5 text-left last:border-0"
                      style={{ borderColor: "var(--term-border-subtle)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--term-hover)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <span className="mt-0.5 shrink-0 font-mono text-[9px] uppercase" style={{ color: "var(--term-text-subtle)" }}>{n.strength.slice(0, 1)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[11px] font-medium" style={{ color: "var(--term-text)" }}>{n.title}</span>
                          <span className={`shrink-0 rounded px-1 py-px font-mono text-[7px] font-semibold uppercase tracking-wide text-white ${n.strength === "BULLISH" ? "bg-emerald-700" : "bg-red-600"}`}>{n.strength}</span>
                        </span>
                        <span className="mt-0.5 block truncate font-mono text-[10px]" style={{ color: "var(--term-text-muted)" }}>{n.token.name} ${n.token.symbol}</span>
                      </span>
                    </button>
                  ))}
                </div>
                <div className="term-panel-muted px-3 py-1.5 font-mono text-[9px]">
                  Recomputed every 60s
                </div>
              </div>
            )}
          </div>

          {phantom ? (
            <div className="term-chip-btn flex items-center gap-1 py-0.5 pl-2 pr-0.5 sm:pl-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="hidden font-mono text-[10px] tabular-nums sm:inline" style={{ color: "var(--term-text-muted)" }}>{phantom.slice(0, 4)}…{phantom.slice(-4)}</span>
              <button onClick={signOutPhantom} title="Sign out" aria-label="Sign out" className="term-icon-btn h-5 w-5 border-0 bg-transparent text-[9px]">×</button>
            </div>
          ) : (
            <button onClick={signInPhantom} className="term-connect-btn shrink-0 px-2.5 py-1 font-mono text-[10px] sm:px-3">
              Connect
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path
        d="M8 1.75a3.5 3.5 0 00-3.5 3.5v1.6c0 .47-.19.92-.52 1.25l-.78.9a.75.75 0 00.57 1.25h8.46a.75.75 0 00.57-1.25l-.78-.9a1.75 1.75 0 01-.52-1.25V5.25A3.5 3.5 0 008 1.75z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M6.5 12.25a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
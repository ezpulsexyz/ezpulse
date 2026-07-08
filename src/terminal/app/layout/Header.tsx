import { fmtUsd } from "../../data";
import { BLUE, Delta } from "../../components";
import { LiveBadge } from "../components/LiveBadge";
import { useTerminalContext } from "../TerminalContext";

export function Header() {
  const {
    menuOpen, setMenuOpen, query, setQuery, searchRef, results, feed, loading, lastUpdated,
    notifOpen, setNotifOpen, notifs, unseenCount, openNotifs, phantom, watchlist,
    signInPhantom, signOutPhantom, goto, openToken, setPaletteOpen,
  } = useTerminalContext();
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/90 bg-white">
      <div className="term-safe-x flex flex-wrap items-center gap-1.5 px-2 py-1.5 sm:gap-2 sm:px-3 sm:py-2 lg:px-5">
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className="shrink-0 rounded border border-zinc-200 px-2 py-1 font-mono text-[10px] text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-700 lg:hidden"
        >
          ≡
        </button>

        <button
          onClick={() => setPaletteOpen(true)}
          title="Command palette (⌘K)"
          className="hidden shrink-0 items-center rounded border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-[9px] text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-700 sm:flex"
        >
          ⌘K
        </button>

        <div className="relative min-w-0 flex-1 basis-[min(100%,12rem)]">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] text-zinc-400">/</span>
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tokens"
            className="w-full rounded border border-zinc-200 bg-zinc-50 py-1.5 pl-7 pr-14 font-mono text-[11px] outline-none transition focus:border-zinc-300 focus:bg-white focus:ring-1 focus:ring-zinc-200"
          />
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="absolute right-1.5 top-1/2 hidden -translate-y-1/2 rounded border border-zinc-200 bg-white px-1 py-px font-mono text-[8px] text-zinc-400 transition hover:border-zinc-300 hover:text-zinc-600 sm:inline"
          >
            ⌘K
          </button>
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] text-zinc-400 hover:text-zinc-600">
              ×
            </button>
          )}
          {results && <div className="fixed inset-0 z-30" onClick={() => setQuery("")} />}
          {results && (
            <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-[min(20rem,55vh)] overflow-y-auto rounded-md border border-zinc-200 bg-white shadow-md scrollbar-thin">
              {results.length === 0 && <div className="px-3 py-4 text-center font-mono text-[11px] text-zinc-400">No matches for “{query}”</div>}
              {results.map((c) => (
                <button key={c.ca} onClick={() => openToken(c)} className="flex w-full items-center gap-2 border-b border-zinc-50 px-3 py-2 text-left text-[11px] last:border-0 hover:bg-zinc-50 sm:gap-2.5">
                  <span className="min-w-0 truncate font-medium text-zinc-900">{c.name}</span>
                  <span className="shrink-0 font-mono text-[10px] text-zinc-400">${c.symbol}</span>
                  <span className="ml-auto shrink-0 font-mono tabular-nums text-zinc-700">{c.mcap ? fmtUsd(c.mcap) : "—"}</span>
                  <Delta v={c.change24h} suffix="%" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
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
              className={`relative flex h-7 w-7 items-center justify-center rounded border font-mono text-[10px] transition ${notifOpen ? "border-zinc-300 bg-zinc-50" : "border-zinc-200 bg-white hover:border-zinc-300"}`}
            >
              !
              {unseenCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-sm bg-red-600 px-0.5 font-mono text-[8px] font-semibold text-white">
                  {unseenCount > 9 ? "9+" : unseenCount}
                </span>
              )}
            </button>
            {notifOpen && <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />}
            {notifOpen && (
              <div className="fixed inset-x-2 top-[2.75rem] z-50 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-1 sm:w-72">
                <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2">
                  <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Alerts</span>
                  <button onClick={() => { setNotifOpen(false); goto("watchlist"); }} className="font-mono text-[10px] text-zinc-600 hover:text-zinc-900">Preferences</button>
                </div>
                <div className="max-h-[min(18rem,45vh)] overflow-y-auto scrollbar-thin">
                  {!phantom && (
                    <div className="px-3 py-5 text-center text-[11px] text-zinc-400">
                      <button onClick={() => { setNotifOpen(false); signInPhantom(); }} className="font-medium text-zinc-700 hover:text-zinc-900">Connect wallet</button> to star tokens and get alerts.
                    </div>
                  )}
                  {phantom && watchlist.length === 0 && (
                    <div className="px-3 py-5 text-center text-[11px] text-zinc-400">Star tokens to get alerts when signals fire.</div>
                  )}
                  {watchlist.length > 0 && notifs.length === 0 && (
                    <div className="px-3 py-5 text-center text-[11px] text-zinc-400">No alerts on {watchlist.length} watched token{watchlist.length !== 1 ? "s" : ""}.</div>
                  )}
                  {notifs.map((n) => (
                    <button
                      key={n.key}
                      onClick={() => { setNotifOpen(false); openToken(n.token); }}
                      className="flex w-full items-start gap-2 border-b border-zinc-50 px-3 py-2.5 text-left last:border-0 hover:bg-zinc-50"
                    >
                      <span className="mt-0.5 shrink-0 font-mono text-[9px] uppercase text-zinc-400">{n.strength.slice(0, 1)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[11px] font-medium text-zinc-900">{n.title}</span>
                          <span className={`shrink-0 rounded px-1 py-px font-mono text-[7px] font-semibold uppercase tracking-wide text-white ${n.strength === "BULLISH" ? "bg-emerald-700" : "bg-red-600"}`}>{n.strength}</span>
                        </span>
                        <span className="mt-0.5 block truncate font-mono text-[10px] text-zinc-500">{n.token.name} ${n.token.symbol}</span>
                      </span>
                    </button>
                  ))}
                </div>
                <div className="border-t border-zinc-100 bg-zinc-50 px-3 py-1.5 font-mono text-[9px] text-zinc-400">
                  Recomputed every 60s
                </div>
              </div>
            )}
          </div>

          {phantom ? (
            <div className="flex items-center gap-1 rounded border border-zinc-200 bg-white py-0.5 pl-2 pr-0.5 sm:pl-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="hidden font-mono text-[10px] tabular-nums text-zinc-600 sm:inline">{phantom.slice(0, 4)}…{phantom.slice(-4)}</span>
              <button onClick={signOutPhantom} title="Sign out" aria-label="Sign out" className="flex h-5 w-5 items-center justify-center rounded font-mono text-[9px] text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700">×</button>
            </div>
          ) : (
            <button
              onClick={signInPhantom}
              className="flex shrink-0 items-center rounded border border-transparent px-2.5 py-1 font-mono text-[10px] font-medium text-white transition hover:opacity-90 sm:px-3"
              style={{ background: BLUE }}
            >
              Connect
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
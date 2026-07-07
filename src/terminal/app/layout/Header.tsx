import { fmtUsd } from "../../data";
import { BLUE, Delta } from "../../components";
import { useTerminalContext } from "../TerminalContext";

export function Header() {
  const {
    menuOpen, setMenuOpen, query, setQuery, searchRef, results, feed, loading, lastUpdated,
    notifOpen, setNotifOpen, notifs, unseenCount, openNotifs, phantom, watchlist,
    signInPhantom, signOutPhantom, goto, openToken,
  } = useTerminalContext();
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 lg:px-8">
            <button onClick={() => setMenuOpen(true)} className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-zinc-500 lg:hidden">☰</button>
            <div className="relative min-w-0 max-w-xl flex-1">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">⌕</span>
              <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder='Search live Kickstart tokens…  ( / )'
                className="w-full rounded-full border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-8 text-[13px] outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100" />
              {query && <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">✕</button>}
              {results && <div className="fixed inset-0 z-30" onClick={() => setQuery("")} />}
              {results && (
                <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-xl animate-fade-up">
                  {results.length === 0 && <div className="px-4 py-6 text-center text-[13px] text-zinc-400">No matches for “{query}”</div>}
                  {results.map((c) => (
                    <button key={c.ca} onClick={() => openToken(c)} className="flex w-full items-center gap-3 px-4 py-2 text-left text-[13px] hover:bg-indigo-50/50">
                      <span className="font-semibold text-zinc-900">{c.name}</span>
                      <span className="text-[11px] text-zinc-400">${c.symbol}</span>
                      <span className="ml-auto font-semibold tabular-nums text-zinc-700">{c.mcap ? fmtUsd(c.mcap) : "—"}</span>
                      <Delta v={c.change24h} suffix="%" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className={`hidden items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold sm:flex ${feed.length ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}
              title={lastUpdated ? `Last updated ${new Date(lastUpdated).toLocaleTimeString()} · auto-refreshes every 60s` : undefined}>
              <span className={`term-blink h-1.5 w-1.5 rounded-full ${feed.length ? "bg-emerald-500" : "bg-zinc-400"}`} />
              {loading ? "Scanning…" : "Live"}
              {lastUpdated && !loading && <span className="hidden font-normal text-emerald-600/60 lg:inline">· {new Date(lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
            </span>

            {/* 🔔 watchlist notifications */}
            <div className="relative">
              <button onClick={openNotifs} title="Watchlist notifications"
                className={`relative flex h-9 w-9 items-center justify-center rounded-full border transition ${notifOpen ? "border-indigo-300 bg-indigo-50" : "border-zinc-200 bg-white hover:border-indigo-300"}`}>
                <span className="text-[15px]">🔔</span>
                {unseenCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">
                    {unseenCount > 9 ? "9+" : unseenCount}
                  </span>
                )}
              </button>
              {notifOpen && <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />}
              {notifOpen && (
                <div className="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl animate-fade-up sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80">
                  <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Watchlist alerts</span>
                    <button onClick={() => { setNotifOpen(false); goto("watchlist"); }} className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800">Preferences →</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {!phantom && (
                      <div className="px-4 py-6 text-center text-[12px] text-zinc-400">
                        <button onClick={() => { setNotifOpen(false); signInPhantom(); }} className="font-semibold text-indigo-600 hover:text-indigo-800">👻 Sign in with Phantom</button> to star tokens and get alerts.
                      </div>
                    )}
                    {phantom && watchlist.length === 0 && (
                      <div className="px-4 py-6 text-center text-[12px] text-zinc-400">Star tokens (☆) to get alerts when their signals fire.</div>
                    )}
                    {watchlist.length > 0 && notifs.length === 0 && (
                      <div className="px-4 py-6 text-center text-[12px] text-zinc-400">All quiet on your {watchlist.length} watched token{watchlist.length !== 1 ? "s" : ""} — no signals firing.</div>
                    )}
                    {notifs.map((n) => (
                      <button key={n.key} onClick={() => { setNotifOpen(false); openToken(n.token); }}
                        className="flex w-full items-start gap-2.5 border-b border-zinc-50 px-4 py-3 text-left last:border-0 hover:bg-indigo-50/40">
                        <span className="mt-0.5 text-[14px]">{n.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-[12.5px] font-bold text-zinc-900">{n.title}</span>
                            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[7px] font-black tracking-widest text-white ${n.strength === "BULLISH" ? "bg-emerald-600" : "bg-red-500"}`}>{n.strength}</span>
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-zinc-500">{n.token.name} ${n.token.symbol}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-zinc-100 bg-zinc-50/60 px-4 py-2 text-[10px] text-zinc-400">
                    Live · recomputed every 60s · email delivery coming soon
                  </div>
                </div>
              )}
            </div>

            {/* 👻 Phantom sign-in */}
            {phantom ? (
              <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white py-1 pl-3 pr-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="hidden font-mono text-[11px] text-zinc-600 sm:inline">{phantom.slice(0, 4)}…{phantom.slice(-4)}</span>
                <span className="font-mono text-[11px] text-zinc-600 sm:hidden">{phantom.slice(0, 3)}…</span>
                <button onClick={signOutPhantom} title="Sign out" className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700">✕</button>
              </div>
            ) : (
              <button onClick={signInPhantom}
                className="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-bold uppercase tracking-wide text-white transition hover:-translate-y-px sm:px-4" style={{ background: BLUE }}>
                👻 <span className="hidden sm:inline">Sign in</span>
              </button>
            )}
          </div>
    </header>
  );
}

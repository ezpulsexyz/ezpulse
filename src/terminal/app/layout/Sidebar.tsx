import { Logo } from "../../brand";
import { NAV_GROUPS } from "../types";
import { useTerminalContext } from "../TerminalContext";

export function Sidebar() {
  const { section, menuOpen, setMenuOpen, goto, feed, loading, watchlist } = useTerminalContext();
  return (
    <>
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col overflow-y-auto border-r border-zinc-200 bg-white transition-transform lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="px-5 py-5">
          <Logo />
        </div>
        <nav className="px-3">
          {NAV_GROUPS.map((g) => (
            <div key={g.workflow} className="mb-3">
              <div className="mb-1 px-3 text-[9px] font-black uppercase tracking-[.2em] text-zinc-400">{g.workflow}</div>
              <div className="space-y-0.5">
                {g.items.map((n) => (
                  <button key={n.id} onClick={() => goto(n.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13.5px] transition ${
                      section === n.id ? "bg-indigo-50 font-semibold text-indigo-700" : "text-zinc-600 hover:bg-zinc-50"
                    }`}>
                    <span className="w-4 text-center text-[12px]">{n.icon}</span> {n.label}
                    {n.soon && <span className="ml-auto rounded bg-zinc-100 px-1.5 py-px text-[8px] font-black tracking-widest text-zinc-400">SOON</span>}
                    {n.id === "signals" && feed.length > 0 && <span className="ml-auto flex items-center gap-1 text-[9px] font-bold text-red-500"><span className="term-blink h-1.5 w-1.5 rounded-full bg-red-500" />LIVE</span>}
                    {n.id === "watchlist" && watchlist.length > 0 && <span className="ml-auto rounded-full bg-amber-50 px-1.5 text-[9px] font-bold text-amber-500">{watchlist.length}</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="mx-3 mt-4 rounded-xl bg-zinc-50 p-3.5 text-[11px] leading-relaxed text-zinc-500">
          <span className="font-bold text-zinc-700">100% live data.</span> Only contracts ending in <span className="font-mono font-bold text-indigo-600">EASY</span> — the Kickstart on-chain fingerprint — are listed.
        </div>
        <div className="mt-auto border-t border-zinc-100 px-5 py-4 text-[11px] text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${feed.length ? "bg-emerald-500" : "bg-amber-400"}`} />
            {loading ? "Connecting…" : feed.length ? `Live · ${feed.length} tokens · Jupiter + DexScreener` : "Awaiting new launches"}
          </span>
        </div>
      </aside>
      {menuOpen && <div className="fixed inset-0 z-30 bg-zinc-900/30 lg:hidden" onClick={() => setMenuOpen(false)} />}
    </>
  );
}

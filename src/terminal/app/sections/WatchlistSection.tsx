import { isPhantomAvailable, type AlertPrefs } from "../../kickstart";
import { BLUE, Card } from "../../components";
import { PageHead, EmptyState } from "../components/PageLayout";
import { PhantomHint } from "../components/PhantomHint";
import { TerminalCoinTable } from "../components/TerminalCoinTable";
import { useTerminalContext } from "../TerminalContext";

export function WatchlistSection() {
  const { feed, watchlist, phantom, alerts, signInPhantom, goto, setAlert } = useTerminalContext();

  return (
            <>
              <PageHead title="Watchlist" sub="Your tracked tokens — with alerts so the market comes to you. Synced to your wallet across devices."
                right={phantom
                  ? <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700">★ {watchlist.length} watched</span>
                  : <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-zinc-500">Sign in required</span>} />

              {!phantom ? (
                <EmptyState icon="👻" title="Sign in to use your watchlist"
                  body="Your watchlist is keyed to your wallet — sign in with Phantom (read-only, no signatures) to star tokens, get 🔔 alerts when their signals fire, and carry your list across devices."
                  cta={<div className="flex flex-col items-center gap-3">
                    <button onClick={signInPhantom} className="rounded-full px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white" style={{ background: BLUE }}>👻 Sign in with Phantom</button>
                    {!isPhantomAvailable() && <div className="max-w-sm"><PhantomHint compact /></div>}
                  </div>} />
              ) : watchlist.length === 0 ? (
                <EmptyState icon="★" title="Nothing watched yet"
                  body="Open any token's terminal page and hit ☆ Watch. Watched tokens appear here with live data, and alerts fire on the events you choose below."
                  cta={<button onClick={() => goto("projects")} className="rounded-full px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white" style={{ background: BLUE }}>Browse projects →</button>} />
              ) : (
                <TerminalCoinTable coins={feed.filter((c) => watchlist.includes(c.ca))} title="★ Watched tokens · live" />
              )}

              <Card title="🔔 Alert preferences" className="mt-4" pad>
                <div className="grid gap-3 sm:grid-cols-2">
                  {([
                    ["priceMove", "Price moves", "Alert when a watched token moves ±10% in 24h"],
                    ["volumeSpike", "Volume spikes", "Alert when turnover exceeds 2× its average"],
                    ["verification", "Verification changes", "Alert when a bonded token becomes ✓ Verified"],
                    ["newLaunch", "New launches", "Alert the moment any new …EASY pair is indexed"],
                  ] as [keyof AlertPrefs, string, string][]).map(([k, label, hint]) => (
                    <button key={k} onClick={() => setAlert(k)}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${alerts[k] ? "border-indigo-200 bg-indigo-50/50" : "border-zinc-200 bg-white hover:border-zinc-300"}`}>
                      <div>
                        <div className="text-[13px] font-semibold text-zinc-900">{label}</div>
                        <div className="text-[11px] text-zinc-400">{hint}</div>
                      </div>
                      <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${alerts[k] ? "" : "bg-zinc-200"}`} style={alerts[k] ? { background: BLUE } : undefined}>
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${alerts[k] ? "left-[18px]" : "left-0.5"}`} />
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-zinc-400">Preferences saved locally. Email & Telegram delivery ship with accounts — alerts currently surface in-app.</p>
              </Card>
            </>
  );
}

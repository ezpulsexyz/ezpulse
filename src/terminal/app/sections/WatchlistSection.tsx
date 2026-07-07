import { isPhantomAvailable, type AlertPrefs } from "../../kickstart";
import { BLUE, Card } from "../../components";
import { PageHead, EmptyState } from "../components/PageLayout";
import { PhantomHint } from "../components/PhantomHint";
import { TerminalCoinTable } from "../components/TerminalCoinTable";
import { useTerminalContext } from "../TerminalContext";

export function WatchlistSection() {
  const { watchedCoins, watchlist, phantom, alerts, signInPhantom, goto, setAlert } = useTerminalContext();

  return (
    <>
      <PageHead
        title="Watchlist"
        sub="Your tracked tokens — with alerts so the market comes to you. Stored locally; sign in with Phantom to sync across devices."
        right={
          watchlist.length > 0
            ? <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700">★ {watchlist.length} watched</span>
            : <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-zinc-500">No tokens starred</span>
        }
      />

      {!phantom && watchlist.length > 0 && (
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] leading-relaxed text-indigo-900/80">
            Your watchlist is saved in this browser. Sign in with Phantom (read-only) to carry it across devices.
          </p>
          <button onClick={signInPhantom} className="shrink-0 rounded-full px-5 py-2 text-[11px] font-bold uppercase tracking-wide text-white" style={{ background: BLUE }}>
            👻 Sync with Phantom
          </button>
        </div>
      )}

      {watchlist.length === 0 ? (
        <EmptyState
          icon="★"
          title="Nothing watched yet"
          body="Open any token's terminal page and hit ☆ Watch. Watched tokens appear here with live data, and alerts fire on the events you choose below."
          cta={
            <button onClick={() => goto("projects")} className="rounded-full px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white" style={{ background: BLUE }}>
              Browse projects →
            </button>
          }
        />
      ) : (
        <TerminalCoinTable coins={watchedCoins} title="★ Watched tokens · live" />
      )}

      <Card title="🔔 Alert preferences" className="mt-4" pad>
        <div className="grid gap-3 sm:grid-cols-2">
          {([
            ["priceMove", "Price moves", "Alert when a watched token moves ±10% in 24h"],
            ["volumeSpike", "Volume spikes", "Alert when turnover exceeds 2× its average"],
            ["verification", "Verification changes", "Alert when a bonded token becomes ✓ Verified"],
            ["newLaunch", "New launches", "Alert the moment any new …EASY pair is indexed"],
            ["whaleSignal", "Whale signals", "Alert on large clips, one-sided flow, or volume bursts"],
          ] as [keyof AlertPrefs, string, string][]).map(([k, label, hint]) => (
            <button
              key={k}
              onClick={() => setAlert(k)}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${alerts[k] ? "border-indigo-200 bg-indigo-50/50" : "border-zinc-200 bg-white hover:border-zinc-300"}`}
            >
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

      {!phantom && !isPhantomAvailable() && (
        <div className="mt-4 max-w-lg">
          <PhantomHint compact />
        </div>
      )}
    </>
  );
}
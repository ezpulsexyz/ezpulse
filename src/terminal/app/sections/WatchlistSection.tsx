import { type AlertPrefs } from "../../kickstart";
import { anyWalletDetected } from "../../wallets";
import { BLUE, Card } from "../../components";
import { PageHead, EmptyState } from "../components/PageLayout";
import { WalletConnectHint } from "../components/WalletConnectHint";
import { TerminalCoinTable } from "../components/TerminalCoinTable";
import { useTerminalContext } from "../TerminalContext";

export function WatchlistSection() {
  const { watchedCoins, watchlist, phantom, alerts, openWalletPicker, goto, setAlert } = useTerminalContext();

  return (
    <>
      <PageHead
        title="Watchlist"
        sub="Your tracked tokens — with alerts so the market comes to you. Stored locally; connect a wallet to sync across devices."
        right={
          watchlist.length > 0
            ? <span className="term-pill-muted rounded-full px-3 py-1.5 text-[11px] font-semibold">★ {watchlist.length} watched</span>
            : <span className="term-pill-muted rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest">No tokens starred</span>
        }
      />

      {!phantom && watchlist.length > 0 && (
        <div className="term-sync-banner mb-4 flex flex-col gap-3 rounded-2xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] leading-relaxed">
            Your watchlist is saved in this browser. Connect a wallet (read-only) to carry it across devices.
          </p>
          <button type="button" onClick={openWalletPicker} className="term-connect-btn shrink-0 px-5 py-2 text-[11px] font-bold uppercase tracking-wide">
            Connect wallet
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
              className={`term-alert-card flex items-center justify-between rounded-xl px-4 py-3 text-left ${alerts[k] ? "term-alert-card--on" : ""}`}
            >
              <div>
                <div className="text-[13px] font-semibold">{label}</div>
                <div className="term-alert-card__hint text-[11px]">{hint}</div>
              </div>
              <span className={`term-toggle relative h-5 w-9 shrink-0 rounded-full transition ${alerts[k] ? "term-toggle--on" : ""}`}>
                <span className={`term-toggle__knob absolute top-0.5 h-4 w-4 rounded-full transition-all ${alerts[k] ? "left-[18px]" : "left-0.5"}`} />
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-[11px]" style={{ color: "var(--term-text-subtle)" }}>Preferences saved locally. Email & Telegram delivery ship with accounts — alerts currently surface in-app.</p>
      </Card>

      {!phantom && !anyWalletDetected() && (
        <div className="mt-4 max-w-lg">
          <WalletConnectHint compact />
        </div>
      )}
    </>
  );
}
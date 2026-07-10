import { BLUE } from "../../components";
import { useTerminalContext } from "../TerminalContext";
import { WalletConnectHint } from "../components/WalletConnectHint";
import { ShareModal } from "../components/ShareModal";

export function Toasts() {
  const {
    walletMissing, shareToken, setShareToken, signinNudge, setSigninNudge, openWalletPicker, feed,
    priceAlertToast, setPriceAlertToast, setNotifOpen, openToken,
  } = useTerminalContext();
  return (
    <>
      {walletMissing && (
        <div className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 animate-fade-up">
          <WalletConnectHint />
        </div>
      )}
      {shareToken && (
        <ShareModal c={shareToken} feed={feed} onClose={() => setShareToken(null)} />
      )}
      {signinNudge && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 animate-fade-up">
          <button onClick={() => { setSigninNudge(false); openWalletPicker(); }}
            className="flex items-center gap-2.5 rounded-full border border-indigo-200 bg-white px-5 py-3 text-[13px] font-semibold text-zinc-800 shadow-xl">
            💼 <span>Connect a wallet to sync your watchlist across devices</span>
            <span className="rounded-full px-3 py-1 text-[11px] font-bold text-white" style={{ background: BLUE }}>Connect</span>
          </button>
        </div>
      )}
      {priceAlertToast && (
        <div className="fixed bottom-5 left-1/2 z-[95] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 animate-fade-up">
          <div className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-xl">
            <button
              type="button"
              onClick={() => {
                setPriceAlertToast(null);
                setNotifOpen(true);
                openToken(priceAlertToast.token);
              }}
              className="flex min-w-0 flex-1 items-start gap-3 text-left"
            >
              <span className="text-xl">{priceAlertToast.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-zinc-900">{priceAlertToast.title}</span>
                <span className="mt-0.5 block text-[11px] text-zinc-500">{priceAlertToast.detail}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setPriceAlertToast(null)}
              className="shrink-0 text-lg leading-none text-zinc-400 hover:text-zinc-600"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}

import { BLUE } from "../../components";
import { useTerminalContext } from "../TerminalContext";
import { WalletConnectHint } from "../components/WalletConnectHint";
import { ShareModal } from "../components/ShareModal";

export function Toasts() {
  const {
    walletMissing, shareToken, setShareToken, signinNudge, setSigninNudge, openWalletPicker, feed,
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
    </>
  );
}

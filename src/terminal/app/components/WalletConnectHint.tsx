import { WALLET_OPTIONS, isMobileDevice, anyWalletDetected } from "../../wallets";

export function WalletConnectHint({ compact = false }: { compact?: boolean }) {
  const mobile = isMobileDevice();
  const detected = anyWalletDetected();

  return (
    <div className={`flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
      <span className="mt-px text-[13px]">💼</span>
      <div className="min-w-0 text-left">
        <p className={`font-semibold text-amber-800 ${compact ? "text-[11.5px]" : "text-[12.5px]"}`}>
          {detected ? "Wallet ready — tap Connect wallet to sign in." : "No Solana wallet detected in this browser."}
        </p>
        <p className={`text-amber-700/80 ${compact ? "text-[10.5px]" : "text-[11.5px]"}`}>
          {mobile
            ? "Use Connect wallet to open ezpulse in Phantom, Solflare, Backpack, or Jupiter, then approve read-only access."
            : `Install ${WALLET_OPTIONS.map((w) => w.name).join(", ")} or reload after enabling the extension.`}
        </p>
      </div>
    </div>
  );
}

/** @deprecated Use WalletConnectHint */
export const PhantomHint = WalletConnectHint;
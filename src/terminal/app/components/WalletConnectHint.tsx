import { WALLET_OPTIONS, isMobileDevice, anyWalletDetected } from "../../wallets";

export function WalletConnectHint({ compact = false }: { compact?: boolean }) {
  const mobile = isMobileDevice();
  const detected = anyWalletDetected();

  return (
    <div className={`term-wallet-hint flex items-start gap-2.5 rounded-xl ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
      <span className="mt-px text-[13px] opacity-70">💼</span>
      <div className="min-w-0 text-left">
        <p className={`term-wallet-hint__title ${compact ? "text-[11.5px]" : "text-[12.5px]"}`}>
          {detected ? "Wallet ready — tap Connect wallet to sign in." : "No Solana wallet detected in this browser."}
        </p>
        <p className={`term-wallet-hint__sub ${compact ? "text-[10.5px]" : "text-[11.5px]"}`}>
          {mobile
            ? "Tap Connect wallet, choose your wallet app, approve the connection, and you’ll return here signed in."
            : `Install ${WALLET_OPTIONS.map((w) => w.name).join(", ")} or reload after enabling the extension.`}
        </p>
      </div>
    </div>
  );
}

/** @deprecated Use WalletConnectHint */
export const PhantomHint = WalletConnectHint;
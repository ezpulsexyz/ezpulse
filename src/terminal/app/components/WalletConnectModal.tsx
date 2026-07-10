import { useEffect, useRef } from "react";
import { supportsMobileConnect } from "../../mobileWalletConnect";
import { WalletLogo } from "./WalletLogo";
import {
  WALLET_OPTIONS,
  getWalletOption,
  isMobileDevice,
  isWalletDetected,
  shouldUseMobileWalletAppConnect,
  type WalletId,
} from "../../wallets";

export function WalletConnectModal({
  open,
  connecting,
  connectingId,
  onClose,
  onSelect,
}: {
  open: boolean;
  connecting: boolean;
  connectingId: WalletId | null;
  onClose: () => void;
  onSelect: (id: WalletId) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const mobile = isMobileDevice();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !connecting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, connecting, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-4 sm:items-center"
      onClick={() => { if (!connecting) onClose(); }}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-connect-title"
        className="term-wallet-modal w-full max-w-md rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-start justify-between gap-3 border-b px-5 py-4"
          style={{ borderColor: "var(--term-border-subtle)" }}
        >
          <div>
            <h2 id="wallet-connect-title" className="font-display text-base font-semibold" style={{ color: "var(--term-text)" }}>
              Connect wallet
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed" style={{ color: "var(--term-text-muted)" }}>
              Read-only sign-in — we only fetch your public address and token balances. No signatures, ever.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={connecting}
            aria-label="Close"
            className="term-icon-btn h-7 w-7 shrink-0 border disabled:opacity-50"
            style={{ borderColor: "var(--term-border)", color: "var(--term-text-muted)" }}
          >
            ×
          </button>
        </div>

        <div className="space-y-2 px-4 py-4">
          {WALLET_OPTIONS.map((wallet) => {
            const detected = isWalletDetected(wallet.id);
            const busy = connecting && connectingId === wallet.id;
            const useAppConnect = shouldUseMobileWalletAppConnect(wallet.id);
            const actionLabel = busy
              ? "Connecting…"
              : detected
                ? "Connect"
                : useAppConnect
                  ? "Connect"
                  : mobile && !supportsMobileConnect(wallet.id)
                    ? "Open app"
                    : "Install";
            return (
              <button
                key={wallet.id}
                type="button"
                disabled={connecting}
                onClick={() => onSelect(wallet.id)}
                className="term-wallet-option flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition disabled:opacity-60"
              >
                <span className="term-wallet-option__logo flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full p-1.5">
                  <WalletLogo id={wallet.id} className="h-full w-full" size={28} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-[13px]" style={{ color: "var(--term-text)" }}>
                    {wallet.name}
                  </span>
                  <span className="block text-[11px]" style={{ color: "var(--term-text-muted)" }}>
                    {detected
                      ? "Detected in this browser"
                      : useAppConnect
                        ? "Opens wallet app · approve · returns to browser"
                        : mobile
                          ? "Opens in the wallet app"
                          : `Get ${wallet.name}`}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-[10px] uppercase tracking-wide ${
                    detected || useAppConnect || mobile ? "term-wallet-badge term-wallet-badge--primary" : "term-wallet-badge"
                  }`}
                >
                  {actionLabel}
                </span>
              </button>
            );
          })}
        </div>

        <p
          className="border-t px-5 py-3 text-[10px] leading-relaxed"
          style={{ borderColor: "var(--term-border-subtle)", color: "var(--term-text-subtle)" }}
        >
          {mobile
            ? "On mobile, pick a wallet to open its app, approve connect, and you’ll land back here in your browser — signed in."
            : `No wallet installed? ${getWalletOption("phantom").name}, ${getWalletOption("solflare").name}, ${getWalletOption("backpack").name}, and ${getWalletOption("jupiter").name} all work.`}
        </p>
      </div>
    </div>
  );
}
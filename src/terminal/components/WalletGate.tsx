import { useEffect, useRef, useState } from "react";
import { useWallet } from "../hooks/useWallet";
import { fetchTokenBalance } from "../kickstart";
import { WalletConnectModal } from "../app/components/WalletConnectModal";
import type { WalletId } from "../wallets";

interface WalletGateProps {
  tokenCa: string;
  onHoldingVerified?: (hasHolding: boolean, balance: number, wallet?: string | null) => void;
  showPostButton?: boolean;
  onPostThesis?: () => void;
}

export default function WalletGate({
  tokenCa,
  onHoldingVerified,
  showPostButton = false,
  onPostThesis,
}: WalletGateProps) {
  const { wallet, connecting, connectingId, connect, disconnect } = useWallet();
  const [balance, setBalance] = useState(0);
  const [checking, setChecking] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const hasHolding = balance > 0;
  const onVerifiedRef = useRef(onHoldingVerified);
  onVerifiedRef.current = onHoldingVerified;

  const handleSelect = async (id: WalletId) => {
    const addr = await connect(id);
    if (addr) setPickerOpen(false);
  };

  useEffect(() => {
    if (!wallet) {
      setBalance(0);
      onVerifiedRef.current?.(false, 0, null);
      return;
    }

    const check = async () => {
      setChecking(true);
      try {
        const bal = await fetchTokenBalance(wallet, tokenCa);
        setBalance(bal);
        onVerifiedRef.current?.(bal > 0, bal, wallet);
      } catch (e) {
        console.error("Balance check failed:", e);
        setBalance(0);
        onVerifiedRef.current?.(false, 0, wallet);
      } finally {
        setChecking(false);
      }
    };

    void check();
  }, [wallet, tokenCa]);

  if (!wallet) {
    return (
      <>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          disabled={connecting}
          className="rounded-2xl bg-blue-600 px-8 py-3.5 font-medium text-white transition hover:bg-blue-700 disabled:opacity-70"
        >
          {connecting ? "Connecting..." : "Connect wallet to participate"}
        </button>
        <WalletConnectModal
          open={pickerOpen}
          connecting={connecting}
          connectingId={connectingId}
          onClose={() => setPickerOpen(false)}
          onSelect={(id) => void handleSelect(id)}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3 rounded-2xl bg-zinc-100 px-4 py-2">
          <span className="font-mono text-sm">
            {wallet.slice(0, 4)}...{wallet.slice(-4)}
          </span>
          <button
            type="button"
            onClick={disconnect}
            className="text-xs text-zinc-400 transition hover:text-red-500"
          >
            Disconnect
          </button>
        </div>

        {checking ? (
          <div className="text-sm text-zinc-500">Checking holdings...</div>
        ) : hasHolding ? (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-100 px-4 py-1.5 text-sm font-medium text-emerald-700">
            ✓ Verified Holder <span className="font-mono text-xs">({balance.toFixed(2)})</span>
          </div>
        ) : (
          <div className="rounded-2xl bg-amber-100 px-4 py-1.5 text-sm font-medium text-amber-700">
            No holdings detected
          </div>
        )}
      </div>

      {showPostButton && (
        <button
          type="button"
          onClick={onPostThesis}
          disabled={!hasHolding}
          className={`rounded-2xl px-8 py-3.5 font-medium transition ${
            hasHolding
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "cursor-not-allowed bg-zinc-200 text-zinc-400"
          }`}
        >
          {hasHolding ? "Post Thesis" : "Connect wallet & hold token to post"}
        </button>
      )}
    </div>
  );
}
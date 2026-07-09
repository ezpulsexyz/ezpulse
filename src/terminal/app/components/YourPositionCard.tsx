import { useEffect, useState } from "react";
import { BLUE, Card } from "../../components";
import { useWallet } from "../../hooks/useWallet";
import { fetchTokenBalance, type LiveLaunch } from "../../kickstart";
import { formatTokenAmount } from "../../investorThesis";
import type { Section } from "../types";
import { WalletConnectModal } from "./WalletConnectModal";
import type { WalletId } from "../../wallets";

export function YourPositionCard({
  token,
  goto,
}: {
  token: LiveLaunch;
  goto: (s: Section) => void;
}) {
  const { wallet, connecting, connectingId, connect } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!wallet) {
      setBalance(null);
      return;
    }

    let alive = true;
    setLoading(true);
    void fetchTokenBalance(wallet, token.ca).then((amount) => {
      if (alive) {
        setBalance(amount);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [wallet, token.ca]);

  const valueUsd = balance !== null ? balance * (token.priceUsd || 0) : null;
  const hasHolding = balance !== null && balance > 0;

  return (
    <Card
      title="💼 Your position"
      right={
        wallet ? (
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {wallet.slice(0, 4)}…{wallet.slice(-4)} · connected
          </span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            Wallet not connected
          </span>
        )
      }
    >
      {!wallet && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <p className="text-[13px] text-zinc-500">
            Connect your wallet to see your {`$${token.symbol}`} position — read-only, no signatures.
          </p>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            disabled={connecting}
            className="rounded-full px-5 py-2 text-[11px] font-bold uppercase tracking-wide text-white disabled:opacity-70"
            style={{ background: BLUE }}
          >
            {connecting ? "Connecting…" : "Connect wallet →"}
          </button>
        </div>
      )}
      <WalletConnectModal
        open={pickerOpen}
        connecting={connecting}
        connectingId={connectingId}
        onClose={() => setPickerOpen(false)}
        onSelect={(id: WalletId) => {
          void connect(id).then((addr) => { if (addr) setPickerOpen(false); });
        }}
      />
      {wallet && loading && (
        <div className="flex items-center gap-3 px-5 py-4 text-[13px] text-zinc-500">
          <span className="term-blink h-2 w-2 rounded-full bg-indigo-500" /> Reading balance…
        </div>
      )}
      {wallet && !loading && balance !== null && !hasHolding && (
        <div className="px-5 py-4">
          <p className="text-[13px] text-zinc-500">Your wallet holds no ${token.symbol}.</p>
        </div>
      )}
      {wallet && !loading && hasHolding && valueUsd !== null && (
        <div className="grid grid-cols-2 gap-px bg-zinc-100 sm:grid-cols-4">
          {[
            ["Balance", formatTokenAmount(balance!), `$${token.symbol}`],
            ["Value", valueUsd >= 0.01 ? `$${valueUsd.toFixed(2)}` : "<$0.01", "at live price"],
            [
              "24h move",
              `${token.change24h >= 0 ? "+" : ""}${token.change24h.toFixed(1)}%`,
              token.change24h >= 0 ? "▲ position up" : "▼ position down",
            ],
            ["Status", "✓ Holder", "on-chain balance verified"],
          ].map(([l, v, s]) => (
            <div key={l as string} className="bg-white px-5 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">{l}</div>
              <div
                className={`mt-0.5 font-display text-lg font-semibold tabular-nums ${
                  l === "24h move"
                    ? token.change24h >= 0
                      ? "text-emerald-600"
                      : "text-red-500"
                    : l === "Status"
                      ? "text-emerald-600"
                      : "text-zinc-900"
                }`}
              >
                {v}
              </div>
              <div className="text-[10px] text-zinc-400">{s}</div>
            </div>
          ))}
        </div>
      )}
      {wallet && !loading && balance !== null && (
        <div className="border-t border-zinc-100 px-5 py-3">
          <button
            type="button"
            onClick={() => goto("portfolio")}
            className="text-[11px] font-semibold text-indigo-600 transition hover:text-indigo-800"
          >
            View full portfolio →
          </button>
        </div>
      )}
    </Card>
  );
}
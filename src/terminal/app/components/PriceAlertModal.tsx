import { useState } from "react";
import { useTerminalContext } from "../TerminalContext";
import { fmtUsd } from "../../data";
import type { AlertMetric } from "../hooks/useTerminal";
import type { LiveLaunch } from "../../kickstart";

interface PriceAlertModalProps {
  token: LiveLaunch;
  onClose: () => void;
}

export function PriceAlertModal({ token, onClose }: PriceAlertModalProps) {
  const { addPriceAlert } = useTerminalContext();
  const [metric, setMetric] = useState<AlertMetric>("price");
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [targetPrice, setTargetPrice] = useState("");
  const [loading, setLoading] = useState(false);

  const currentValue = metric === "mcap" ? token.mcap : token.priceUsd;
  const currentLabel =
    metric === "mcap"
      ? currentValue ? fmtUsd(currentValue) : "—"
      : currentValue ? `$${currentValue.toFixed(6)}` : "—";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(targetPrice);

    if (!value || value <= 0) {
      alert(`Please enter a valid ${metric === "mcap" ? "market cap" : "price"}`);
      return;
    }

    setLoading(true);

    addPriceAlert(token.ca, token.symbol, value, direction, metric);

    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <div className="font-semibold">Set Alert</div>
            <div className="text-sm text-zinc-500">
              ${token.symbol} · Current {metric === "mcap" ? "mcap" : "price"}: {currentLabel}
            </div>
          </div>
          <button onClick={onClose} className="text-2xl leading-none text-zinc-400 hover:text-zinc-600">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Target</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMetric("price")}
                className={`flex-1 rounded-xl border py-2 text-sm font-medium transition ${metric === "price" ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-zinc-200 hover:bg-zinc-50"}`}
              >
                Price
              </button>
              <button
                type="button"
                onClick={() => setMetric("mcap")}
                className={`flex-1 rounded-xl border py-2 text-sm font-medium transition ${metric === "mcap" ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-zinc-200 hover:bg-zinc-50"}`}
              >
                Mcap
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Direction</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDirection("above")}
                className={`flex-1 rounded-xl border py-2 text-sm font-medium transition ${direction === "above" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-zinc-200 hover:bg-zinc-50"}`}
              >
                Above
              </button>
              <button
                type="button"
                onClick={() => setDirection("below")}
                className={`flex-1 rounded-xl border py-2 text-sm font-medium transition ${direction === "below" ? "border-red-500 bg-red-50 text-red-700" : "border-zinc-200 hover:bg-zinc-50"}`}
              >
                Below
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">
              {metric === "mcap" ? "Target Mcap (USD)" : "Target Price (USD)"}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-zinc-400">$</span>
              <input
                type="number"
                step="any"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder={metric === "mcap" ? "1000000" : "0.01234"}
                className="w-full rounded-xl border border-zinc-200 pl-7 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
                required
              />
            </div>
            <p className="mt-1.5 text-[10px] text-zinc-400">
              You'll be notified when {metric === "mcap" ? "market cap" : "price"} goes {direction} this value.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-sm font-medium hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !targetPrice}
              className="flex-1 rounded-xl bg-zinc-900 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Setting..." : "Set Alert"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
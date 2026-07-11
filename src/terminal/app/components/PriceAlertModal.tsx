import { useState } from "react";
import { useTerminalContext } from "../TerminalContext";
import {
  ALERT_METRIC_OPTIONS,
  formatAlertValue,
  getAlertMetricValue,
  isPercentMetric,
  type AlertMetric,
} from "../alerts";
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

  const selected = ALERT_METRIC_OPTIONS.find((m) => m.id === metric)!;
  const currentValue = getAlertMetricValue(metric, token);
  const currentLabel = Number.isFinite(currentValue)
    ? formatAlertValue(metric, currentValue)
    : "—";
  const percent = isPercentMetric(metric);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(targetPrice);

    if (!Number.isFinite(value) || (percent ? value <= 0 : value <= 0)) {
      alert(`Please enter a valid ${selected.hint.toLowerCase()}`);
      return;
    }

    setLoading(true);
    addPriceAlert(token.ca, token.symbol, value, direction, metric);
    setLoading(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/55 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="set-alert-title"
        className="term-wallet-modal w-full max-w-md rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between border-b px-5 py-4"
          style={{ borderColor: "var(--term-border-subtle)" }}
        >
          <div>
            <h2 id="set-alert-title" className="font-display text-base font-semibold" style={{ color: "var(--term-text)" }}>
              Set Alert
            </h2>
            <p className="mt-1 text-[12px]" style={{ color: "var(--term-text-muted)" }}>
              ${token.symbol} · {selected.label}: {currentLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="term-icon-btn h-7 w-7 shrink-0 border"
            style={{ borderColor: "var(--term-border)", color: "var(--term-text-muted)" }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-5">
          <div>
            <label className="mb-1.5 block font-mono text-[9px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--term-text-subtle)" }}>
              Metric
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ALERT_METRIC_OPTIONS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMetric(m.id)}
                  title={m.hint}
                  className={`rounded-xl border px-2 py-2 text-[11px] font-semibold transition ${
                    metric === m.id ? "term-alert-card--on" : "term-alert-card"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[10px]" style={{ color: "var(--term-text-subtle)" }}>{selected.hint}</p>
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[9px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--term-text-subtle)" }}>
              Direction
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDirection("above")}
                className={`flex-1 rounded-xl border py-2 text-sm font-medium transition ${
                  direction === "above"
                    ? "border-emerald-600 bg-emerald-700/10 text-emerald-600"
                    : "term-alert-card"
                }`}
              >
                Above
              </button>
              <button
                type="button"
                onClick={() => setDirection("below")}
                className={`flex-1 rounded-xl border py-2 text-sm font-medium transition ${
                  direction === "below"
                    ? "border-red-600 bg-red-600/10 text-red-600"
                    : "term-alert-card"
                }`}
              >
                Below
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[9px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--term-text-subtle)" }}>
              {percent ? "Threshold (%)" : "Threshold (USD)"}
            </label>
            <div className="relative">
              {!percent && (
                <span className="absolute left-3 top-2.5 font-mono text-[11px]" style={{ color: "var(--term-text-subtle)" }}>$</span>
              )}
              <input
                type="number"
                step="any"
                min={percent ? "0.1" : "0"}
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder={
                  percent
                    ? direction === "above" ? "15" : "10"
                    : metric === "mcap" ? "1000000" : "0.01234"
                }
                className={`term-input w-full py-2.5 text-sm ${percent ? "pl-3 pr-8" : "pl-7"}`}
                required
              />
              {percent && (
                <span className="absolute right-3 top-2.5 font-mono text-[11px]" style={{ color: "var(--term-text-subtle)" }}>%</span>
              )}
            </div>
            <p className="mt-1.5 text-[10px]" style={{ color: "var(--term-text-subtle)" }}>
              {percent
                ? direction === "above"
                  ? `Notify when ${selected.label} rises to +${targetPrice || "…"}% or higher.`
                  : `Notify when ${selected.label} falls to -${targetPrice || "…"}% or lower.`
                : `Notify when ${selected.label.toLowerCase()} goes ${direction} this value.`}
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="term-action term-action--outline flex-1">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !targetPrice}
              className="term-connect-btn flex-1 py-2.5 text-[12px] font-bold uppercase tracking-wide disabled:opacity-60"
            >
              {loading ? "Setting…" : "Set Alert"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
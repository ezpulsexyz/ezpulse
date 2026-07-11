import { useMemo, useState } from "react";
import { Card } from "../../components";
import { useTerminalContext } from "../TerminalContext";
import {
  formatAlertCondition,
  formatAlertMetricLabel,
  formatAlertValue,
  getAlertMetricValue,
  type AlertMetric,
} from "../alerts";
import type { PriceAlert } from "../hooks/useTerminal";

export function ThresholdAlertsManager() {
  const {
    priceAlerts,
    feed,
    togglePriceAlert,
    removePriceAlert,
    openToken,
    setPriceAlertToken,
    goto,
  } = useTerminalContext();
  const [showDisabled, setShowDisabled] = useState(false);

  const sorted = useMemo(
    () => [...priceAlerts].sort((a, b) => b.createdAt - a.createdAt),
    [priceAlerts],
  );

  const visible = showDisabled ? sorted : sorted.filter((a) => a.enabled);
  const activeCount = priceAlerts.filter((a) => a.enabled).length;

  const tokenByCa = useMemo(() => {
    const map = new Map<string, (typeof feed)[number]>();
    feed.forEach((c) => map.set(c.ca.toLowerCase(), c));
    return map;
  }, [feed]);

  return (
    <Card
      title="🎯 Threshold alerts"
      className="mt-4"
      pad
      right={
        priceAlerts.length > 0 ? (
          <span className="term-pill-muted rounded-full px-3 py-1 text-[10px] font-semibold tabular-nums">
            {activeCount} active · {priceAlerts.length} total
          </span>
        ) : undefined
      }
    >
      {priceAlerts.length === 0 ? (
        <div className="term-status-card px-4 py-8 text-center">
          <div className="text-2xl">🎯</div>
          <p className="mt-2 text-[13px] font-medium" style={{ color: "var(--term-text-secondary)" }}>
            No custom thresholds yet
          </p>
          <p className="mt-1 text-[11px] leading-relaxed" style={{ color: "var(--term-text-muted)" }}>
            Open any token and tap <strong>Set Alert</strong> to watch price, mcap, % moves, liquidity, or volume.
          </p>
          <button
            type="button"
            onClick={() => goto("projects")}
            className="term-connect-btn mt-4 px-5 py-2 text-[11px] font-bold uppercase tracking-wide"
          >
            Browse tokens
          </button>
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--term-text-muted)" }}>
              Custom thresholds fire in-app and over live price feeds. Toggle off to pause without deleting.
            </p>
            <button
              type="button"
              onClick={() => setShowDisabled((v) => !v)}
              className="term-chip-btn shrink-0 px-2.5 py-1 font-mono text-[9px]"
            >
              {showDisabled ? "Active only" : "Show paused"}
            </button>
          </div>

          <div className="space-y-2">
            {visible.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                live={tokenByCa.get(alert.ca.toLowerCase())}
                onOpen={() => {
                  const live = tokenByCa.get(alert.ca.toLowerCase());
                  if (live) openToken(live);
                }}
                onEdit={() => {
                  const live = tokenByCa.get(alert.ca.toLowerCase());
                  if (live) setPriceAlertToken(live);
                }}
                onToggle={() => togglePriceAlert(alert.id)}
                onRemove={() => removePriceAlert(alert.id)}
              />
            ))}
          </div>

          {visible.length === 0 && (
            <p className="py-6 text-center text-[11px]" style={{ color: "var(--term-text-muted)" }}>
              All alerts are paused. Toggle &quot;Show paused&quot; to manage them.
            </p>
          )}
        </>
      )}
    </Card>
  );
}

function AlertRow({
  alert,
  live,
  onOpen,
  onEdit,
  onToggle,
  onRemove,
}: {
  alert: PriceAlert;
  live?: { symbol: string; name: string; ca: string } & Record<string, number>;
  onOpen: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const current = live ? getAlertMetricValue(alert.metric, live as never) : null;
  const condition = formatAlertCondition(alert.metric, alert.targetPrice, alert.direction);

  return (
    <div
      className={`term-alert-card flex flex-col gap-3 rounded-xl px-3 py-3 sm:flex-row sm:items-center ${alert.enabled ? "term-alert-card--on" : ""}`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-left"
        disabled={!live}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[13px] font-semibold" style={{ color: "var(--term-text)" }}>
            ${alert.symbol}
          </span>
          <MetricChip metric={alert.metric} />
          <DirectionChip direction={alert.direction} />
          {!alert.enabled && (
            <span className="rounded px-1.5 py-px font-mono text-[8px] font-semibold uppercase tracking-wide" style={{ background: "var(--term-surface-3)", color: "var(--term-text-subtle)" }}>
              Paused
            </span>
          )}
        </div>
        <div className="mt-1 text-[12px] font-medium" style={{ color: "var(--term-text-secondary)" }}>
          {condition}
        </div>
        {current !== null && (
          <div className="mt-0.5 font-mono text-[10px] tabular-nums" style={{ color: "var(--term-text-muted)" }}>
            Now {formatAlertValue(alert.metric, current)}
          </div>
        )}
      </button>

      <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
        {live && (
          <button type="button" onClick={onEdit} className="term-chip-btn px-2.5 py-1 font-mono text-[9px]">
            New
          </button>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={alert.enabled ? "Pause alert" : "Enable alert"}
          className={`term-toggle relative h-5 w-9 shrink-0 rounded-full transition ${alert.enabled ? "term-toggle--on" : ""}`}
        >
          <span className={`term-toggle__knob absolute top-0.5 h-4 w-4 rounded-full transition-all ${alert.enabled ? "left-[18px]" : "left-0.5"}`} />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Delete alert"
          className="term-icon-btn h-7 w-7 border text-[11px]"
          style={{ borderColor: "var(--term-border)", color: "var(--term-text-muted)" }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

function MetricChip({ metric }: { metric: AlertMetric }) {
  return (
    <span
      className="rounded px-1.5 py-px font-mono text-[8px] font-semibold uppercase tracking-wide"
      style={{
        background: "color-mix(in srgb, var(--term-accent) 12%, var(--term-surface))",
        color: "var(--term-text-secondary)",
      }}
    >
      {formatAlertMetricLabel(metric)}
    </span>
  );
}

function DirectionChip({ direction }: { direction: "above" | "below" }) {
  const up = direction === "above";
  return (
    <span
      className={`rounded px-1.5 py-px font-mono text-[8px] font-semibold uppercase tracking-wide text-white ${up ? "bg-emerald-700" : "bg-red-600"}`}
    >
      {up ? "Above" : "Below"}
    </span>
  );
}
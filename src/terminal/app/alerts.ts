import { fmtUsd } from "../data";
import type { LiveLaunch } from "../kickstart";

export type AlertMetric =
  | "price"
  | "mcap"
  | "change24h"
  | "change1h"
  | "liquidity"
  | "volume24h";

export type AlertDirection = "above" | "below";

export const ALERT_METRIC_OPTIONS: { id: AlertMetric; label: string; hint: string }[] = [
  { id: "price", label: "Price", hint: "USD per token" },
  { id: "mcap", label: "Mcap", hint: "Market cap in USD" },
  { id: "change24h", label: "24h %", hint: "24-hour price change" },
  { id: "change1h", label: "1h %", hint: "1-hour price change" },
  { id: "liquidity", label: "Liquidity", hint: "Pool liquidity in USD" },
  { id: "volume24h", label: "Vol 24h", hint: "24-hour trading volume" },
];

export function isPercentMetric(metric: AlertMetric): boolean {
  return metric === "change24h" || metric === "change1h";
}

export function getAlertMetricValue(metric: AlertMetric, token: LiveLaunch): number {
  switch (metric) {
    case "price":
      return token.priceUsd;
    case "mcap":
      return token.mcap;
    case "change24h":
      return token.change24h;
    case "change1h":
      return token.change1h;
    case "liquidity":
      return token.liquidity;
    case "volume24h":
      return token.volume24h;
  }
}

export function metricHasValue(metric: AlertMetric, value: number): boolean {
  if (isPercentMetric(metric)) return Number.isFinite(value);
  return value > 0;
}

export function alertCrossed(
  metric: AlertMetric,
  direction: AlertDirection,
  current: number,
  target: number,
): boolean {
  if (isPercentMetric(metric)) {
    const t = Math.abs(target);
    if (direction === "above") return current >= t;
    return current <= -t;
  }
  if (!metricHasValue(metric, current)) return false;
  if (direction === "above") return current >= target;
  return current <= target;
}

export function formatAlertMetricLabel(metric: AlertMetric): string {
  return ALERT_METRIC_OPTIONS.find((m) => m.id === metric)?.label ?? metric;
}

export function formatAlertValue(metric: AlertMetric, value: number): string {
  if (isPercentMetric(metric)) {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  }
  if (metric === "price") return `$${value.toFixed(6)}`;
  return fmtUsd(value);
}

export function formatAlertTarget(
  metric: AlertMetric,
  target: number,
  direction: AlertDirection,
): string {
  if (isPercentMetric(metric)) {
    const t = Math.abs(target);
    return direction === "below" ? `-${t}%` : `+${t}%`;
  }
  if (metric === "price") return `$${target}`;
  return fmtUsd(target);
}

export function formatAlertCondition(
  metric: AlertMetric,
  target: number,
  direction: AlertDirection,
): string {
  return `${formatAlertMetricLabel(metric)} ${direction} ${formatAlertTarget(metric, target, direction)}`;
}

const VALID_METRICS = new Set<AlertMetric>(ALERT_METRIC_OPTIONS.map((m) => m.id));

export function normalizeAlertMetric(metric: unknown): AlertMetric {
  return typeof metric === "string" && VALID_METRICS.has(metric as AlertMetric)
    ? (metric as AlertMetric)
    : "price";
}
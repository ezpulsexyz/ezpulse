import { useEffect, useState } from "react";
import { BLUE, Card } from "../../components";
import {
  fetchJupiterChart,
  fmtPrice,
  jupiterTokenUrl,
  type JupiterChartInterval,
  type JupiterCandle,
} from "../../kickstart";

const CHART_W = 900;
const CHART_H = 300;
const PAD_L = 82;
const PAD_R = 20;
const PAD_T = 16;
const PAD_B = 28;

const RANGES = [
  { id: "24h", label: "24H", interval: "15_MINUTE" as JupiterChartInterval, candles: 96 },
  { id: "7d", label: "7D", interval: "1_HOUR" as JupiterChartInterval, candles: 168 },
  { id: "30d", label: "30D", interval: "1_DAY" as JupiterChartInterval, candles: 30 },
] as const;

type RangeId = (typeof RANGES)[number]["id"];

function RangeToggle({ range, onChange }: { range: RangeId; onChange: (id: RangeId) => void }) {
  return (
    <div className="term-chart-range">
      {RANGES.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onChange(r.id)}
          className={`term-filter-pill ${range === r.id ? "term-filter-pill--active" : ""}`}
          style={range === r.id ? { background: BLUE } : undefined}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

/** Live price chart from Jupiter datapi — matches jup.ag token pages. */
export function JupiterChart({ ca, symbol }: { ca: string; symbol: string }) {
  const [range, setRange] = useState<RangeId>("7d");
  const [candles, setCandles] = useState<JupiterCandle[] | null | "loading">("loading");

  useEffect(() => {
    let alive = true;
    const preset = RANGES.find((r) => r.id === range) ?? RANGES[1];
    setCandles("loading");
    fetchJupiterChart(ca, preset.interval, preset.candles).then((rows) => {
      if (alive) setCandles(rows);
    });
    return () => {
      alive = false;
    };
  }, [ca, range]);

  const rangeButtons = <RangeToggle range={range} onChange={setRange} />;
  const jupLink = (
    <a
      href={jupiterTokenUrl(ca)}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 transition hover:text-indigo-700"
    >
      jup.ag ↗
    </a>
  );

  if (candles === "loading") {
    return (
      <Card title={`Live chart · Jupiter · $${symbol}`} right={rangeButtons}>
        <div className="jup-chart">
          <div className="term-history-chart__loading">
            <div className="term-shimmer h-48 w-4/5 rounded" />
          </div>
        </div>
      </Card>
    );
  }

  if (!candles || candles.length < 2) {
    return (
      <Card title={`Live chart · Jupiter · $${symbol}`} right={rangeButtons}>
        <div className="jup-chart px-6 py-12 text-center text-[13px]" style={{ color: "var(--term-text-muted)" }}>
          Chart data not available yet for this token on Jupiter.
          <div className="mt-3">{jupLink}</div>
        </div>
      </Card>
    );
  }

  const plotW = CHART_W - PAD_L - PAD_R;
  const plotH = CHART_H - PAD_T - PAD_B;
  const prices = candles.map((c) => c.close);
  const rawMin = Math.min(...prices);
  const rawMax = Math.max(...prices);
  const pad = (rawMax - rawMin) * 0.08 || rawMin * 0.05 || 0.000001;
  const minP = rawMin - pad;
  const maxP = rawMax + pad;
  const priceRange = maxP - minP || 1;

  const first = candles[0];
  const last = candles[candles.length - 1];
  const change = first.close > 0 ? ((last.close - first.close) / first.close) * 100 : 0;

  const toX = (i: number) => PAD_L + (i / (candles.length - 1)) * plotW;
  const toY = (price: number) => PAD_T + plotH - ((price - minP) / priceRange) * plotH;

  const svgPoints = candles.map((c, i) => ({
    x: toX(i),
    y: toY(c.close),
    price: c.close,
    time: c.time * 1000,
  }));

  const pathD = svgPoints.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ");
  const areaD = `${pathD} L${PAD_L + plotW},${PAD_T + plotH} L${PAD_L},${PAD_T + plotH} Z`;
  const plotBottom = PAD_T + plotH;

  const isUp = last.close >= first.close;
  const lineColor = isUp ? "#10b981" : "#ef4444";
  const lastPt = svgPoints[svgPoints.length - 1];
  const yTicks = [0, 0.33, 0.66, 1].map((ratio) => minP + priceRange * (1 - ratio));
  const gradId = `jupGrad-${ca.slice(0, 8)}`;
  const rangeLabel = RANGES.find((r) => r.id === range)?.label ?? range;

  return (
    <Card title={`Live chart · Jupiter · $${symbol}`} right={rangeButtons}>
      <div className="jup-chart">
        <div className="term-history-chart">
          <div className="term-history-chart__summary">
            <div>
              <span className="term-history-chart__label">Latest price</span>
              <div className="term-history-chart__price">{fmtPrice(last.close)}</div>
            </div>
            <div className={`text-right ${isUp ? "text-emerald-600" : "text-red-500"}`}>
              <div className="text-lg font-semibold sm:text-xl">
                {isUp ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
              </div>
              <div className="text-[11px]" style={{ color: "var(--term-text-muted)" }}>
                over {rangeLabel}
              </div>
            </div>
          </div>

          <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="term-history-chart__svg" role="img" aria-label={`${symbol} Jupiter price chart`}>
            <defs>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
                <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
              </linearGradient>
            </defs>

            {yTicks.map((price, i) => {
              const y = toY(price);
              return (
                <g key={i}>
                  <line x1={PAD_L} y1={y} x2={PAD_L + plotW} y2={y} strokeWidth="1" style={{ stroke: "var(--term-border-subtle)" }} />
                  <text
                    x={PAD_L - 8}
                    y={y + 4}
                    className="text-[10px] font-mono"
                    textAnchor="end"
                    fill="var(--term-text-subtle)"
                    style={{ fontFamily: "JetBrains Mono, ui-monospace, monospace" }}
                  >
                    {fmtPrice(price)}
                  </text>
                </g>
              );
            })}

            <path d={areaD} fill={`url(#${gradId})`} />
            <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={lastPt.x} cy={lastPt.y} r="5" fill="var(--term-surface)" stroke={lineColor} strokeWidth="2.5" />
            <line x1={PAD_L} y1={plotBottom} x2={PAD_L + plotW} y2={plotBottom} strokeWidth="1" style={{ stroke: "var(--term-border-subtle)" }} />
          </svg>

          <div className="term-history-chart__axis">
            <div>{new Date(first.time * 1000).toLocaleDateString([], { month: "short", day: "numeric" })}</div>
            <div>{candles.length} candles · {jupLink}</div>
            <div>{new Date(last.time * 1000).toLocaleDateString([], { month: "short", day: "numeric" })}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
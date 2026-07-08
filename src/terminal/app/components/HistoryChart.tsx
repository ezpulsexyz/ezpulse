import { useEffect, useState } from "react";
import { BLUE, Card } from "../../components";
import { fetchPriceHistory, type PricePoint } from "../../backend";
import { fmtPrice } from "../../kickstart";

const CHART_W = 900;
const CHART_H = 260;
const PAD_L = 82;
const PAD_R = 20;
const PAD_T = 16;
const PAD_B = 12;

function RangeToggle({ range, onChange }: { range: 24 | 168; onChange: (h: 24 | 168) => void }) {
  return (
    <div className="term-chart-range">
      {([24, 168] as const).map((h) => (
        <button
          key={h}
          type="button"
          onClick={() => onChange(h)}
          className={`term-filter-pill ${range === h ? "term-filter-pill--active" : ""}`}
          style={range === h ? { background: BLUE } : undefined}
        >
          {h === 24 ? "24H" : "7D"}
        </button>
      ))}
    </div>
  );
}

/** ezpulse-recorded price history chart with improved visuals */
export function HistoryChart({ ca }: { ca: string }) {
  const [range, setRange] = useState<24 | 168>(168);
  const [points, setPoints] = useState<PricePoint[] | null | "loading">("loading");

  useEffect(() => {
    let alive = true;
    setPoints("loading");
    fetchPriceHistory(ca, range).then((p) => {
      if (alive) setPoints(p);
    });
    return () => {
      alive = false;
    };
  }, [ca, range]);

  const rangeLabel = range === 24 ? "24h" : "7d";
  const gradId = `chartGrad-${ca.slice(0, 8)}`;
  const rangeButtons = <RangeToggle range={range} onChange={setRange} />;

  if (points === "loading") {
    return (
      <Card title="Price history · recorded by ezpulse" right={rangeButtons}>
        <div className="term-history-chart__loading">
          <div className="term-shimmer h-36 w-4/5 rounded" />
        </div>
      </Card>
    );
  }

  if (!points || points.length < 2) {
    return (
      <Card title="Price history · recorded by ezpulse" right={rangeButtons}>
        <div className="px-6 py-12 text-center text-[13px]" style={{ color: "var(--term-text-muted)" }}>
          Not enough snapshots yet. Data appears after a few 15-min intervals.
        </div>
      </Card>
    );
  }

  const plotW = CHART_W - PAD_L - PAD_R;
  const plotH = CHART_H - PAD_T - PAD_B;

  const rawMin = Math.min(...points.map((p) => p.price));
  const rawMax = Math.max(...points.map((p) => p.price));
  const pad = (rawMax - rawMin) * 0.08 || rawMin * 0.05 || 0.000001;
  const minP = rawMin - pad;
  const maxP = rawMax + pad;
  const priceRange = maxP - minP || 1;

  const first = points[0];
  const last = points[points.length - 1];
  const change = ((last.price - first.price) / first.price) * 100;

  const toX = (i: number) => PAD_L + (i / (points.length - 1)) * plotW;
  const toY = (price: number) => PAD_T + plotH - ((price - minP) / priceRange) * plotH;

  const svgPoints = points.map((p, i) => ({
    x: toX(i),
    y: toY(p.price),
    price: p.price,
    ts: p.ts,
  }));

  const pathD = svgPoints.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ");
  const areaD = `${pathD} L${PAD_L + plotW},${PAD_T + plotH} L${PAD_L},${PAD_T + plotH} Z`;
  const plotBottom = PAD_T + plotH;

  const isUp = last.price >= first.price;
  const lineColor = isUp ? "#10b981" : "#ef4444";
  const lastPt = svgPoints[svgPoints.length - 1];
  const yTicks = [0, 0.33, 0.66, 1].map((ratio) => minP + priceRange * (1 - ratio));

  return (
    <Card title="Price history · ezpulse snapshots" right={rangeButtons}>
      <div className="term-history-chart">
        <div className="term-history-chart__summary">
          <div>
            <span className="term-history-chart__label">Latest price</span>
            <div className="term-history-chart__price">{fmtPrice(last.price)}</div>
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

        <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="term-history-chart__svg" role="img" aria-label="Price history chart">
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
                <line
                  x1={PAD_L}
                  y1={y}
                  x2={PAD_L + plotW}
                  y2={y}
                  strokeWidth="1"
                  style={{ stroke: "var(--term-border-subtle)" }}
                />
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
          <line
            x1={PAD_L}
            y1={plotBottom}
            x2={PAD_L + plotW}
            y2={plotBottom}
            strokeWidth="1"
            style={{ stroke: "var(--term-border-subtle)" }}
          />
        </svg>

        <div className="term-history-chart__axis">
          <div>{new Date(first.ts).toLocaleDateString([], { month: "short", day: "numeric" })}</div>
          <div>{points.length} snapshots</div>
          <div>{new Date(last.ts).toLocaleDateString([], { month: "short", day: "numeric" })}</div>
        </div>
      </div>
    </Card>
  );
}
import { useEffect, useState } from "react";
import { BLUE, Card } from "../../components";
import { fetchPriceHistory, type PricePoint } from "../../backend";

/** ezpulse-recorded price history chart with improved visuals */
export function HistoryChart({ ca }: { ca: string }) {
  const [range, setRange] = useState<24 | 168>(168);
  const [points, setPoints] = useState<PricePoint[] | null | "loading">("loading");

  useEffect(() => {
    let alive = true;
    setPoints("loading");
    fetchPriceHistory(ca, range).then((p) => { if (alive) setPoints(p); });
    return () => { alive = false; };
  }, [ca, range]);

  const rangeLabel = range === 24 ? "24h" : "7d";
  const gradId = `chartGrad-${ca.slice(0, 8)}`;

  const rangeButtons = (
    <div className="flex gap-1 text-xs">
      {([24, 168] as const).map((h) => (
        <button
          key={h}
          type="button"
          onClick={() => setRange(h)}
          className={`rounded-full px-3 py-1 font-mono transition ${range === h ? "text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"}`}
          style={range === h ? { background: BLUE } : undefined}
        >
          {h === 24 ? "24H" : "7D"}
        </button>
      ))}
    </div>
  );

  if (points === "loading") {
    return (
      <Card title="Price history · recorded by ezpulse" right={rangeButtons}>
        <div className="flex h-[240px] items-center justify-center rounded-xl bg-zinc-50">
          <div className="term-shimmer h-36 w-4/5 rounded" />
        </div>
      </Card>
    );
  }

  if (!points || points.length < 2) {
    return (
      <Card title="Price history · recorded by ezpulse" right={rangeButtons}>
        <div className="px-6 py-12 text-center text-sm text-zinc-500">
          Not enough snapshots yet. Data appears after a few 15-min intervals.
        </div>
      </Card>
    );
  }

  const W = 860;
  const H = 240;
  const minP = Math.min(...points.map((p) => p.price));
  const maxP = Math.max(...points.map((p) => p.price));
  const priceRange = maxP - minP || 1;

  const first = points[0];
  const last = points[points.length - 1];
  const change = ((last.price - first.price) / first.price) * 100;

  const svgPoints = points.map((p, i) => {
    const x = (i / (points.length - 1)) * W;
    const y = H - ((p.price - minP) / priceRange) * (H - 50);
    return { x: Math.round(x), y: Math.round(y), price: p.price, ts: p.ts };
  });

  const pathD = svgPoints.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x},${pt.y}`).join(" ");

  const isUp = last.price >= first.price;
  const lineColor = isUp ? "#10b981" : "#ef4444";
  const lastPt = svgPoints[svgPoints.length - 1];

  return (
    <Card title="Price history · ezpulse snapshots" right={rangeButtons}>
      <div className="px-4 pb-4 pt-2">
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <span className="text-sm text-zinc-500">Latest price</span>
            <div className="font-mono text-2xl font-semibold tabular-nums text-zinc-900">
              ${last.price.toFixed(6)}
            </div>
          </div>
          <div className={`text-right ${isUp ? "text-emerald-600" : "text-red-500"}`}>
            <div className="text-xl font-semibold">
              {isUp ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
            </div>
            <div className="text-xs text-zinc-500">over {rangeLabel}</div>
          </div>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" role="img" aria-label="Price history chart">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0.15, 0.4, 0.65, 0.9].map((ratio, i) => {
            const y = H * ratio;
            const price = maxP - (maxP - minP) * ratio;
            return (
              <g key={i}>
                <line x1="40" y1={y} x2={W} y2={y} stroke="#f4f4f5" strokeWidth="1" />
                <text
                  x="28"
                  y={y + 4}
                  className="fill-zinc-400 text-[10px] font-mono"
                  textAnchor="end"
                  style={{ fontFamily: "JetBrains Mono, ui-monospace, monospace" }}
                >
                  ${price.toFixed(6)}
                </text>
              </g>
            );
          })}

          <path d={`${pathD} L${W},${H} L0,${H} Z`} fill={`url(#${gradId})`} />
          <path d={pathD} fill="none" stroke={lineColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <circle
            cx={lastPt.x}
            cy={lastPt.y}
            r="6"
            fill="#fff"
            stroke={lineColor}
            strokeWidth="3"
          />
        </svg>

        <div className="mt-2 flex justify-between font-mono text-xs text-zinc-400">
          <div>{new Date(first.ts).toLocaleDateString([], { month: "short", day: "numeric" })}</div>
          <div>{points.length} snapshots</div>
          <div>{new Date(last.ts).toLocaleDateString([], { month: "short", day: "numeric" })}</div>
        </div>
      </div>
    </Card>
  );
}
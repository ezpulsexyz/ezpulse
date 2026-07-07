import { useEffect, useState } from "react";
import { BLUE, Card } from "../../components";
import { fetchPriceHistory, backendReady, type PricePoint } from "../../backend";

export function HistoryChart({ ca }: { ca: string }) {
  const [range, setRange] = useState<24 | 168>(168);
  const [points, setPoints] = useState<PricePoint[] | null | "loading">("loading");
  useEffect(() => {
    let alive = true;
    setPoints("loading");
    fetchPriceHistory(ca, range).then((p) => { if (alive) setPoints(p); });
    return () => { alive = false; };
  }, [ca, range]);

  return (
    <Card title="Price history · recorded by ezpulse" right={
      <span className="flex gap-1">
        {([[24, "24h"], [168, "7d"]] as [24 | 168, string][]).map(([h, label]) => (
          <button key={h} onClick={() => setRange(h)}
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition ${range === h ? "text-white" : "bg-zinc-100 text-zinc-500 hover:text-zinc-800"}`}
            style={range === h ? { background: BLUE } : undefined}>
            {label}
          </button>
        ))}
      </span>
    }>
      {points === "loading" && <div className="px-5 py-8 text-center text-[12px] text-zinc-400">Loading history…</div>}
      {points === null && (
        <div className="px-5 py-6 text-center">
          <p className="text-[12.5px] text-zinc-500">
            {backendReady
              ? "History recording has just begun — the chart appears after a few snapshots (every 15 min)."
              : "ezpulse records its own price history every 15 minutes — charts appear once the backend is connected."}
          </p>
          <p className="mt-1 text-[10px] text-zinc-400">Proprietary snapshots — this data exists nowhere else for Kickstart micro-caps.</p>
        </div>
      )}
      {Array.isArray(points) && (() => {
        const W = 800, H = 180;
        const min = Math.min(...points.map((p) => p.price));
        const max = Math.max(...points.map((p) => p.price));
        const rng = max - min || 1;
        const t0 = points[0].ts, t1 = points[points.length - 1].ts, tr = t1 - t0 || 1;
        const pts = points.map((p) => [((p.ts - t0) / tr) * W, H - ((p.price - min) / rng) * (H - 30) - 15]);
        const path = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
        const up = points[points.length - 1].price >= points[0].price;
        const col = up ? "#10b981" : "#ef4444";
        const chg = ((points[points.length - 1].price - points[0].price) / points[0].price) * 100;
        return (
          <div className="px-3 py-3">
            <div className="flex items-baseline justify-between px-2">
              <span className="text-[12px] text-zinc-400">{points.length} snapshots · every 15 min</span>
              <span className={`text-[13px] font-bold tabular-nums ${up ? "text-emerald-600" : "text-red-500"}`}>{chg >= 0 ? "+" : ""}{chg.toFixed(1)}% over {range === 24 ? "24h" : "7d"}</span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full">
              <defs>
                <linearGradient id={`hg-${ca.slice(0, 6)}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={col} stopOpacity=".15" />
                  <stop offset="100%" stopColor={col} stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="#f1f1f4" />)}
              <path d={`${path} L${W},${H} L0,${H} Z`} fill={`url(#hg-${ca.slice(0, 6)})`} />
              <path d={path} fill="none" stroke={col} strokeWidth="2" />
              <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="4" fill={col} stroke="#fff" strokeWidth="2" />
            </svg>
          </div>
        );
      })()}
    </Card>
  );
}

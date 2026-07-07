import { useEffect, useState } from "react";
import { BLUE, Card, Num } from "../../components";
import { fmtPrice } from "../../kickstart";
import { fetchPriceHistory, backendReady, type PricePoint } from "../../backend";

function fmtAxisPrice(p: number): string {
  if (p >= 1) return `$${p.toFixed(2)}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  return `$${p.toExponential(2)}`;
}

function fmtAxisTime(ts: number, range: 24 | 168): string {
  const d = new Date(ts);
  if (range === 24) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

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
            className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-bold transition ${range === h ? "text-white" : "bg-zinc-100 text-zinc-500 hover:text-zinc-800"}`}
            style={range === h ? { background: BLUE } : undefined}>
            {label}
          </button>
        ))}
      </span>
    }>
      {points === "loading" && (
        <div className="space-y-3 px-5 py-6">
          <div className="term-shimmer h-3 w-32 rounded" />
          <div className="term-shimmer h-40 w-full rounded-xl" />
        </div>
      )}
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
      {Array.isArray(points) && points.length >= 2 && (() => {
        const W = 800;
        const H = 200;
        const PAD_L = 56;
        const PAD_R = 12;
        const PAD_T = 14;
        const PAD_B = 28;
        const plotW = W - PAD_L - PAD_R;
        const plotH = H - PAD_T - PAD_B;

        const prices = points.map((p) => p.price);
        const rawMin = Math.min(...prices);
        const rawMax = Math.max(...prices);
        const pad = (rawMax - rawMin) * 0.08 || rawMin * 0.05 || 0.0001;
        const min = rawMin - pad;
        const max = rawMax + pad;
        const rng = max - min || 1;

        const t0 = points[0].ts;
        const t1 = points[points.length - 1].ts;
        const tr = t1 - t0 || 1;

        const toX = (ts: number) => PAD_L + ((ts - t0) / tr) * plotW;
        const toY = (price: number) => PAD_T + plotH - ((price - min) / rng) * plotH;

        const pts = points.map((p) => [toX(p.ts), toY(p.price)]);
        const path = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
        const area = `${path} L${toX(t1)},${PAD_T + plotH} L${PAD_L},${PAD_T + plotH} Z`;

        const up = points[points.length - 1].price >= points[0].price;
        const col = up ? "#10b981" : "#ef4444";
        const chg = ((points[points.length - 1].price - points[0].price) / points[0].price) * 100;
        const last = points[points.length - 1];

        const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => min + rng * f);
        const xLabels = [0, 0.5, 1].map((f) => ({ ts: t0 + tr * f, x: PAD_L + plotW * f }));

        return (
          <div className="px-3 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-2">
              <span className="font-mono text-[11px] text-zinc-400">{points.length} snapshots · 15 min</span>
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[10px] text-zinc-400">now</span>
                <Num bold className={up ? "text-emerald-600" : "text-red-500"}>{fmtPrice(last.price)}</Num>
                <Num bold className={up ? "text-emerald-600" : "text-red-500"}>
                  {chg >= 0 ? "+" : ""}{chg.toFixed(1)}%
                </Num>
              </div>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" aria-label="Price history chart">
              <defs>
                <linearGradient id={`hg-${ca.slice(0, 6)}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={col} stopOpacity=".18" />
                  <stop offset="100%" stopColor={col} stopOpacity="0" />
                </linearGradient>
              </defs>
              {yTicks.map((price, i) => {
                const y = toY(price);
                return (
                  <g key={i}>
                    <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="#f1f1f4" strokeDasharray={i === 0 || i === 4 ? "0" : "4 4"} />
                    <text x={PAD_L - 6} y={y + 3} textAnchor="end" className="fill-zinc-400" style={{ fontSize: 9, fontFamily: "JetBrains Mono, ui-monospace, monospace" }}>
                      {fmtAxisPrice(price)}
                    </text>
                  </g>
                );
              })}
              <path d={area} fill={`url(#hg-${ca.slice(0, 6)})`} />
              <path d={path} fill="none" stroke={col} strokeWidth="2" strokeLinejoin="round" />
              <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="4" fill={col} stroke="#fff" strokeWidth="2" />
              {xLabels.map(({ ts, x }, i) => (
                <text key={i} x={x} y={H - 6} textAnchor="middle" className="fill-zinc-400" style={{ fontSize: 9, fontFamily: "JetBrains Mono, ui-monospace, monospace" }}>
                  {fmtAxisTime(ts, range)}
                </text>
              ))}
            </svg>
          </div>
        );
      })()}
    </Card>
  );
}
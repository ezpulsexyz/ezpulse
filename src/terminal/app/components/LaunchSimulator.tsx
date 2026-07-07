import { useEffect, useState } from "react";
import { fetchPriceHistory } from "../../backend";
import { fmtUsd } from "../../data";
import { BLUE, Card } from "../../components";
import { simulateLaunchBuy, type LaunchSimResult } from "../../simulator";
import type { LiveLaunch } from "../../kickstart";

const PRESETS = [10, 50, 100, 500];

export function LaunchSimulator({ coins }: { coins: LiveLaunch[] }) {
  const [selectedCa, setSelectedCa] = useState(coins[0]?.ca ?? "");
  const [investUsd, setInvestUsd] = useState(100);
  const [result, setResult] = useState<LaunchSimResult | null | "loading">(null);

  const coin = coins.find((c) => c.ca === selectedCa) ?? coins[0];

  useEffect(() => {
    if (!coin) return;
    let alive = true;
    setResult("loading");
    fetchPriceHistory(coin.ca, 720).then((history) => {
      if (!alive) return;
      setResult(simulateLaunchBuy(coin, history, investUsd));
    });
    return () => { alive = false; };
  }, [coin?.ca, investUsd]);

  if (!coins.length) return null;

  const W = 600;
  const H = 120;
  const chart = result && result !== "loading" ? result.chart : [];
  const values = chart.map((p) => p.portfolioValue);
  const minV = values.length ? Math.min(...values) : 0;
  const maxV = values.length ? Math.max(...values) : 1;
  const rng = maxV - minV || 1;
  const t0 = chart[0]?.ts ?? 0;
  const t1 = chart[chart.length - 1]?.ts ?? 1;
  const tr = t1 - t0 || 1;
  const path = chart.map((p, i) => {
    const x = ((p.ts - t0) / tr) * W;
    const y = H - ((p.portfolioValue - minV) / rng) * (H - 20) - 10;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const up = result && result !== "loading" ? result.currentValue >= result.investUsd : true;

  return (
    <Card
      className="mt-4"
      title="⏳ Portfolio simulator · what if I bought at launch?"
      right={<span className="text-[10px] text-zinc-400">uses ezpulse price snapshots</span>}
    >
      <div className="space-y-4 px-5 py-4">
        <div className="flex flex-wrap gap-3">
          <select
            value={selectedCa}
            onChange={(e) => setSelectedCa(e.target.value)}
            className="min-w-0 flex-1 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-[12px] font-semibold outline-none focus:border-indigo-300"
          >
            {coins.map((c) => (
              <option key={c.ca} value={c.ca}>{c.name} (${c.symbol})</option>
            ))}
          </select>
          <div className="flex gap-1">
            {PRESETS.map((p) => (
              <button key={p} onClick={() => setInvestUsd(p)}
                className={`rounded-full px-3 py-2 text-[11px] font-bold transition ${investUsd === p ? "text-white" : "bg-zinc-100 text-zinc-500"}`}
                style={investUsd === p ? { background: BLUE } : undefined}>
                ${p}
              </button>
            ))}
          </div>
        </div>

        {result === "loading" && (
          <div className="py-8 text-center text-[12px] text-zinc-400">Loading launch history…</div>
        )}

        {result && result !== "loading" && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Invested at launch</div>
                <div className="mt-0.5 text-xl font-bold tabular-nums text-zinc-900">${result.investUsd}</div>
                <div className="text-[10px] text-zinc-400">{result.ageDays}d ago · {result.source}</div>
              </div>
              <div className="rounded-xl px-4 py-3 text-white" style={{ background: `linear-gradient(135deg, ${BLUE}, #4f2ff0)` }}>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-white/60">Value today</div>
                <div className="mt-0.5 text-xl font-bold tabular-nums">{fmtUsd(result.currentValue)}</div>
                <div className="text-[10px] text-white/70">{result.multiple}x multiple</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Peak value</div>
                <div className="mt-0.5 text-xl font-bold tabular-nums text-emerald-600">{fmtUsd(result.peakValue)}</div>
                <div className="text-[10px] text-zinc-400">{result.peakMultiple}x at peak</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">From peak</div>
                <div className={`mt-0.5 text-xl font-bold tabular-nums ${result.drawdownFromPeakPct > 30 ? "text-red-500" : "text-zinc-700"}`}>
                  -{result.drawdownFromPeakPct}%
                </div>
                <div className="text-[10px] text-zinc-400">drawdown</div>
              </div>
            </div>

            {chart.length > 1 && (
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3">
                <div className="mb-1 flex justify-between text-[10px] text-zinc-400">
                  <span>Portfolio value over time</span>
                  <span className={up ? "text-emerald-600" : "text-red-500"}>{up ? "▲" : "▼"} vs cost basis</span>
                </div>
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
                  <path d={`${path} L${W},${H} L0,${H} Z`} fill={up ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)"} />
                  <path d={path} fill="none" stroke={up ? "#10b981" : "#ef4444"} strokeWidth="2" />
                  <line x1="0" x2={W} y1={H - ((result.investUsd - minV) / rng) * (H - 20) - 10} y2={H - ((result.investUsd - minV) / rng) * (H - 20) - 10} stroke="#a1a1aa" strokeDasharray="4 4" strokeWidth="1" />
                </svg>
              </div>
            )}

            <p className="text-[11px] leading-relaxed text-zinc-500">
              Simulates buying <strong>${investUsd}</strong> of <strong>${coin.symbol}</strong> at the first recorded price
              ({result.launchPrice < 0.01 ? result.launchPrice.toExponential(2) : `$${result.launchPrice.toFixed(6)}`})
              and holding to today ({fmtUsd(result.currentPrice)}). Not financial advice — past launches ≠ future returns.
            </p>
          </>
        )}
      </div>
    </Card>
  );
}
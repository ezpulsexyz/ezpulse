import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchPriceHistory } from "../../backend";
import { fmtUsd } from "../../data";
import { BLUE, Card, Delta, Num } from "../../components";
import {
  rankSimulations,
  simulatePortfolio,
  type LaunchSimResult,
  type SimCompareRow,
  type SimEntryMode,
} from "../../simulator";
import type { LiveLaunch } from "../../kickstart";

const PRESETS = [10, 50, 100, 250, 500];
const MAX_INVEST = 10_000;

function fmtAxisUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `$${(n / 1000).toFixed(0)}k`;
  if (n >= 100) return `$${n.toFixed(0)}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(2)}`;
}

function fmtAxisDate(ts: number): string {
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
}

function SimulatorChart({ result }: { result: LaunchSimResult }) {
  const chart = result.chart;
  if (chart.length < 2) return null;

  const W = 800;
  const H = 200;
  const PAD_L = 56;
  const PAD_R = 12;
  const PAD_T = 14;
  const PAD_B = 28;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const values = chart.map((p) => p.portfolioValue);
  const rawMin = Math.min(...values, result.investUsd);
  const rawMax = Math.max(...values, result.investUsd);
  const pad = (rawMax - rawMin) * 0.08 || result.investUsd * 0.1 || 1;
  const min = rawMin - pad;
  const max = rawMax + pad;
  const rng = max - min || 1;

  const t0 = chart[0].ts;
  const t1 = chart[chart.length - 1].ts;
  const tr = t1 - t0 || 1;

  const toX = (ts: number) => PAD_L + ((ts - t0) / tr) * plotW;
  const toY = (v: number) => PAD_T + plotH - ((v - min) / rng) * plotH;

  const pts = chart.map((p) => [toX(p.ts), toY(p.portfolioValue)] as const);
  const path = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${path} L${toX(t1)},${PAD_T + plotH} L${PAD_L},${PAD_T + plotH} Z`;

  const up = result.currentValue >= result.investUsd;
  const col = up ? "#10b981" : "#ef4444";
  const basisY = toY(result.investUsd);

  let peakIdx = 0;
  let peakVal = values[0];
  let troughIdx = 0;
  let troughVal = values[0];
  for (let i = 1; i < values.length; i++) {
    if (values[i] > peakVal) { peakVal = values[i]; peakIdx = i; }
    if (values[i] < troughVal) { troughVal = values[i]; troughIdx = i; }
  }

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => min + rng * f);
  const xLabels = [0, 0.5, 1].map((f) => ({ ts: t0 + tr * f, x: PAD_L + plotW * f }));

  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3">
      <div className="mb-1 flex flex-wrap justify-between gap-2 px-1 text-[10px] text-zinc-400">
        <span>Portfolio value · {result.entryLabel}</span>
        <span className={up ? "text-emerald-600" : "text-red-500"}>
          {up ? "▲" : "▼"} {result.roiPct >= 0 ? "+" : ""}{result.roiPct}% vs cost basis
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Portfolio simulation chart">
        <defs>
          <linearGradient id="sim-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={col} stopOpacity=".18" />
            <stop offset="100%" stopColor={col} stopOpacity="0" />
          </linearGradient>
        </defs>
        {yTicks.map((v, i) => {
          const y = toY(v);
          return (
            <g key={i}>
              <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="#f1f1f4" strokeDasharray={i === 0 || i === 4 ? "0" : "4 4"} />
              <text x={PAD_L - 6} y={y + 3} textAnchor="end" className="fill-zinc-400" style={{ fontSize: 9, fontFamily: "JetBrains Mono, ui-monospace, monospace" }}>
                {fmtAxisUsd(v)}
              </text>
            </g>
          );
        })}
        <path d={area} fill="url(#sim-area)" />
        <path d={path} fill="none" stroke={col} strokeWidth="2" strokeLinejoin="round" />
        <line x1={PAD_L} x2={W - PAD_R} y1={basisY} y2={basisY} stroke="#a1a1aa" strokeDasharray="5 4" strokeWidth="1" />
        <circle cx={pts[peakIdx][0]} cy={pts[peakIdx][1]} r="3.5" fill="#10b981" stroke="#fff" strokeWidth="1.5" />
        <circle cx={pts[troughIdx][0]} cy={pts[troughIdx][1]} r="3.5" fill="#ef4444" stroke="#fff" strokeWidth="1.5" />
        <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="4" fill={col} stroke="#fff" strokeWidth="2" />
        {xLabels.map(({ ts, x }, i) => (
          <text key={i} x={x} y={H - 6} textAnchor="middle" className="fill-zinc-400" style={{ fontSize: 9, fontFamily: "JetBrains Mono, ui-monospace, monospace" }}>
            {fmtAxisDate(ts)}
          </text>
        ))}
      </svg>
      <div className="mt-1 flex flex-wrap gap-3 px-1 text-[9px] text-zinc-400">
        <span><span className="inline-block h-2 w-2 rounded-full bg-emerald-500 align-middle" /> peak</span>
        <span><span className="inline-block h-2 w-2 rounded-full bg-red-500 align-middle" /> trough</span>
        <span className="border-l border-zinc-200 pl-3">— cost basis</span>
      </div>
    </div>
  );
}

export interface HoldingHint {
  ca: string;
  valueUsd: number;
}

export function LaunchSimulator({
  coins,
  defaultCa,
  holdingHints,
}: {
  coins: LiveLaunch[];
  defaultCa?: string;
  holdingHints?: HoldingHint[];
}) {
  const [selectedCa, setSelectedCa] = useState(defaultCa ?? coins[0]?.ca ?? "");
  const [investUsd, setInvestUsd] = useState(100);
  const [entryMode, setEntryMode] = useState<SimEntryMode>("launch");
  const [daysAgo, setDaysAgo] = useState(7);
  const [compareOpen, setCompareOpen] = useState(false);
  const [result, setResult] = useState<LaunchSimResult | null | "loading">(null);
  const [compare, setCompare] = useState<SimCompareRow[] | "loading" | null>(null);

  const coin = coins.find((c) => c.ca === selectedCa) ?? coins[0];
  const hint = holdingHints?.find((h) => h.ca === coin?.ca);

  const simOptions = useMemo(
    () => ({ investUsd, entryMode, daysAgo }),
    [investUsd, entryMode, daysAgo],
  );

  useEffect(() => {
    if (defaultCa && coins.some((c) => c.ca === defaultCa)) setSelectedCa(defaultCa);
  }, [defaultCa, coins]);

  useEffect(() => {
    if (!coin) return;
    let alive = true;
    setResult("loading");
    fetchPriceHistory(coin.ca, 720).then((history) => {
      if (!alive) return;
      setResult(simulatePortfolio(coin, history, simOptions));
    });
    return () => { alive = false; };
  }, [coin?.ca, simOptions]);

  const runCompare = useCallback(async () => {
    setCompare("loading");
    const rows = await Promise.all(
      coins.map(async (c) => ({ coin: c, history: await fetchPriceHistory(c.ca, 720) })),
    );
    setCompare(rankSimulations(rows, simOptions));
  }, [coins, simOptions]);

  useEffect(() => {
    if (!compareOpen) {
      setCompare(null);
      return;
    }
    runCompare();
  }, [compareOpen, runCompare]);

  if (!coins.length) return null;

  const maxDays = result && result !== "loading" ? Math.max(1, result.ageDays) : 30;

  return (
    <Card
      className="mt-4"
      title="⏳ Portfolio simulator"
      right={
        <span className="text-[10px] text-zinc-400">
          what-if buys · ezpulse snapshots
        </span>
      }
    >
      <div className="space-y-4 px-5 py-4">
        <div className="flex flex-wrap gap-2">
          {(["launch", "days_ago"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setEntryMode(m)}
              className={`rounded-full px-3.5 py-1.5 text-[11px] font-bold transition ${entryMode === m ? "text-white" : "bg-zinc-100 text-zinc-500 hover:text-zinc-800"}`}
              style={entryMode === m ? { background: BLUE } : undefined}
            >
              {m === "launch" ? "At launch" : "Days ago"}
            </button>
          ))}
          {coins.length > 1 && (
            <button
              onClick={() => setCompareOpen((v) => !v)}
              className={`ml-auto rounded-full px-3.5 py-1.5 text-[11px] font-bold transition ${compareOpen ? "text-white" : "border border-zinc-200 text-zinc-500 hover:border-indigo-300 hover:text-indigo-700"}`}
              style={compareOpen ? { background: BLUE } : undefined}
            >
              Compare all
            </button>
          )}
        </div>

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
          {hint && hint.valueUsd >= 0.01 && (
            <button
              onClick={() => setInvestUsd(Math.min(MAX_INVEST, Math.round(hint.valueUsd)))}
              className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-2 text-[11px] font-bold text-indigo-700 transition hover:bg-indigo-100"
              title="Match your current holding value"
            >
              Match position · {fmtUsd(hint.valueUsd)}
            </button>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Invest</span>
            <div className="flex flex-wrap gap-1">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setInvestUsd(p)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${investUsd === p ? "text-white" : "bg-zinc-100 text-zinc-500"}`}
                  style={investUsd === p ? { background: BLUE } : undefined}
                >
                  ${p}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5">
              <span className="text-[11px] text-zinc-400">$</span>
              <input
                type="number"
                min={1}
                max={MAX_INVEST}
                value={investUsd}
                onChange={(e) => setInvestUsd(Math.min(MAX_INVEST, Math.max(1, Number(e.target.value) || 1)))}
                className="w-16 bg-transparent font-mono text-[12px] font-semibold tabular-nums outline-none"
              />
            </div>
          </div>
          <input
            type="range"
            min={1}
            max={MAX_INVEST}
            step={1}
            value={investUsd}
            onChange={(e) => setInvestUsd(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer accent-indigo-600"
          />
        </div>

        {entryMode === "days_ago" && (
          <div className="space-y-2 rounded-xl border border-zinc-100 bg-zinc-50/80 px-4 py-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-zinc-600">Entry point</span>
              <Num bold>{daysAgo}d ago</Num>
            </div>
            <input
              type="range"
              min={1}
              max={Math.min(365, maxDays)}
              value={Math.min(daysAgo, maxDays)}
              onChange={(e) => setDaysAgo(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer accent-indigo-600"
            />
            <p className="text-[10px] text-zinc-400">Snaps to nearest ezpulse price snapshot</p>
          </div>
        )}

        {compareOpen && (
          <div className="rounded-xl border border-zinc-200 bg-white">
            <div className="border-b border-zinc-100 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Leaderboard · same ${investUsd} buy · {entryMode === "launch" ? "at launch" : `${daysAgo}d ago`}
            </div>
            {compare === "loading" && (
              <div className="space-y-2 px-4 py-4">
                {[1, 2, 3].map((i) => <div key={i} className="term-shimmer h-8 rounded-lg" />)}
              </div>
            )}
            {Array.isArray(compare) && compare.length > 0 && (
              <div className="divide-y divide-zinc-50">
                {compare.slice(0, 8).map((row, i) => (
                  <button
                    key={row.coin.ca}
                    onClick={() => setSelectedCa(row.coin.ca)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-indigo-50/50 ${row.coin.ca === selectedCa ? "bg-indigo-50/80" : ""}`}
                  >
                    <span className="w-5 font-mono text-[11px] font-bold text-zinc-400">#{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-[12px] text-zinc-800">${row.coin.symbol}</span>
                    <Num className={row.result.roiPct >= 0 ? "text-emerald-600" : "text-red-500"} bold>
                      {row.result.roiPct >= 0 ? "+" : ""}{row.result.roiPct}%
                    </Num>
                    <Num className="text-zinc-500">{row.result.multiple}x</Num>
                  </button>
                ))}
              </div>
            )}
            {Array.isArray(compare) && compare.length === 0 && (
              <p className="px-4 py-4 text-center text-[12px] text-zinc-400">No comparable history yet</p>
            )}
          </div>
        )}

        {result === "loading" && (
          <div className="space-y-3 py-4">
            <div className="term-shimmer h-20 rounded-xl" />
            <div className="term-shimmer h-40 rounded-xl" />
          </div>
        )}

        {result && result !== "loading" && (
          <>
            {result.confidence === "low" && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[11px] text-amber-800">
                <strong>Low confidence</strong> — {result.source === "estimate"
                  ? "launch price estimated from 24h change; few snapshots on record"
                  : "thin snapshot history; entry may be approximate"}.
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-xl border border-zinc-200 bg-white px-3 py-3 sm:px-4">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Invested</div>
                <Num size="lg" bold className="mt-0.5 block text-zinc-900">${result.investUsd}</Num>
                <div className="text-[10px] text-zinc-400">{result.entryLabel} · {result.ageDays}d hold</div>
              </div>
              <div className="rounded-xl px-3 py-3 text-white sm:px-4" style={{ background: `linear-gradient(135deg, ${BLUE}, #4f2ff0)` }}>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-white/60">Value today</div>
                <Num size="lg" bold className="mt-0.5 block">{fmtUsd(result.currentValue)}</Num>
                <div className="text-[10px] text-white/70">{result.multiple}x</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white px-3 py-3 sm:px-4">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">P&amp;L</div>
                <Num size="lg" bold className={`mt-0.5 block ${result.pnlUsd >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {result.pnlUsd >= 0 ? "+" : ""}{fmtUsd(Math.abs(result.pnlUsd))}
                </Num>
                <div className="flex items-center gap-1 text-[10px]">
                  <Delta v={result.roiPct} suffix="%" />
                </div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white px-3 py-3 sm:px-4">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Peak</div>
                <Num size="lg" bold className="mt-0.5 block text-emerald-600">{fmtUsd(result.peakValue)}</Num>
                <div className="text-[10px] text-zinc-400">
                  {result.peakMultiple}x{result.daysToPeak != null ? ` · day ${result.daysToPeak}` : ""}
                </div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white px-3 py-3 sm:px-4">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Trough</div>
                <Num size="lg" bold className="mt-0.5 block text-red-500">{fmtUsd(result.troughValue)}</Num>
                <div className="text-[10px] text-zinc-400">{result.troughMultiple}x · +{result.drawdownFromTroughPct}% since</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white px-3 py-3 sm:px-4">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">From peak</div>
                <Num size="lg" bold className={`mt-0.5 block ${result.drawdownFromPeakPct > 30 ? "text-red-500" : "text-zinc-700"}`}>
                  -{result.drawdownFromPeakPct}%
                </Num>
                <div className="text-[10px] text-zinc-400">
                  {result.annualizedRoiPct != null ? `${result.annualizedRoiPct >= 0 ? "+" : ""}${result.annualizedRoiPct}% ann.` : "drawdown"}
                </div>
              </div>
            </div>

            <SimulatorChart result={result} />

            <p className="text-[11px] leading-relaxed text-zinc-500">
              Simulates buying <strong>${investUsd}</strong> of <strong>${coin.symbol}</strong> {result.entryLabel}
              ({result.entryPrice < 0.01 ? result.entryPrice.toExponential(2) : `$${result.entryPrice.toFixed(6)}`})
              → {fmtUsd(result.currentPrice)} today.
              {" "}You&apos;d hold <strong>{result.tokensBought >= 1_000_000 ? `${(result.tokensBought / 1_000_000).toFixed(2)}M` : result.tokensBought >= 1000 ? `${(result.tokensBought / 1000).toFixed(1)}K` : result.tokensBought.toFixed(0)}</strong> tokens.
              Not financial advice.
            </p>
          </>
        )}
      </div>
    </Card>
  );
}
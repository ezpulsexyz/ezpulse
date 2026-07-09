import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchPriceHistory, type PricePoint } from "../../backend";
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
    <div className="term-sim-chart">
      <div className="term-sim-chart__head">
        <span>Portfolio value · {result.entryLabel}</span>
        <span className={up ? "text-emerald-600" : "text-red-500"}>
          {up ? "▲" : "▼"} {result.roiPct >= 0 ? "+" : ""}{result.roiPct}% vs cost basis
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="term-sim-chart__svg w-full" role="img" aria-label="Portfolio simulation chart">
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
              <line
                x1={PAD_L}
                x2={W - PAD_R}
                y1={y}
                y2={y}
                className="term-sim-chart__grid"
                strokeDasharray={i === 0 || i === 4 ? "0" : "4 4"}
              />
              <text
                x={PAD_L - 6}
                y={y + 3}
                textAnchor="end"
                className="term-sim-chart__axis"
                style={{ fontSize: 9, fontFamily: "JetBrains Mono, ui-monospace, monospace" }}
              >
                {fmtAxisUsd(v)}
              </text>
            </g>
          );
        })}
        <path d={area} fill="url(#sim-area)" />
        <path d={path} fill="none" stroke={col} strokeWidth="2" strokeLinejoin="round" />
        <line x1={PAD_L} x2={W - PAD_R} y1={basisY} y2={basisY} className="term-sim-chart__basis" strokeDasharray="5 4" strokeWidth="1" />
        <circle cx={pts[peakIdx][0]} cy={pts[peakIdx][1]} r="3.5" fill="#10b981" className="term-sim-chart__marker" strokeWidth="1.5" />
        <circle cx={pts[troughIdx][0]} cy={pts[troughIdx][1]} r="3.5" fill="#ef4444" className="term-sim-chart__marker" strokeWidth="1.5" />
        <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="4" fill={col} className="term-sim-chart__marker" strokeWidth="2" />
        {xLabels.map(({ ts, x }, i) => (
          <text
            key={i}
            x={x}
            y={H - 6}
            textAnchor="middle"
            className="term-sim-chart__axis"
            style={{ fontSize: 9, fontFamily: "JetBrains Mono, ui-monospace, monospace" }}
          >
            {fmtAxisDate(ts)}
          </text>
        ))}
      </svg>
      <div className="term-sim-chart__legend">
        <span><span className="inline-block h-2 w-2 rounded-full bg-emerald-500 align-middle" /> peak</span>
        <span><span className="inline-block h-2 w-2 rounded-full bg-red-500 align-middle" /> trough</span>
        <span className="term-sim-chart__legend-divider">— cost basis</span>
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
  const [history, setHistory] = useState<PricePoint[] | null | "loading">("loading");
  const [result, setResult] = useState<LaunchSimResult | null | "loading">(null);
  const [compare, setCompare] = useState<SimCompareRow[] | "loading" | null>(null);

  const coin = coins.find((c) => c.ca === selectedCa) ?? coins[0];
  const hint = holdingHints?.find((h) => h.ca === coin?.ca);

  const simOptions = useMemo(
    () => ({ investUsd, entryMode, daysAgo }),
    [investUsd, entryMode, daysAgo],
  );

  const liveCoinKey = coin
    ? `${coin.priceUsd}|${coin.mcap}|${coin.pairCreatedAt ?? ""}|${coin.totalSupply ?? ""}|${coin.circulatingSupply ?? ""}`
    : "";

  useEffect(() => {
    if (defaultCa && coins.some((c) => c.ca === defaultCa)) setSelectedCa(defaultCa);
  }, [defaultCa, coins]);

  useEffect(() => {
    if (!coin) return;
    let alive = true;
    setHistory("loading");
    fetchPriceHistory(coin.ca, 720).then((points) => {
      if (!alive) return;
      setHistory(points);
    });
    return () => { alive = false; };
  }, [coin?.ca]);

  useEffect(() => {
    if (!coin || history === "loading") {
      setResult(history === "loading" ? "loading" : null);
      return;
    }
    setResult(simulatePortfolio(coin, history, simOptions));
  }, [coin, liveCoinKey, history, simOptions]);

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

  const tokenAgeDays = coin?.pairCreatedAt
    ? Math.max(1, Math.round((Date.now() - coin.pairCreatedAt) / 86400000))
    : result && result !== "loading" && entryMode === "launch"
      ? result.ageDays
      : 30;
  const maxDaysAgo = Math.min(365, tokenAgeDays);

  return (
    <Card
      className="term-sim mt-4 min-w-0"
      title="⏳ Portfolio simulator"
      right={
        <span className="hidden text-[10px] text-zinc-400 sm:inline">
          what-if buys · ezpulse snapshots
        </span>
      }
    >
      <div className="space-y-4 px-4 py-4 text-left sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          {(["launch", "days_ago"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setEntryMode(m)}
              className={`rounded-full px-3.5 py-1.5 text-[11px] font-bold transition ${entryMode === m ? "text-white" : "bg-zinc-100 text-zinc-500 hover:text-zinc-800"}`}
              style={entryMode === m ? { background: BLUE } : undefined}
            >
              {m === "launch" ? "$5K start + dev buy" : "Days ago"}
            </button>
          ))}
          {coins.length > 1 && (
            <button
              onClick={() => setCompareOpen((v) => !v)}
              className={`w-full rounded-full px-3.5 py-1.5 text-[11px] font-bold transition sm:ml-auto sm:w-auto ${compareOpen ? "text-white" : "border border-zinc-200 text-zinc-500 hover:border-indigo-300 hover:text-indigo-700"}`}
              style={compareOpen ? { background: BLUE } : undefined}
            >
              Compare all
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <select
            value={selectedCa}
            onChange={(e) => setSelectedCa(e.target.value)}
            className="min-w-0 w-full rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-[12px] font-semibold outline-none focus:border-indigo-300 sm:flex-1"
          >
            {coins.map((c) => (
              <option key={c.ca} value={c.ca}>{c.name} (${c.symbol})</option>
            ))}
          </select>
          {hint && hint.valueUsd >= 0.01 && (
            <button
              onClick={() => setInvestUsd(Math.min(MAX_INVEST, Math.round(hint.valueUsd)))}
              className="w-full shrink-0 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-2 text-[11px] font-bold text-indigo-700 transition hover:bg-indigo-100 sm:w-auto"
              title="Match your current holding value"
            >
              Match position · {fmtUsd(hint.valueUsd)}
            </button>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
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
              max={maxDaysAgo}
              value={Math.min(daysAgo, maxDaysAgo)}
              onChange={(e) => setDaysAgo(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer accent-indigo-600"
            />
            <p className="text-[10px] text-zinc-400">Snaps to nearest ezpulse price snapshot</p>
          </div>
        )}

        {compareOpen && (
          <div className="rounded-xl border border-zinc-200 bg-white">
            <div className="border-b border-zinc-100 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              <span className="block sm:inline">Leaderboard</span>
              <span className="hidden sm:inline"> · </span>
              <span className="block text-zinc-500 sm:inline">${investUsd} buy · {entryMode === "launch" ? "$5K start + dev buy" : `${daysAgo}d ago`}</span>
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
                    <Num className={`shrink-0 ${row.result.roiPct >= 0 ? "text-emerald-600" : "text-red-500"}`} bold>
                      {row.result.roiPct >= 0 ? "+" : ""}{row.result.roiPct}%
                    </Num>
                    <Num className="hidden shrink-0 text-zinc-500 sm:block">{row.result.multiple}x</Num>
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
                  ? "launch price estimated — no snapshot at pair creation"
                  : result.source === "mcap_ratio"
                    ? "launch price inferred from earliest recorded mcap ratio"
                    : "thin snapshot history; entry may be approximate"}.
              </div>
            )}
            {(result.source === "launch_mcap" || result.source === "dev_buy_at_launch") && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/80 px-4 py-2.5 text-[11px] text-indigo-800">
                {result.source === "dev_buy_at_launch" ? (
                  <>
                    Entry at Kickstart <strong>{fmtUsd(result.startingMcap)}</strong> curve start
                    {result.devBuyMcap > 0 && (
                      <> + founder initial buy (<strong>+{fmtUsd(result.devBuyMcap)}</strong> mcap)</>
                    )}
                    {" "}→ <strong>{fmtUsd(result.entryMcap)}</strong> entry mcap
                  </>
                ) : (
                  <>
                    Entry at Kickstart curve start · <strong>{fmtUsd(result.startingMcap)}</strong> mcap
                    {result.devBuyMcap <= 0 && " · no dev buy detected in early snapshots"}
                  </>
                )}
                {coin.pairCreatedAt ? ` · ${new Date(coin.pairCreatedAt).toLocaleDateString()}` : ""}.
              </div>
            )}

            <div className="term-sim-stats grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
              <div className="term-sim-stat rounded-xl border border-zinc-200 bg-white px-3 py-3 sm:px-4">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Entry</div>
                <Num size="lg" bold className="mt-0.5 block truncate text-zinc-900">{fmtUsd(result.entryMcap)}</Num>
                <div className="text-[10px] text-zinc-400">{result.entryLabel} · {result.ageDays}d hold</div>
              </div>
              <div className="term-sim-stat term-sim-stat--hero col-span-2 rounded-xl px-3 py-3 text-white sm:col-span-1 sm:px-4" style={{ background: `linear-gradient(135deg, ${BLUE}, #4f2ff0)` }}>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-white/60">Value today</div>
                <Num size="lg" bold className="mt-0.5 block truncate">{fmtUsd(result.currentValue)}</Num>
                <div className="text-[10px] text-white/70">{result.multiple}x · {fmtUsd(result.currentMcap)} mcap</div>
              </div>
              <div className="term-sim-stat rounded-xl border border-zinc-200 bg-white px-3 py-3 sm:px-4">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">P&amp;L</div>
                <Num size="lg" bold className={`mt-0.5 block truncate ${result.pnlUsd >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {result.pnlUsd >= 0 ? "+" : ""}{fmtUsd(Math.abs(result.pnlUsd))}
                </Num>
                <div className="flex items-center gap-1 text-[10px]">
                  <Delta v={result.roiPct} suffix="%" />
                </div>
              </div>
              <div className="term-sim-stat rounded-xl border border-zinc-200 bg-white px-3 py-3 sm:px-4">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Peak</div>
                <Num size="lg" bold className="mt-0.5 block truncate text-emerald-600">{fmtUsd(result.peakValue)}</Num>
                <div className="text-[10px] text-zinc-400">
                  {result.peakMultiple}x{result.daysToPeak != null ? ` · day ${result.daysToPeak}` : ""}
                </div>
              </div>
              <div className="term-sim-stat rounded-xl border border-zinc-200 bg-white px-3 py-3 sm:px-4">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Trough</div>
                <Num size="lg" bold className="mt-0.5 block truncate text-red-500">{fmtUsd(result.troughValue)}</Num>
                <div className="text-[10px] text-zinc-400">{result.troughMultiple}x · +{result.drawdownFromTroughPct}% since</div>
              </div>
              <div className="term-sim-stat rounded-xl border border-zinc-200 bg-white px-3 py-3 sm:px-4">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">From peak</div>
                <Num size="lg" bold className={`mt-0.5 block truncate ${result.drawdownFromPeakPct > 30 ? "text-red-500" : "text-zinc-700"}`}>
                  -{result.drawdownFromPeakPct}%
                </Num>
                <div className="text-[10px] text-zinc-400">
                  {result.annualizedRoiPct != null ? `${result.annualizedRoiPct >= 0 ? "+" : ""}${result.annualizedRoiPct}% ann.` : "drawdown"}
                </div>
              </div>
            </div>

            <SimulatorChart result={result} />

            <p className="text-[11px] leading-relaxed text-zinc-500">
              Simulates <strong>${investUsd}</strong> into <strong>${coin.symbol}</strong> {result.entryLabel}
              {result.entryMode === "launch" && result.devBuyMcap > 0
                ? <> ({fmtUsd(result.startingMcap)} start + {fmtUsd(result.devBuyMcap)} dev buy → {fmtUsd(result.entryMcap)} mcap)</>
                : <> at {fmtUsd(result.entryMcap)} mcap</>}
              ({result.entryPrice < 0.01 ? result.entryPrice.toExponential(2) : `$${result.entryPrice.toFixed(6)}`}/token)
              → {fmtUsd(result.currentMcap)} mcap today ({fmtUsd(result.currentPrice)}/token).
              {" "}Holdings: <strong>{result.tokensBought >= 1_000_000 ? `${(result.tokensBought / 1_000_000).toFixed(2)}M` : result.tokensBought >= 1_000 ? `${(result.tokensBought / 1000).toFixed(1)}K` : result.tokensBought.toFixed(0)}</strong> tokens · live feed synced.
              Not financial advice.
            </p>
          </>
        )}
      </div>
    </Card>
  );
}
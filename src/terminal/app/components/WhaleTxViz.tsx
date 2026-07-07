import { useMemo } from "react";
import { fmtUsd } from "../../data";
import { Card } from "../../components";
import type { WhaleFlow, WhaleTransaction } from "../../whales";

function TxTimeline({ txs, threshold }: { txs: WhaleTransaction[]; threshold: number }) {
  const { minTs, maxTs } = useMemo(() => {
    if (!txs.length) return { minTs: Date.now() - 86400000, maxTs: Date.now() };
    const times = txs.map((t) => t.ts);
    return { minTs: Math.min(...times), maxTs: Math.max(...times) };
  }, [txs]);

  const span = Math.max(maxTs - minTs, 3600000);
  const maxUsd = Math.max(...txs.map((t) => t.usd), threshold);

  return (
    <div className="relative mt-3 h-28 rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-4">
      <div className="absolute inset-x-3 top-1/2 h-px bg-zinc-200" />
      {txs.map((t) => {
        const x = ((t.ts - minTs) / span) * 100;
        const size = 6 + (t.usd / maxUsd) * 18;
        const col = t.side === "BUY" ? "#10b981" : "#ef4444";
        return (
          <a
            key={t.id}
            href={t.signature ? `https://solscan.io/tx/${t.signature}` : undefined}
            target="_blank"
            rel="noopener noreferrer"
            title={`${t.side} $${t.usd.toLocaleString()} · ${t.wallet}${t.signature ? " · view on Solscan" : ""}`}
            className="absolute -translate-x-1/2 transition hover:scale-125"
            style={{ left: `${Math.min(98, Math.max(2, x))}%`, top: t.side === "BUY" ? "28%" : "58%" }}
          >
            <span
              className="block rounded-full border-2 border-white shadow-sm"
              style={{ width: size, height: size, background: col }}
            />
          </a>
        );
      })}
      <div className="absolute bottom-1.5 left-3 text-[9px] font-bold uppercase tracking-widest text-emerald-600">Buys ↑</div>
      <div className="absolute bottom-1.5 right-3 text-[9px] font-bold uppercase tracking-widest text-red-500">Sells ↓</div>
    </div>
  );
}

function TxRow({ t }: { t: WhaleTransaction }) {
  const ago = Math.max(0, Math.round((Date.now() - t.ts) / 60000));
  const timeLabel = ago < 60 ? `${ago}m ago` : `${Math.round(ago / 60)}h ago`;
  return (
    <div className="flex items-center gap-3 border-b border-zinc-50 px-4 py-2.5 last:border-0">
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] ${t.side === "BUY" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
        {t.side === "BUY" ? "↑" : "↓"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold tabular-nums text-zinc-900">${t.usd.toLocaleString()}</span>
          <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-black tracking-widest text-white ${t.side === "BUY" ? "bg-emerald-600" : "bg-red-500"}`}>{t.side}</span>
          <span className="text-[10px] text-zinc-400">{timeLabel}</span>
        </div>
        <div className="font-mono text-[10px] text-zinc-400">{t.wallet}{t.source === "inferred" ? " · flow model" : " · on-chain"}</div>
      </div>
      {t.signature && (
        <a href={`https://solscan.io/tx/${t.signature}`} target="_blank" rel="noopener noreferrer"
          className="shrink-0 rounded-lg border border-zinc-200 px-2 py-1 text-[10px] font-bold text-indigo-600 hover:border-indigo-300">
          Tx ↗
        </a>
      )}
    </div>
  );
}

export function WhaleTxViz({ flow, compact = false }: { flow: WhaleFlow; compact?: boolean }) {
  const bias = flow.netUsd > 500 ? "ACCUMULATING" : flow.netUsd < -500 ? "DISTRIBUTING" : "MIXED";
  const biasCol = bias === "ACCUMULATING" ? "text-emerald-600" : bias === "DISTRIBUTING" ? "text-red-500" : "text-zinc-500";

  return (
    <Card
      title={`🐋 Whale flow · $${flow.token.symbol}`}
      right={
        <span className="text-[10px] text-zinc-400">
          ≥{fmtUsd(flow.thresholdUsd)} · {flow.txs[0]?.source === "solscan" ? "on-chain" : "flow model"}
        </span>
      }
    >
      <div className={`grid gap-3 px-4 py-3 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-4"}`}>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Net whale flow</div>
          <div className={`mt-0.5 text-lg font-bold tabular-nums ${biasCol}`}>
            {flow.netUsd >= 0 ? "+" : ""}{fmtUsd(Math.abs(flow.netUsd))}
          </div>
          <div className="text-[10px] text-zinc-400">{bias}</div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Buy volume</div>
          <div className="mt-0.5 text-lg font-bold tabular-nums text-emerald-600">{fmtUsd(flow.buyUsd)}</div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Sell volume</div>
          <div className="mt-0.5 text-lg font-bold tabular-nums text-red-500">{fmtUsd(flow.sellUsd)}</div>
        </div>
        {flow.largestTx && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Largest tx</div>
            <div className="mt-0.5 text-lg font-bold tabular-nums text-zinc-900">${flow.largestTx.usd.toLocaleString()}</div>
            <div className="text-[10px] text-zinc-400">{flow.largestTx.side}</div>
          </div>
        )}
      </div>

      <TxTimeline txs={flow.txs} threshold={flow.thresholdUsd} />

      {!compact && (
        <div className="max-h-48 overflow-y-auto border-t border-zinc-100">
          {flow.txs.slice(0, 10).map((t) => <TxRow key={t.id} t={t} />)}
        </div>
      )}

      <p className="border-t border-zinc-100 px-4 py-2 text-[10px] text-zinc-400">
        Bubble size = trade notional · position = buy (top) / sell (bottom) · refreshes every 60s
      </p>
    </Card>
  );
}

export function WhaleAlertsPanel({
  flows,
  loading,
  alertTokens,
  onOpen,
}: {
  flows: Map<string, import("../../whales").WhaleFlow>;
  loading: boolean;
  alertTokens: import("../../kickstart").LiveLaunch[];
  onOpen: (c: import("../../kickstart").LiveLaunch) => void;
}) {
  if (!alertTokens.length && !loading) return null;

  return (
    <Card
      className="mb-4"
      title="🐋 Real-time whale alerts"
      right={
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-600">
          <span className="term-blink h-1.5 w-1.5 rounded-full bg-red-500" /> LIVE
        </span>
      }
    >
      {loading && !flows.size && (
        <div className="px-5 py-6 text-center text-[12px] text-zinc-400">Scanning on-chain flow…</div>
      )}
      <div className="divide-y divide-zinc-50">
        {alertTokens.map((c) => {
          const flow = flows.get(c.ca);
          const net = flow?.netUsd ?? 0;
          return (
            <button
              key={c.ca}
              onClick={() => onOpen(c)}
              className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-indigo-50/40"
            >
              {c.icon && <img src={c.icon} alt="" className="h-8 w-8 rounded-full border border-zinc-100" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-900">{c.name}</span>
                  <span className="text-[11px] text-zinc-400">${c.symbol}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[8px] font-black tracking-widest text-white ${net >= 0 ? "bg-emerald-600" : "bg-red-500"}`}>
                    {net >= 0 ? "ACCUM" : "DISTRIB"}
                  </span>
                </div>
                <div className="mt-0.5 text-[11px] text-zinc-500">
                  {flow
                    ? `${flow.txs.length} whale-scale txs · net ${net >= 0 ? "+" : ""}${fmtUsd(Math.abs(net))}`
                    : "Loading tx flow…"}
                </div>
              </div>
              <span className="text-[11px] font-semibold text-indigo-500">View →</span>
            </button>
          );
        })}
      </div>
      {!alertTokens.length && !loading && (
        <div className="px-5 py-6 text-center text-[12px] text-zinc-400">No directional whale flow right now — alerts fire when large trades skew buy or sell.</div>
      )}
      <div className="border-t border-zinc-100 bg-zinc-50/60 px-4 py-2 text-[10px] text-zinc-400">
        Threshold scales with market cap · {flows.size ? `${[...flows.values()].filter((f) => f.txs[0]?.source === "solscan").length} on-chain` : "polling"} sources
      </div>
    </Card>
  );
}
import { useMemo, useState } from "react";
import { ecosystemSignals, type EcoEvent } from "../../kickstart";
import { BLUE, Card, Stat } from "../../components";
import { PageHead, EmptyState, LaunchCta, LoadingRows } from "../components/PageLayout";
import { HitRateBadge, KindBadge, StrengthBadge, signalIcon } from "../components/SignalBadges";
import { WhaleAlertsPanel } from "../components/WhaleTxViz";
import { useSignalRecord } from "../hooks/useSignalRecord";
import { useWhaleAlerts } from "../hooks/useWhaleAlerts";
import { useTerminalContext } from "../TerminalContext";
import type { SignalKind } from "../../../../shared/signals-core";

type KindFilter = "ALL" | SignalKind;
type StrengthFilter = "ALL" | "BULLISH" | "BEARISH";

export function SignalsSection() {
  const { feed, loading, topMover, openToken, goto } = useTerminalContext();
  const record = useSignalRecord();
  const whaleAlerts = useWhaleAlerts(feed);
  const [kindFilter, setKindFilter] = useState<KindFilter>("ALL");
  const [strengthFilter, setStrengthFilter] = useState<StrengthFilter>("ALL");

  const events = useMemo(() => (feed.length ? ecosystemSignals(feed) : []), [feed]);
  const filtered = useMemo(() => events.filter((e) => {
    if (kindFilter !== "ALL" && e.kind !== kindFilter) return false;
    if (strengthFilter !== "ALL" && e.strength !== strengthFilter) return false;
    return true;
  }), [events, kindFilter, strengthFilter]);

  const bulls = events.filter((e) => e.strength === "BULLISH").length;
  const bears = events.filter((e) => e.strength === "BEARISH").length;
  const pendingCount = record.pending?.length ?? 0;

  const kindCounts = useMemo(() => {
    const c: Partial<Record<SignalKind, number>> = {};
    for (const e of events) c[e.kind as SignalKind] = (c[e.kind as SignalKind] ?? 0) + 1;
    return c;
  }, [events]);

  return (
    <>
      <PageHead
        title="Signals"
        sub="Everything happening in the ecosystem, in real time — archived to the public track record and scored at +24h."
        right={
          <span className="flex flex-wrap items-center gap-2">
            {record.ready && pendingCount > 0 && (
              <button
                onClick={() => goto("record")}
                className="rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100"
              >
                ⏳ {pendingCount} awaiting score
              </button>
            )}
            <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-600">
              <span className="term-blink h-1.5 w-1.5 rounded-full bg-red-500" /> LIVE FEED
            </span>
          </span>
        }
      />

      <WhaleAlertsPanel
        flows={whaleAlerts.flows}
        loading={whaleAlerts.loading}
        alertTokens={whaleAlerts.alertTokens}
        onOpen={openToken}
      />

      {record.ready && record.byKind && Object.keys(record.byKind).length > 0 && (
        <Card className="mb-4" title="Historical hit rates · archived signals" right={
          <button onClick={() => goto("record")} className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800">
            Full track record →
          </button>
        }>
          <div className="flex flex-wrap gap-2 px-5 py-3">
            {Object.entries(record.byKind)
              .filter(([, v]) => v.total >= 3)
              .sort((a, b) => b[1].rate - a[1].rate)
              .map(([kind, v]) => (
                <span key={kind} className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[11px]">
                  <KindBadge kind={kind} />
                  <span className={`font-bold tabular-nums ${v.rate >= 0.5 ? "text-emerald-600" : "text-red-500"}`}>
                    {(v.rate * 100).toFixed(0)}%
                  </span>
                  <span className="text-zinc-400">({v.hits}/{v.total})</span>
                </span>
              ))}
          </div>
        </Card>
      )}

      {loading && <Card><LoadingRows /></Card>}
      {!loading && feed.length === 0 && (
        <EmptyState icon="⚡" title="The feed is quiet" body="Signals fire the moment live …EASY tokens start moving — momentum, volume spikes, liquidity shifts, rank changes, new launches." cta={<LaunchCta />} />
      )}
      {!loading && feed.length > 0 && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className={`rounded-2xl px-5 py-4 text-white shadow-lg ${bulls > bears ? "bg-emerald-600" : bears > bulls ? "bg-red-500" : "bg-zinc-700"}`}>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-white/60">Ecosystem bias</div>
              <div className="mt-1 font-display text-2xl font-semibold">{bulls > bears ? "BULLISH" : bears > bulls ? "BEARISH" : "MIXED"}</div>
              <div className="mt-0.5 text-[11px] text-white/70">{bulls} bullish · {bears} bearish</div>
            </div>
            <Stat label="Signals firing" value={String(events.length)} sub={`${filtered.length} shown · ${feed.length} tokens`} />
            <Stat label="Top mover" value={topMover ? `${topMover.change24h >= 0 ? "+" : ""}${topMover.change24h.toFixed(1)}%` : "—"} sub={topMover ? `$${topMover.symbol}` : ""} />
            <Stat label="Archive pipeline" value={record.ready ? (pendingCount ? `${pendingCount} pending` : "Live") : "Local"} sub={record.ready ? "scored at +24h via snapshots" : "connect backend for track record"} />
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <div className="flex gap-1 overflow-x-auto rounded-full border border-zinc-200 bg-white p-1">
              {(["ALL", "WHALE", "MOMENTUM", "VOLUME", "LIQUIDITY", "RANK", "LAUNCH"] as KindFilter[]).map((k) => (
                <button key={k} onClick={() => setKindFilter(k)}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-bold transition ${kindFilter === k ? "text-white" : "text-zinc-500 hover:text-zinc-800"}`}
                  style={kindFilter === k ? { background: BLUE } : undefined}>
                  {k === "ALL" ? `All (${events.length})` : `${k} (${kindCounts[k as SignalKind] ?? 0})`}
                </button>
              ))}
            </div>
            <div className="flex gap-1 rounded-full border border-zinc-200 bg-white p-1">
              {(["ALL", "BULLISH", "BEARISH"] as StrengthFilter[]).map((s) => (
                <button key={s} onClick={() => setStrengthFilter(s)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${strengthFilter === s ? "text-white" : "text-zinc-500 hover:text-zinc-800"}`}
                  style={strengthFilter === s ? { background: s === "BULLISH" ? "#059669" : s === "BEARISH" ? "#ef4444" : BLUE } : undefined}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            {filtered.length === 0 && (
              <Card><div className="px-5 py-8 text-center text-[13px] text-zinc-400">No signals match these filters — try ALL or loosen strength.</div></Card>
            )}
            {filtered.map((e, i) => (
              <SignalEventRow key={`${e.token.ca}-${e.kind}-${i}`} e={e} byKind={record.byKind} onOpen={() => openToken(e.token)} />
            ))}
          </div>
          <p className="mt-4 text-[10px] text-zinc-400">
            Directional signals are archived every 15 min and resolved against ezpulse price snapshots at +24h. VERIFY/LAUNCH appear live; WHALE/MOMENTUM/VOLUME/LIQUIDITY/RANK enter the permanent log. Not investment advice.
          </p>
        </>
      )}
    </>
  );
}

function SignalEventRow({ e, byKind, onOpen }: {
  e: EcoEvent;
  byKind: Record<string, { total: number; hits: number; rate: number }> | null;
  onOpen: () => void;
}) {
  const hist = byKind?.[e.kind];
  return (
    <button onClick={onOpen}
      className="flex w-full items-start gap-3.5 rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] ${
        e.strength === "BULLISH" ? "bg-emerald-50" : e.strength === "BEARISH" ? "bg-red-50" : "bg-zinc-100"
      }`}>
        {signalIcon(e.kind, e.strength)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-bold text-zinc-900">{e.title}</span>
          <StrengthBadge strength={e.strength} />
          <KindBadge kind={e.kind} />
          {hist && <HitRateBadge rate={hist.rate} total={hist.total} />}
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-500">{e.detail}</p>
        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-zinc-400">
          {e.token.icon && <img src={e.token.icon} alt="" className="h-4 w-4 rounded-full" onError={(ev) => { (ev.target as HTMLImageElement).style.display = "none"; }} />}
          <span className="font-semibold text-zinc-600">{e.token.name}</span> ${e.token.symbol}
          <span className="ml-auto font-semibold text-indigo-500">Open terminal →</span>
        </div>
      </div>
    </button>
  );
}
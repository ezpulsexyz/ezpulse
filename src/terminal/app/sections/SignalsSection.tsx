import { useMemo, useState } from "react";
import { formatRelativeTime } from "../../../lib/utils";
import { ecosystemBias, ecosystemSignals, type EcoEvent } from "../../kickstart";
import { BLUE, Card, Stat } from "../../components";
import { BiasHero } from "../components/BiasHero";
import { PageHead, EmptyState, LaunchCta, LoadingRows } from "../components/PageLayout";
import { LiveBadge } from "../components/LiveBadge";
import { HitRateBadge, KindBadge, StrengthBadge, signalIcon } from "../components/SignalBadges";
import { WhaleSignalsPanel } from "../components/WhaleSignalsPanel";
import { useSignalRecord } from "../hooks/useSignalRecord";
import { useTerminalContext } from "../TerminalContext";
import type { SignalKind } from "../../../../shared/signals-core";

type KindFilter = "ALL" | SignalKind;
type StrengthFilter = "ALL" | "BULLISH" | "BEARISH";

export function SignalsSection() {
  const { feed, loading, topMover, openToken, goto, lastUpdated } = useTerminalContext();
  const record = useSignalRecord();
  const [kindFilter, setKindFilter] = useState<KindFilter>("ALL");
  const [strengthFilter, setStrengthFilter] = useState<StrengthFilter>("ALL");

  const events = useMemo(() => (feed.length ? ecosystemSignals(feed, lastUpdated) : []), [feed, lastUpdated]);
  const filtered = useMemo(() => events.filter((e) => {
    if (kindFilter !== "ALL" && e.kind !== kindFilter) return false;
    if (strengthFilter !== "ALL" && e.strength !== strengthFilter) return false;
    return true;
  }), [events, kindFilter, strengthFilter]);

  const bias = useMemo(() => ecosystemBias(events), [events]);
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
                className="term-pending-btn rounded-full px-3 py-1.5 text-[11px] font-semibold transition"
              >
                ⏳ {pendingCount} awaiting score
              </button>
            )}
            <LiveBadge label="LIVE FEED" ts={lastUpdated} tone="red" size="md" />
          </span>
        }
      />

      <WhaleSignalsPanel
        events={events}
        loading={loading}
        onOpen={(e) => openToken(e.token)}
      />

      {record.ready && record.byKind && Object.keys(record.byKind).length > 0 && (
        <Card className="mb-4" title="Historical hit rates · archived signals" right={
          <button onClick={() => goto("record")} className="text-[11px] font-semibold transition" style={{ color: "var(--term-accent)" }}>
            Full track record →
          </button>
        }>
          <div className="flex flex-wrap gap-2 px-5 py-3">
            {Object.entries(record.byKind)
              .filter(([, v]) => v.total >= 3)
              .sort((a, b) => b[1].rate - a[1].rate)
              .map(([kind, v]) => (
                <span key={kind} className="term-hit-chip flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px]">
                  <KindBadge kind={kind} />
                  <span className={`font-bold tabular-nums ${v.rate >= 0.5 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                    {(v.rate * 100).toFixed(0)}%
                  </span>
                  <span style={{ color: "var(--term-text-subtle)" }}>({v.hits}/{v.total})</span>
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
            <BiasHero label="Ecosystem bias" bias={bias} className="col-span-2 lg:col-span-1" />
            <Stat label="Signals firing" value={String(events.length)} sub={`${filtered.length} shown · ${feed.length} tokens`} />
            <Stat label="Top mover" value={topMover ? `${topMover.change24h >= 0 ? "+" : ""}${topMover.change24h.toFixed(1)}%` : "—"} sub={topMover ? `$${topMover.symbol}` : ""} />
            <Stat label="Archive pipeline" value={record.ready ? (pendingCount ? `${pendingCount} pending` : "Live") : "Local"} sub={record.ready ? "scored at +24h via snapshots" : "connect backend for track record"} />
          </div>

          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <div className="term-tab-rail term-scroll-x flex-1">
              {(["ALL", "WHALE", "MOMENTUM", "VOLUME", "LIQUIDITY", "RANK", "LAUNCH"] as KindFilter[]).map((k) => (
                <button key={k} onClick={() => setKindFilter(k)}
                  className={`term-filter-pill ${kindFilter === k ? "term-filter-pill--active" : ""}`}
                  style={kindFilter === k ? { background: BLUE } : undefined}>
                  {k === "ALL" ? `All (${events.length})` : `${k} (${kindCounts[k as SignalKind] ?? 0})`}
                </button>
              ))}
            </div>
            <div className="term-tab-rail term-scroll-x shrink-0 sm:w-auto">
              {(["ALL", "BULLISH", "BEARISH"] as StrengthFilter[]).map((s) => (
                <button key={s} onClick={() => setStrengthFilter(s)}
                  className={`term-filter-pill ${strengthFilter === s ? "term-filter-pill--active" : ""}`}
                  style={strengthFilter === s ? { background: s === "BULLISH" ? "#059669" : s === "BEARISH" ? "#ef4444" : BLUE } : undefined}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            {filtered.length === 0 && (
              <Card><div className="px-5 py-8 text-center text-[13px]" style={{ color: "var(--term-text-muted)" }}>No signals match these filters — try ALL or loosen strength.</div></Card>
            )}
            {filtered.map((e, i) => (
              <SignalEventRow key={`${e.token.ca}-${e.kind}-${i}`} e={e} byKind={record.byKind} onOpen={() => openToken(e.token)} />
            ))}
          </div>
          <p className="mt-4 text-[10px]" style={{ color: "var(--term-text-subtle)" }}>
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
  const iconTone =
    e.strength === "BULLISH" ? "term-signal-row__icon--bull"
    : e.strength === "BEARISH" ? "term-signal-row__icon--bear"
    : "term-signal-row__icon--neutral";

  return (
    <button onClick={onOpen} className="term-signal-row">
      <span className={`term-signal-row__icon ${iconTone}`}>
        {signalIcon(e.kind, e.strength)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-bold" style={{ color: "var(--term-text)" }}>{e.title}</span>
          <StrengthBadge strength={e.strength} />
          <KindBadge kind={e.kind} />
          {hist && <HitRateBadge rate={hist.rate} total={hist.total} />}
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: "var(--term-text-muted)" }}>{e.detail}</p>
        <div className="mt-1.5 flex items-center gap-2 text-[11px]" style={{ color: "var(--term-text-subtle)" }}>
          {e.token.icon && <img src={e.token.icon} alt="" className="h-4 w-4 rounded-full" onError={(ev) => { (ev.target as HTMLImageElement).style.display = "none"; }} />}
          <span className="font-semibold" style={{ color: "var(--term-text-secondary)" }}>{e.token.name}</span> ${e.token.symbol}
          <span className="term-signal-time" title={new Date(e.occurredAt).toLocaleString()}>
            {formatRelativeTime(e.occurredAt)}
          </span>
          <span className="ml-auto text-[11px] font-medium" style={{ color: "var(--term-accent)" }}>Open →</span>
        </div>
      </div>
    </button>
  );
}
import { useMemo, useState } from "react";
import { formatRelativeTime } from "../../../lib/utils";
import { BLUE, Card, Stat } from "../../components";
import { KIND_ICON } from "../../kickstart";
import { backendReady } from "../../backend";
import { formatResolvesIn, resolvesInMs, useSignalRecord } from "../hooks/useSignalRecord";
import { KindBadge, StrengthBadge } from "./SignalBadges";
import { EmptyState } from "./PageLayout";
import { STATS_COLS, STATS_GRID, TermHead, TermHeadCell, TermNum, TermRow, TermRowButton } from "./TermTable";
import type { SignalKind } from "../../../../shared/signals-core";

export function TrackRecord({ onOpen }: { onOpen: (ca: string) => void }) {
  const { loading, accuracy, resolved, pending } = useSignalRecord();
  const [kindFilter, setKindFilter] = useState<"ALL" | SignalKind>("ALL");

  const acc = loading ? "loading" as const : accuracy;
  const totals = Array.isArray(acc)
    ? acc.reduce((s, r) => ({ total: s.total + r.total, hits: s.hits + r.hits }), { total: 0, hits: 0 })
    : null;

  const filteredAcc = useMemo(() => {
    if (!Array.isArray(acc)) return acc;
    if (kindFilter === "ALL") return acc;
    return acc.filter((r) => r.kind === kindFilter);
  }, [acc, kindFilter]);

  const filteredResolved = useMemo(() => {
    if (!resolved) return resolved;
    if (kindFilter === "ALL") return resolved;
    return resolved.filter((r) => r.kind === kindFilter);
  }, [resolved, kindFilter]);

  const filteredPending = useMemo(() => {
    if (!pending) return pending;
    if (kindFilter === "ALL") return pending;
    return pending.filter((r) => r.kind === kindFilter);
  }, [pending, kindFilter]);

  const kinds = useMemo(() => {
    if (!Array.isArray(acc)) return [] as SignalKind[];
    return [...new Set(acc.map((r) => r.kind))] as SignalKind[];
  }, [acc]);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-900">Track Record</h1>
          <p className="mt-0.5 text-[13px] text-zinc-500">
            Every archived signal is scored against ezpulse price snapshots at +24h — publicly, permanently, no retroactive edits.
          </p>
        </div>
        <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-[11px] font-semibold text-indigo-700">
          🎯 Snapshot-based · auto-resolved
        </span>
      </div>

      {acc === "loading" && <Card><div className="px-5 py-10 text-center text-[13px] text-zinc-400">Loading track record…</div></Card>}

      {acc === null && (
        <EmptyState icon="🎯" title="The record starts now"
          body={backendReady
            ? "Signal archiving has just begun. Every signal fires into a permanent log and resolves against the market 24 hours later — the first scored results appear within a day."
            : "Once the backend is connected, every signal is archived and scored against the market 24h later. A public hit-rate no one can fake — accountability as a feature."}
          cta={<span className="text-[11px] text-zinc-400">Recording via the ezpulse snapshot pipeline · every 15 min</span>} />
      )}

      {Array.isArray(acc) && totals && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl px-5 py-4 text-white shadow-lg shadow-indigo-600/20" style={{ background: `linear-gradient(135deg, ${BLUE}, #4f2ff0)` }}>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-white/60">Overall hit rate</div>
              <div className="mt-1 font-display text-3xl font-semibold tabular-nums">{totals.total ? `${((totals.hits / totals.total) * 100).toFixed(0)}%` : "—"}</div>
              <div className="mt-0.5 text-[11px] text-white/60">{totals.hits}/{totals.total} signals correct at +24h</div>
            </div>
            <Stat label="Awaiting score" value={String(filteredPending?.length ?? 0)} sub="fired · not yet +24h old" />
            <Stat label="Signals scored" value={String(totals.total)} sub="resolved against snapshots" />
            <Stat label="Best category" value={(() => {
              const best = [...acc].filter((r) => r.total >= 3).sort((a, b) => b.hits / b.total - a.hits / a.total)[0];
              return best ? `${KIND_ICON[best.kind] ?? ""} ${best.kind}` : "—";
            })()} sub="min. 3 resolved signals" />
          </div>

          {kinds.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-1 rounded-full border border-zinc-200 bg-white p-1" style={{ width: "fit-content" }}>
              <button onClick={() => setKindFilter("ALL")}
                className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${kindFilter === "ALL" ? "text-white" : "text-zinc-500"}`}
                style={kindFilter === "ALL" ? { background: BLUE } : undefined}>ALL</button>
              {kinds.map((k) => (
                <button key={k} onClick={() => setKindFilter(k)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${kindFilter === k ? "text-white" : "text-zinc-500"}`}
                  style={kindFilter === k ? { background: BLUE } : undefined}>{KIND_ICON[k]} {k}</button>
              ))}
            </div>
          )}

          {filteredPending && filteredPending.length > 0 && (
            <Card className="mt-4" title="⏳ Pending resolution" right={<span className="text-[11px] text-zinc-400">+24h checkpoint · snapshot-priced</span>}>
              {filteredPending.slice(0, 12).map((p) => {
                const left = resolvesInMs(p.ts);
                return (
                  <TermRow key={p.id} className="flex-wrap gap-2.5">
                    <span className="font-mono text-[13px]">{KIND_ICON[p.kind] ?? "•"}</span>
                    <span className="min-w-0 flex-1 truncate font-mono text-[12px] font-semibold text-zinc-900">{p.title}</span>
                    <KindBadge kind={p.kind} />
                    <StrengthBadge strength={p.strength} />
                    <TermNum className="!text-amber-600">{formatResolvesIn(left)}</TermNum>
                    <span
                      className="cursor-help font-mono text-[10px] text-zinc-400"
                      title={new Date(p.ts).toLocaleString()}
                    >
                      {formatRelativeTime(p.ts)}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-400">${p.symbol}</span>
                  </TermRow>
                );
              })}
            </Card>
          )}

          <Card className="mt-4" title="Accuracy by signal type">
            <TermHead cols={STATS_COLS} breakpoint="sm">
              <TermHeadCell>Signal</TermHeadCell>
              <TermHeadCell align="right">Scored</TermHeadCell>
              <TermHeadCell align="right">Hit%</TermHeadCell>
              <TermHeadCell align="right">Avg24h</TermHeadCell>
              <TermHeadCell align="right">Bar</TermHeadCell>
            </TermHead>
            {Array.isArray(filteredAcc) && [...filteredAcc].sort((a, b) => b.total - a.total).map((r) => {
              const rate = r.total ? r.hits / r.total : 0;
              return (
                <TermRow key={`${r.kind}-${r.strength}`} grid={STATS_GRID} className="flex-wrap sm:flex-nowrap">
                  <span className="flex min-w-0 items-center gap-2 font-mono text-[12px] font-semibold text-zinc-900">
                    {KIND_ICON[r.kind] ?? "•"} {r.kind}
                    <StrengthBadge strength={r.strength} />
                  </span>
                  <TermNum className="text-zinc-500">{r.total}</TermNum>
                  <TermNum className={rate >= 0.5 ? "font-bold text-emerald-600" : "font-bold text-red-500"}>{(rate * 100).toFixed(0)}%</TermNum>
                  <TermNum className={r.avg_change_24h >= 0 ? "text-emerald-600" : "text-red-500"}>{r.avg_change_24h >= 0 ? "+" : ""}{r.avg_change_24h}%</TermNum>
                  <span className="hidden sm:block">
                    <span className="block h-1.5 overflow-hidden rounded-full bg-zinc-100">
                      <span className={`block h-full rounded-full ${rate >= 0.5 ? "bg-emerald-500" : "bg-red-400"}`} style={{ width: `${rate * 100}%` }} />
                    </span>
                  </span>
                </TermRow>
              );
            })}
          </Card>

          {filteredResolved && filteredResolved.length > 0 && (
            <Card className="mt-4" title="Recently resolved" right={<span className="text-[11px] text-zinc-400">newest first · click to open token</span>}>
              {filteredResolved.map((r, i) => (
                <TermRowButton key={i} onClick={() => onOpen(r.ca)} className="w-full flex-wrap gap-2.5">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] ${r.hit ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>{r.hit ? "✓" : "✗"}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="block truncate font-mono text-[12px] font-semibold text-zinc-900">{r.title}</span>
                      <KindBadge kind={r.kind} />
                    </span>
                    <span
                      className="cursor-help font-mono text-[10px] text-zinc-400"
                      title={new Date(r.ts).toLocaleString()}
                    >
                      ${r.symbol} · {formatRelativeTime(r.ts)} · {r.strength.toLowerCase()}
                    </span>
                  </span>
                  <TermNum className={`shrink-0 ${r.change_24h >= 0 ? "text-emerald-600" : "text-red-500"}`} bold>
                    {r.change_24h >= 0 ? "+" : ""}{r.change_24h.toFixed(1)}%
                  </TermNum>
                </TermRowButton>
              ))}
            </Card>
          )}
          <p className="mt-3 text-[11px] text-zinc-400">
            Signals fire automatically from live data and are written to an append-only log before outcomes are known.
            Resolution uses the ezpulse snapshot closest to +24h after the signal (fallback: live price at cron time).
            Hit = direction called correctly. BULLISH · price up · BEARISH · price down. Not investment advice.
          </p>
        </>
      )}
    </>
  );
}
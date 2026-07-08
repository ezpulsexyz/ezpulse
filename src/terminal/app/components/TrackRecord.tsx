import { useMemo, useState } from "react";
import { formatRelativeTime } from "../../../lib/utils";
import { BLUE, Card, Stat } from "../../components";
import { KIND_ICON } from "../../kickstart";
import { backendReady } from "../../backend";
import { formatResolvesIn, resolvesInMs, useSignalRecord } from "../hooks/useSignalRecord";
import { KindBadge, StrengthBadge } from "./SignalBadges";
import { EmptyState, PageHead } from "./PageLayout";
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
      <PageHead
        title="Track Record"
        sub="Every archived signal is scored against ezpulse price snapshots at +24h — publicly, permanently, no retroactive edits."
        right={
          <span className="term-head-chip w-full sm:w-auto">
            🎯 Snapshot-based · auto-resolved
          </span>
        }
      />

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
            <div className="term-market-stat term-hero-accent col-span-2 lg:col-span-1">
              <div className="term-market-stat__label">Overall hit rate</div>
              <div className="term-market-stat__value">{totals.total ? `${((totals.hits / totals.total) * 100).toFixed(0)}%` : "—"}</div>
              <div className="term-market-stat__sub">{totals.hits}/{totals.total} signals correct at +24h</div>
            </div>
            <Stat label="Awaiting score" value={String(filteredPending?.length ?? 0)} sub="fired · not yet +24h old" />
            <Stat label="Signals scored" value={String(totals.total)} sub="resolved against snapshots" />
            <div className="col-span-2 lg:col-span-1">
              <Stat label="Best category" value={(() => {
                const best = [...acc].filter((r) => r.total >= 3).sort((a, b) => b.hits / b.total - a.hits / a.total)[0];
                return best ? `${KIND_ICON[best.kind] ?? ""} ${best.kind}` : "—";
              })()} sub="min. 3 resolved signals" />
            </div>
          </div>

          {kinds.length > 1 && (
            <div className="term-tab-rail mt-4 flex w-full sm:w-fit">
              <button onClick={() => setKindFilter("ALL")}
                className={`term-filter-pill ${kindFilter === "ALL" ? "term-filter-pill--active" : ""}`}
                style={kindFilter === "ALL" ? { background: BLUE } : undefined}>ALL</button>
              {kinds.map((k) => (
                <button key={k} onClick={() => setKindFilter(k)}
                  className={`term-filter-pill ${kindFilter === k ? "term-filter-pill--active" : ""}`}
                  style={kindFilter === k ? { background: BLUE } : undefined}>{KIND_ICON[k]} {k}</button>
              ))}
            </div>
          )}

          {filteredPending && filteredPending.length > 0 && (
            <Card className="mt-4" title="Pending resolution" right={<span className="text-[11px]" style={{ color: "var(--term-text-subtle)" }}>+24h checkpoint · snapshot-priced</span>}>
              {filteredPending.slice(0, 12).map((p) => {
                const left = resolvesInMs(p.ts);
                return (
                  <TermRowButton key={p.id} onClick={() => onOpen(p.ca)} className="w-full gap-2.5">
                    <span className="term-pending-icon flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px]">⏳</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="block truncate font-mono text-[12px] font-semibold" style={{ color: "var(--term-text)" }}>{p.title}</span>
                        <KindBadge kind={p.kind} />
                        <StrengthBadge strength={p.strength} />
                      </span>
                      <span
                        className="cursor-help font-mono text-[10px]"
                        style={{ color: "var(--term-text-subtle)" }}
                        title={new Date(p.ts).toLocaleString()}
                      >
                        ${p.symbol} · {formatRelativeTime(p.ts)} · {p.strength.toLowerCase()}
                      </span>
                    </span>
                    <TermNum className="shrink-0 text-amber-600" bold>
                      {formatResolvesIn(left)}
                    </TermNum>
                  </TermRowButton>
                );
              })}
            </Card>
          )}

          {filteredResolved && filteredResolved.length > 0 && (
            <Card className="mt-4" title="Recently resolved" right={<span className="text-[11px]" style={{ color: "var(--term-text-subtle)" }}>newest first · click to open token</span>}>
              {filteredResolved.map((r, i) => (
                <TermRowButton key={i} onClick={() => onOpen(r.ca)} className="w-full gap-2.5">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] ${r.hit ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>{r.hit ? "✓" : "✗"}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="block truncate font-mono text-[12px] font-semibold" style={{ color: "var(--term-text)" }}>{r.title}</span>
                      <KindBadge kind={r.kind} />
                    </span>
                    <span
                      className="cursor-help font-mono text-[10px]"
                      style={{ color: "var(--term-text-subtle)" }}
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

          <Card className="mt-4" title="Accuracy by signal type">
            {Array.isArray(filteredAcc) && [...filteredAcc].sort((a, b) => b.total - a.total).map((r) => {
              const rate = r.total ? r.hits / r.total : 0;
              return (
                <div
                  key={`${r.kind}-${r.strength}-mobile`}
                  className="term-record-accuracy border-b px-4 py-3 last:border-0 sm:hidden"
                  style={{ borderColor: "var(--term-border-subtle)" }}
                >
                  <div className="flex items-center gap-2 font-mono text-[12px] font-semibold" style={{ color: "var(--term-text)" }}>
                    {KIND_ICON[r.kind] ?? "•"} {r.kind}
                    <StrengthBadge strength={r.strength} />
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wide" style={{ color: "var(--term-text-subtle)" }}>Scored</div>
                      <div className="mt-0.5 font-mono text-[12px] tabular-nums" style={{ color: "var(--term-text-secondary)" }}>{r.total}</div>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wide" style={{ color: "var(--term-text-subtle)" }}>Hit%</div>
                      <div className={`mt-0.5 font-mono text-[12px] font-semibold tabular-nums ${rate >= 0.5 ? "text-emerald-600" : "text-red-500"}`}>{(rate * 100).toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wide" style={{ color: "var(--term-text-subtle)" }}>Avg24h</div>
                      <div className={`mt-0.5 font-mono text-[12px] font-semibold tabular-nums ${r.avg_change_24h >= 0 ? "text-emerald-600" : "text-red-500"}`}>{r.avg_change_24h >= 0 ? "+" : ""}{r.avg_change_24h}%</div>
                    </div>
                  </div>
                  <span className="mt-2 block h-1.5 overflow-hidden rounded-full" style={{ background: "var(--term-surface-3)" }}>
                    <span className={`block h-full rounded-full ${rate >= 0.5 ? "bg-emerald-500" : "bg-red-400"}`} style={{ width: `${rate * 100}%` }} />
                  </span>
                </div>
              );
            })}
            <div className="hidden sm:block">
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
                  <TermRow key={`${r.kind}-${r.strength}`} grid={STATS_GRID}>
                    <span className="flex min-w-0 items-center gap-2 font-mono text-[12px] font-semibold" style={{ color: "var(--term-text)" }}>
                      {KIND_ICON[r.kind] ?? "•"} {r.kind}
                      <StrengthBadge strength={r.strength} />
                    </span>
                    <TermNum>{r.total}</TermNum>
                    <TermNum className={rate >= 0.5 ? "font-bold text-emerald-600" : "font-bold text-red-500"}>{(rate * 100).toFixed(0)}%</TermNum>
                    <TermNum className={r.avg_change_24h >= 0 ? "text-emerald-600" : "text-red-500"}>{r.avg_change_24h >= 0 ? "+" : ""}{r.avg_change_24h}%</TermNum>
                    <span>
                      <span className="block h-1.5 overflow-hidden rounded-full" style={{ background: "var(--term-surface-3)" }}>
                        <span className={`block h-full rounded-full ${rate >= 0.5 ? "bg-emerald-500" : "bg-red-400"}`} style={{ width: `${rate * 100}%` }} />
                      </span>
                    </span>
                  </TermRow>
                );
              })}
            </div>
          </Card>

          <p className="mt-3 text-[11px]" style={{ color: "var(--term-text-subtle)" }}>
            Signals fire automatically from live data and are written to an append-only log before outcomes are known.
            Resolution uses the ezpulse snapshot closest to +24h after the signal (fallback: live price at cron time).
            Hit = direction called correctly. BULLISH · price up · BEARISH · price down. Not investment advice.
          </p>
        </>
      )}
    </>
  );
}
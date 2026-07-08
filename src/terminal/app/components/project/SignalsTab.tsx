import { useEffect, useMemo, useState } from "react";
import { formatRelativeTime } from "../../../../lib/utils";
import { Stat } from "../../../components";
import {
  backendReady,
  fetchFounderSignals,
  fetchPendingSignals,
  type PendingSignal,
  type ResolvedSignal,
} from "../../../backend";
import { signalOccurredAt, tokenSignalBias, tokenSignals, type LiveLaunch } from "../../../kickstart";
import { BiasHero } from "../BiasHero";

type DisplaySignal = {
  key: string;
  kind: string;
  strength: string;
  detail: string;
  occurredAt: number;
  live?: boolean;
};

function strengthClass(strength: string): string {
  if (strength === "BULLISH" || strength === "STRONG") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (strength === "BEARISH") return "bg-red-100 text-red-700";
  return "bg-zinc-100 text-zinc-600";
}

export function SignalsTab({
  token,
  feed,
  feedUpdatedAt,
}: {
  token: LiveLaunch;
  feed: LiveLaunch[];
  feedUpdatedAt?: number | null;
}) {
  const [archived, setArchived] = useState<(PendingSignal | ResolvedSignal)[]>([]);

  useEffect(() => {
    if (!backendReady) {
      setArchived([]);
      return;
    }
    let alive = true;
    void Promise.all([
      fetchPendingSignals(60),
      fetchFounderSignals([token.ca], 30),
    ]).then(([pending, resolved]) => {
      if (!alive) return;
      const forToken = (pending ?? []).filter((r) => r.ca === token.ca);
      const merged = [...forToken, ...(resolved ?? [])];
      setArchived(merged);
    });
    return () => {
      alive = false;
    };
  }, [token.ca]);

  const bias = tokenSignalBias(token, feed);

  const sortedSignals = useMemo(() => {
    const live: DisplaySignal[] = tokenSignals(token, feed).map((s, i) => ({
      key: `live-${s.kind}-${s.strength}-${i}`,
      kind: s.kind,
      strength: s.strength,
      detail: s.detail,
      occurredAt: signalOccurredAt(token, s.kind, { title: s.title, feedUpdatedAt: feedUpdatedAt ?? undefined }),
      live: true,
    }));
    const stored: DisplaySignal[] = archived.map((s) => ({
      key: `archived-${"id" in s ? s.id : s.ts}-${s.kind}`,
      kind: s.kind,
      strength: s.strength,
      detail: s.title,
      occurredAt: new Date(s.ts).getTime(),
    }));
    return [...live, ...stored].sort((a, b) => b.occurredAt - a.occurredAt);
  }, [token, feed, archived, feedUpdatedAt]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <BiasHero label="Signal bias" bias={bias} />
        <Stat label="Active Signals" value={sortedSignals.length.toString()} />
        <Stat label="Data Source" value="Live" sub="DexScreener + Jupiter" />
      </div>

      <div className="space-y-4">
        {sortedSignals.length > 0 ? (
          sortedSignals.map((signal) => (
            <div key={signal.key} className="term-card p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${strengthClass(signal.strength)}`}>
                    {signal.strength}
                  </span>
                  <span className="text-sm font-medium" style={{ color: "var(--term-text-secondary)" }}>{signal.kind}</span>
                  {signal.live && (
                    <span className="rounded px-2 py-0.5 font-mono text-[10px]" style={{ background: "color-mix(in srgb, #10b981 12%, var(--term-surface))", color: "#059669" }}>
                      Live
                    </span>
                  )}
                </div>
                <span className="term-signal-time shrink-0" title={new Date(signal.occurredAt).toLocaleString()}>
                  {formatRelativeTime(signal.occurredAt)}
                </span>
              </div>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--term-text-secondary)" }}>{signal.detail || "No additional details"}</p>
            </div>
          ))
        ) : (
          <div className="py-8 text-center" style={{ color: "var(--term-text-muted)" }}>No strong signals right now.</div>
        )}
      </div>
    </div>
  );
}
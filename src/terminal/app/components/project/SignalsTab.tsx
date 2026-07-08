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
import { tokenSignalBias, tokenSignals, type LiveLaunch } from "../../../kickstart";

type DisplaySignal = {
  key: string;
  kind: string;
  strength: string;
  detail: string;
  created_at: string;
  live?: boolean;
};

function strengthClass(strength: string): string {
  if (strength === "BULLISH" || strength === "STRONG") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (strength === "BEARISH") return "bg-red-100 text-red-700";
  return "bg-zinc-100 text-zinc-600";
}

export function SignalsTab({ token, feed }: { token: LiveLaunch; feed: LiveLaunch[] }) {
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
  const biasBg =
    bias.label === "BULLISH" ? "bg-emerald-600" : bias.label === "BEARISH" ? "bg-red-500" : "bg-zinc-800";

  const sortedSignals = useMemo(() => {
    const now = new Date().toISOString();
    const live: DisplaySignal[] = tokenSignals(token, feed).map((s, i) => ({
      key: `live-${s.kind}-${s.strength}-${i}`,
      kind: s.kind,
      strength: s.strength,
      detail: s.detail,
      created_at: now,
      live: true,
    }));
    const stored: DisplaySignal[] = archived.map((s) => ({
      key: `archived-${"id" in s ? s.id : s.ts}-${s.kind}`,
      kind: s.kind,
      strength: s.strength,
      detail: s.title,
      created_at: s.ts,
    }));
    return [...live, ...stored].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [token, feed, archived]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className={`rounded-2xl p-6 text-white ${biasBg}`}>
          <div className="text-sm opacity-75">Signal Bias</div>
          <div className="mt-2 text-4xl font-semibold">{bias.label}</div>
          <div className="mt-1 text-xs opacity-75">
            {bias.bulls} bullish · {bias.bears} bearish · score {bias.score}/100
          </div>
        </div>
        <Stat label="Active Signals" value={sortedSignals.length.toString()} />
        <Stat label="Data Source" value="Live" sub="DexScreener + Jupiter" />
      </div>

      <div className="space-y-4">
        {sortedSignals.length > 0 ? (
          sortedSignals.map((signal) => (
            <div key={signal.key} className="rounded-2xl border border-zinc-200 p-6">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${strengthClass(signal.strength)}`}>
                    {signal.strength}
                  </span>
                  <span className="text-sm font-medium">{signal.kind}</span>
                  {signal.live && (
                    <span className="rounded bg-emerald-50 px-2 py-0.5 font-mono text-[10px] text-emerald-600">
                      Live
                    </span>
                  )}
                </div>
                <span
                  className="text-xs text-zinc-400"
                  title={new Date(signal.created_at).toLocaleString()}
                >
                  {formatRelativeTime(signal.created_at)}
                </span>
              </div>
              <p className="text-zinc-700">{signal.detail || "No additional details"}</p>
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-zinc-500">No strong signals right now.</div>
        )}
      </div>
    </div>
  );
}
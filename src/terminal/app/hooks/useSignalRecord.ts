import { useCallback, useEffect, useState } from "react";
import {
  fetchSignalAccuracy,
  fetchResolvedSignals,
  fetchPendingSignals,
  fetchAccuracyByKind,
  backendReady,
  type AccuracyRow,
  type ResolvedSignal,
  type PendingSignal,
} from "../../backend";

export type SignalRecordData = {
  ready: boolean;
  loading: boolean;
  accuracy: AccuracyRow[] | null;
  resolved: ResolvedSignal[] | null;
  pending: PendingSignal[] | null;
  byKind: Record<string, { total: number; hits: number; rate: number }> | null;
  refresh: () => void;
};

export function useSignalRecord(): SignalRecordData {
  const [loading, setLoading] = useState(true);
  const [accuracy, setAccuracy] = useState<AccuracyRow[] | null>(null);
  const [resolved, setResolved] = useState<ResolvedSignal[] | null>(null);
  const [pending, setPending] = useState<PendingSignal[] | null>(null);
  const [byKind, setByKind] = useState<Record<string, { total: number; hits: number; rate: number }> | null>(null);

  const load = useCallback(() => {
    if (!backendReady) {
      setLoading(false);
      setAccuracy(null);
      setResolved(null);
      setPending(null);
      setByKind(null);
      return;
    }
    setLoading(true);
    Promise.all([
      fetchSignalAccuracy(),
      fetchResolvedSignals(30),
      fetchPendingSignals(40),
      fetchAccuracyByKind(),
    ]).then(([a, r, p, k]) => {
      setAccuracy(a);
      setResolved(r);
      setPending(p);
      setByKind(k);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  return { ready: backendReady, loading, accuracy, resolved, pending, byKind, refresh: load };
}

/** Ms until a pending signal's +24h resolution checkpoint. */
export function resolvesInMs(ts: string): number {
  return Math.max(0, Date.parse(ts) + 24 * 3600_000 - Date.now());
}

export function formatResolvesIn(ms: number): string {
  if (ms <= 0) return "scoring soon";
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
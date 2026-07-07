import { useCallback, useEffect, useMemo, useState } from "react";
import type { LiveLaunch } from "../../kickstart";
import { fetchWhaleTransactions, whaleAlertTokens, type WhaleFlow } from "../../whales";

export function useWhaleAlerts(feed: LiveLaunch[], activeCa?: string | null) {
  const [flows, setFlows] = useState<Map<string, WhaleFlow>>(new Map());
  const [loading, setLoading] = useState(false);

  const alertTokens = useMemo(() => whaleAlertTokens(feed), [feed]);
  const targets = useMemo(
    () => (activeCa ? feed.filter((c) => c.ca === activeCa) : alertTokens.slice(0, 6)),
    [activeCa, feed, alertTokens],
  );
  const targetKey = targets.map((t) => t.ca).join(",");

  const load = useCallback(async () => {
    if (!targets.length) {
      setFlows(new Map());
      return;
    }
    setLoading(true);
    const results = await Promise.all(targets.map((t) => fetchWhaleTransactions(t)));
    const map = new Map<string, WhaleFlow>();
    for (const f of results) map.set(f.token.ca, f);
    setFlows(map);
    setLoading(false);
  }, [targetKey]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  return { flows, loading, alertTokens, refresh: load };
}
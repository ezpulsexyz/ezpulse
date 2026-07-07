import { useCallback, useEffect, useMemo, useState } from "react";
import type { LiveLaunch } from "../../kickstart";
import { fetchPortfolio } from "../../kickstart";
import { fetchPriceHistory, fetchFounderSignals, backendReady } from "../../backend";
import {
  resolveFounder,
  resolveFounderById,
  founderLaunches,
  computeLaunchPerformance,
  computeFounderMetrics,
  computeForensics,
  buildPublicFeed,
  computeSentiment,
} from "../../founders";
import type { ResolvedSignal } from "../../backend";
import type { LaunchPerformance } from "../../founders";
import type { FounderProfile } from "../types";

type FounderLookup = { founderId?: string; token?: LiveLaunch | null };

function resolveLookup({ founderId, token }: FounderLookup, feed: LiveLaunch[]) {
  if (founderId) {
    const founder = resolveFounderById(founderId, feed);
    if (!founder) return null;
    const launches = founderLaunches(founder, feed);
    const primaryToken = launches[0] ?? feed.find((c) => founder.tokens.includes(c.ca)) ?? token ?? null;
    return { founder, launches, primaryToken, id: founder.wallet };
  }
  if (!token) return null;
  const founder = resolveFounder(token);
  const launches = founderLaunches(founder, feed);
  return { founder, launches, primaryToken: token, id: founder.wallet };
}

export function useFounderData(
  feed: LiveLaunch[],
  options?: FounderLookup,
): FounderProfile | null {
  const [loading, setLoading] = useState(true);
  const [performances, setPerformances] = useState<LaunchPerformance[]>([]);
  const [signals, setSignals] = useState<ResolvedSignal[] | null>(null);
  const [devHoldingsUsd, setDevHoldingsUsd] = useState<number | null>(null);

  const founderId = options?.founderId;
  const token = options?.token ?? null;

  const resolved = useMemo(
    () => resolveLookup({ founderId, token }, feed),
    [founderId, token?.ca, feed],
  );

  const tokenCas = resolved?.founder.tokens.join(",") ?? "";

  const load = useCallback(async () => {
    if (!resolved) return;
    setLoading(true);

    const { founder, launches } = resolved;
    const [histories, founderSigs, portfolio] = await Promise.all([
      Promise.all(launches.map((c) => fetchPriceHistory(c.ca, 720))),
      backendReady ? fetchFounderSignals(founder.tokens, 30) : Promise.resolve(null),
      fetchPortfolio(founder.wallet, feed).catch(() => null),
    ]);

    setPerformances(launches.map((c, i) => computeLaunchPerformance(c, histories[i])));
    setSignals(founderSigs);
    setDevHoldingsUsd(
      portfolio ? portfolio.holdings.reduce((s, h) => s + h.valueUsd, 0) : null,
    );
    setLoading(false);
  }, [resolved, feed, tokenCas]);

  useEffect(() => {
    load();
  }, [load]);

  if (!resolved) return null;

  const { founder, launches, primaryToken, id } = resolved;
  const signalHits = signals
    ? { total: signals.length, hits: signals.filter((s) => s.hit).length }
    : null;

  const metrics = computeFounderMetrics(performances, signalHits);
  const forensics = computeForensics(founder, launches, devHoldingsUsd);
  const publicFeed = buildPublicFeed(founder, launches);
  const sentimentToken = primaryToken ?? launches[0];
  const sentiment = sentimentToken
    ? computeSentiment(sentimentToken)
    : { score: 50, label: "NEUTRAL" as const, buyPressure: 50, organicScore: null, xLinked: false, websiteLinked: false, kickstartVerified: false, trend: [50, 50, 50, 50, 50] };

  const totalMcapLaunched = launches.reduce((s, c) => s + (c.mcap || 0), 0);
  const successRate = metrics.launchCount > 0
    ? Math.round((metrics.graduatedCount / metrics.launchCount) * 100)
    : 0;

  return {
    id,
    founder,
    primaryToken,
    launches,
    performances,
    metrics,
    forensics,
    publicFeed,
    sentiment,
    signals,
    totalMcapLaunched,
    successRate,
    loading,
    refresh: load,
  };
}

/** @deprecated use useFounderData */
export function useFounderProfile(token: LiveLaunch | null, feed: LiveLaunch[]) {
  return useFounderData(feed, { token });
}
import { useCallback, useEffect, useMemo, useState } from "react";
import type { LiveLaunch } from "../../kickstart";
import { fetchPortfolio } from "../../kickstart";
import { fetchPriceHistory, fetchFounderSignals, backendReady } from "../../backend";
import {
  resolveFounder,
  founderLaunches,
  computeLaunchPerformance,
  computeFounderMetrics,
  computeForensics,
  buildPublicFeed,
  computeSentiment,
  type FounderRegistryEntry,
  type LaunchPerformance,
  type FounderMetrics,
  type ForensicsReport,
  type FounderPost,
  type SentimentSnapshot,
} from "../../founders";
import type { ResolvedSignal } from "../../backend";

export type FounderProfileData = {
  loading: boolean;
  founder: FounderRegistryEntry;
  launches: LiveLaunch[];
  performances: LaunchPerformance[];
  metrics: FounderMetrics;
  forensics: ForensicsReport;
  feed: FounderPost[];
  sentiment: SentimentSnapshot;
  signals: ResolvedSignal[] | null;
  refresh: () => void;
};

export function useFounderProfile(token: LiveLaunch | null, feed: LiveLaunch[]): FounderProfileData | null {
  const [loading, setLoading] = useState(true);
  const [performances, setPerformances] = useState<LaunchPerformance[]>([]);
  const [signals, setSignals] = useState<ResolvedSignal[] | null>(null);
  const [devHoldingsUsd, setDevHoldingsUsd] = useState<number | null>(null);

  const founder = token ? resolveFounder(token) : null;
  const launches = useMemo(
    () => (founder ? founderLaunches(founder, feed) : []),
    [founder, feed],
  );
  const tokenCas = founder?.tokens.join(",") ?? "";

  const load = useCallback(async () => {
    if (!founder || !token) return;
    setLoading(true);

    const [histories, founderSigs, portfolio] = await Promise.all([
      Promise.all(launches.map((c) => fetchPriceHistory(c.ca, 720))),
      backendReady ? fetchFounderSignals(founder.tokens, 30) : Promise.resolve(null),
      fetchPortfolio(founder.wallet, feed).catch(() => null),
    ]);

    const perfs = launches.map((c, i) => computeLaunchPerformance(c, histories[i]));
    setPerformances(perfs);
    setSignals(founderSigs);

    const devUsd = portfolio
      ? portfolio.holdings.reduce((s, h) => s + h.valueUsd, 0)
      : null;
    setDevHoldingsUsd(devUsd);
    setLoading(false);
  }, [founder, token, feed, launches, tokenCas]);

  useEffect(() => {
    load();
  }, [load]);

  if (!token || !founder) return null;

  const signalHits = signals
    ? { total: signals.length, hits: signals.filter((s) => s.hit).length }
    : null;

  const metrics = computeFounderMetrics(performances, signalHits);
  const forensics = computeForensics(founder, launches, devHoldingsUsd);
  const feedPosts = buildPublicFeed(founder, launches);
  const sentiment = computeSentiment(token);

  return {
    loading,
    founder,
    launches,
    performances,
    metrics,
    forensics,
    feed: feedPosts,
    sentiment,
    signals,
    refresh: load,
  };
}
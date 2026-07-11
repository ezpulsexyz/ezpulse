import { useEffect, useState } from "react";
import { useTerminalContext } from "../TerminalContext";
import { syncVote, fetchVoteCounts } from "../../backend";

interface Feature {
  id: string;
  title: string;
  description: string;
  category: string;
  status: "done" | "in-progress" | "planned";
}

const FEATURES: Feature[] = [
  {
    id: "realtime-prices",
    title: "Real-time Price Feeds",
    description: "Live price updates via DexScreener WebSocket across the entire terminal.",
    category: "Terminal",
    status: "done",
  },
  {
    id: "price-alerts",
    title: "Price Threshold Alerts",
    description: "Set custom alerts when tokens hit your target prices (above or below).",
    category: "Alerts",
    status: "done",
  },
  {
    id: "notifications-v2",
    title: "Improved Notifications Center",
    description: "Better grouping, mobile support, and unified signal + price alert notifications.",
    category: "Alerts",
    status: "done",
  },
  {
    id: "portfolio-pnl",
    title: "Portfolio P&L Tracking",
    description: "Track cost basis, realized/unrealized P&L, and performance over time.",
    category: "Portfolio",
    status: "planned",
  },
  {
    id: "multi-wallet",
    title: "Multi-Wallet Support",
    description: "Connect and switch between multiple wallets with unified holdings view.",
    category: "Terminal",
    status: "planned",
  },
  {
    id: "alert-history",
    title: "Alert History & Management",
    description: "View past triggered alerts and manage active price alerts easily.",
    category: "Alerts",
    status: "planned",
  },
  {
    id: "whale-alerts",
    title: "Whale Movement Alerts",
    description: "Get notified on large on-chain movements for tokens in your watchlist.",
    category: "Alerts",
    status: "planned",
  },
  {
    id: "thesis-voting",
    title: "Thesis Voting & Reputation",
    description: "Upvote/downvote theses and build reputation in the community.",
    category: "Community",
    status: "planned",
  },
];

export function FeatureBoard() {
  const { wallet } = useTerminalContext();
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadVotes = async () => {
    setLoading(true);
    const counts = await fetchVoteCounts();
    if (counts) {
      const map: Record<string, number> = {};
      counts.forEach((row: any) => {
        map[row.feature_id] = row.vote_count;
      });
      setVotes(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadVotes();
  }, []);

  const handleVote = async (featureId: string) => {
    if (!wallet) {
      alert("Connect your wallet to vote");
      return;
    }

    // Optimistic update
    const alreadyVoted = userVotes.has(featureId);
    const newVotes = { ...votes };

    if (alreadyVoted) {
      newVotes[featureId] = Math.max(0, (newVotes[featureId] || 1) - 1);
      const newUserVotes = new Set(userVotes);
      newUserVotes.delete(featureId);
      setUserVotes(newUserVotes);
    } else {
      newVotes[featureId] = (newVotes[featureId] || 0) + 1;
      const newUserVotes = new Set(userVotes);
      newUserVotes.add(featureId);
      setUserVotes(newUserVotes);
    }

    setVotes(newVotes);

    // Sync with backend
    await syncVote(featureId, wallet);
    await loadVotes(); // refresh accurate counts
  };

  const getStatusBadge = (status: Feature["status"]) => {
    if (status === "done") return <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">Shipped in V2</span>;
    if (status === "in-progress") return <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600">In Progress</span>;
    return <span className="rounded bg-zinc-500/10 px-2 py-0.5 text-[10px] font-medium text-zinc-600">Planned</span>;
  };

  const sortedFeatures = [...FEATURES].sort((a, b) => {
    const aVotes = votes[a.id] || 0;
    const bVotes = votes[b.id] || 0;
    return bVotes - aVotes;
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Feature Board</h1>
        <p className="mt-1 text-sm text-zinc-500">Vote on what matters to you. Your votes help shape the roadmap.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sortedFeatures.map((feature) => {
          const voteCount = votes[feature.id] || 0;
          const hasVoted = userVotes.has(feature.id);

          return (
            <div
              key={feature.id}
              className="group rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg tracking-tight">{feature.title}</h3>
                    {getStatusBadge(feature.status)}
                  </div>
                  <p className="mt-2 text-sm leading-snug text-zinc-600 dark:text-zinc-400">
                    {feature.description}
                  </p>
                  <div className="mt-3 text-[10px] text-zinc-400">{feature.category}</div>
                </div>

                <button
                  onClick={() => handleVote(feature.id)}
                  disabled={!wallet}
                  className={`flex flex-col items-center justify-center rounded-xl border px-4 py-2 text-center transition active:scale-[0.985] ${hasVoted
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800"}
                  `}
                >
                  <div className="text-xl font-bold tabular-nums">{voteCount}</div>
                  <div className="text-[10px] font-medium tracking-wider">{hasVoted ? "VOTED" : "VOTE"}</div>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {!wallet && (
        <p className="mt-6 text-center text-xs text-zinc-400">Connect your wallet to vote on features.</p>
      )}
    </div>
  );
}

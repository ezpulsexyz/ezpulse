import { useCallback, useEffect, useState } from "react";
import Toast, { type ToastState } from "./Toast";
import {
  backendReady,
  getThesesForToken,
  getUserUpvotedTheses,
  upvoteThesis,
  type SavedInvestorThesis,
} from "../backend";
import { loadInvestorTheses, localPostToSaved } from "../investorThesis";

type Verdict = "All" | "Bullish" | "Bearish" | "Neutral";

interface ThesesListProps {
  tokenCa: string;
  currentWallet?: string | null;
  /** Bump to re-fetch after a new thesis is posted */
  refreshKey?: number;
  onCountChange?: (count: number) => void;
}

function normalizeThesis(thesis: SavedInvestorThesis): SavedInvestorThesis {
  return {
    ...thesis,
    key_points: Array.isArray(thesis.key_points) ? thesis.key_points : [],
    upvotes: thesis.upvotes ?? 0,
  };
}

export default function ThesesList({
  tokenCa,
  currentWallet,
  refreshKey = 0,
  onCountChange,
}: ThesesListProps) {
  const [theses, setTheses] = useState<SavedInvestorThesis[]>([]);
  const [filter, setFilter] = useState<Verdict>("All");
  const [loading, setLoading] = useState(true);
  const [userUpvotes, setUserUpvotes] = useState<string[]>([]);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadTheses = useCallback(async () => {
    setLoading(true);
    const data = backendReady
      ? await getThesesForToken(tokenCa)
      : loadInvestorTheses(tokenCa).map(localPostToSaved);
    const normalized = data.map(normalizeThesis);
    setTheses(normalized);
    onCountChange?.(normalized.length);
    setLoading(false);
  }, [tokenCa, onCountChange]);

  useEffect(() => {
    void loadTheses();
  }, [loadTheses, refreshKey]);

  useEffect(() => {
    if (!currentWallet || !backendReady) {
      setUserUpvotes([]);
      return;
    }

    let alive = true;
    void getUserUpvotedTheses(currentWallet).then((ids) => {
      if (alive) setUserUpvotes(ids);
    });
    return () => {
      alive = false;
    };
  }, [currentWallet, refreshKey]);

  const filteredTheses =
    filter === "All" ? theses : theses.filter((t) => t.verdict === filter);

  const handleUpvote = async (thesisId: string) => {
    if (!backendReady) {
      setToast({ type: "error", message: "Upvoting requires Supabase to be configured." });
      return;
    }
    if (!currentWallet) {
      setToast({ type: "error", message: "Connect your wallet to upvote" });
      return;
    }
    if (userUpvotes.includes(thesisId)) return;

    setToast(null);
    const success = await upvoteThesis(thesisId, currentWallet);
    if (success) {
      setUserUpvotes((prev) => [...prev, thesisId]);
      setTheses((prev) =>
        prev.map((t) =>
          t.id === thesisId ? { ...t, upvotes: (t.upvotes ?? 0) + 1 } : t,
        ),
      );
    } else {
      setToast({
        type: "error",
        message: "Could not register your upvote. You may have already voted.",
      });
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-zinc-400">Loading theses...</div>;
  }

  if (theses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center">
        <p className="text-zinc-500">No theses posted yet for this token.</p>
        <p className="mt-1 text-sm text-zinc-400">Be the first to share your analysis.</p>
      </div>
    );
  }

  return (
    <>
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {(["All", "Bullish", "Bearish", "Neutral"] as Verdict[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setFilter(v)}
            className={`rounded-2xl px-5 py-2 text-sm font-medium transition ${
              filter === v ? "bg-blue-600 text-white" : "bg-zinc-100 hover:bg-zinc-200"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {filteredTheses.length === 0 && (
        <div className="py-10 text-center text-zinc-500">No theses found for this filter.</div>
      )}

      <div className="space-y-6">
        {filteredTheses.map((thesis) => {
          const keyPoints = Array.isArray(thesis.key_points) ? thesis.key_points : [];
          const hasUpvoted = userUpvotes.includes(thesis.id);

          return (
            <div key={thesis.id} className="rounded-3xl border border-zinc-200 p-6">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      thesis.verdict === "Bullish"
                        ? "bg-emerald-100 text-emerald-700"
                        : thesis.verdict === "Bearish"
                          ? "bg-red-100 text-red-700"
                          : "bg-zinc-200 text-zinc-600"
                    }`}
                  >
                    {thesis.verdict}
                  </span>
                  <span className="font-mono text-xs text-zinc-500">
                    {thesis.wallet_address.slice(0, 4)}...{thesis.wallet_address.slice(-4)}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {new Date(thesis.created_at).toLocaleDateString()}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => void handleUpvote(thesis.id)}
                  disabled={!backendReady || hasUpvoted}
                  className={`flex items-center gap-1.5 rounded-2xl px-4 py-1.5 text-sm transition ${
                    hasUpvoted
                      ? "cursor-default bg-blue-50 text-blue-700"
                      : "bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50"
                  }`}
                >
                  ↑ <span className="font-mono">{thesis.upvotes ?? 0}</span>
                </button>
              </div>

              <p className="mb-4 leading-relaxed text-zinc-700">{thesis.content}</p>

              {keyPoints.length > 0 && (
                <div className="mt-3">
                  <div className="mb-2 text-xs uppercase tracking-widest text-zinc-400">Key points</div>
                  <ul className="space-y-1 text-sm text-zinc-600">
                    {keyPoints.map((point, i) => (
                      <li key={i}>• {point}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
    {toast && (
      <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
    )}
    </>
  );
}
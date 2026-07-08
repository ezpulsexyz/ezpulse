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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userUpvotes, setUserUpvotes] = useState<string[]>([]);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadTheses = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const data = backendReady
          ? await getThesesForToken(tokenCa)
          : loadInvestorTheses(tokenCa).map(localPostToSaved);
        const normalized = data.map(normalizeThesis);
        setTheses(normalized);
        onCountChange?.(normalized.length);
      } catch (error) {
        console.error("Failed to load theses:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tokenCa, onCountChange],
  );

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
    return (
      <div className="py-12 text-center text-zinc-400">
        Loading theses...
      </div>
    );
  }

  return (
    <>
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-zinc-500">
            {theses.length} {theses.length === 1 ? "thesis" : "theses"}
          </div>
          <button
            type="button"
            onClick={() => void loadTheses(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-xl bg-zinc-100 px-3 py-1.5 text-xs transition hover:bg-zinc-200 active:bg-zinc-300 disabled:opacity-50"
          >
            {refreshing ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>

        {theses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center">
            <p className="text-zinc-500">No theses posted yet for this token.</p>
            <p className="mt-1 text-sm text-zinc-400">Be the first to share your analysis.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {theses.map((thesis) => {
              const hasUpvoted = userUpvotes.includes(thesis.id);

              return (
                <div key={thesis.id} className="rounded-3xl border border-zinc-200 p-5 lg:p-6">
                  <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
                    </div>

                    <div className="flex items-center gap-3 text-xs text-zinc-400">
                      <span>{new Date(thesis.created_at).toLocaleDateString()}</span>
                      <button
                        type="button"
                        onClick={() => void handleUpvote(thesis.id)}
                        disabled={!backendReady || hasUpvoted}
                        className={`flex items-center gap-1 rounded-xl px-3 py-1 transition ${
                          hasUpvoted
                            ? "cursor-default bg-blue-50 text-blue-700"
                            : "bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 disabled:opacity-50"
                        }`}
                      >
                        ↑ {thesis.upvotes ?? 0}
                      </button>
                    </div>
                  </div>

                  <p className="thesis-content mb-3 text-[15px] leading-relaxed text-zinc-700">
                    {thesis.content}
                  </p>

                  {thesis.key_points?.length > 0 && (
                    <div className="mt-3">
                      <div className="mb-2 text-xs uppercase tracking-widest text-zinc-400">
                        Key Points
                      </div>
                      <ul className="space-y-1 pl-1 text-sm text-zinc-600">
                        {thesis.key_points.map((point, index) => (
                          <li key={index}>• {point}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {toast && (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      )}
    </>
  );
}
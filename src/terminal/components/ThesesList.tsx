import { useCallback, useEffect, useState } from "react";
import { formatRelativeTime } from "../../lib/utils";
import Toast, { type ToastState } from "./Toast";
import {
  backendReady,
  getThesesForToken,
  getThesisVoterId,
  getUserUpvotedTheses,
  loadLocalThesisUpvotes,
  saveLocalThesisUpvote,
  upvoteThesis,
  type SavedInvestorThesis,
} from "../backend";
import { loadInvestorTheses, localPostToSaved, REFRESH_THESES_EVENT } from "../investorThesis";

interface ThesesListProps {
  tokenCa: string;
  currentWallet?: string | null;
  refreshKey?: number;
  onCountChange?: (count: number) => void;
  onQuote?: (thesis: { content: string; verdict: string }) => void;
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
  onQuote,
}: ThesesListProps) {
  const [theses, setTheses] = useState<SavedInvestorThesis[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userUpvotes, setUserUpvotes] = useState<string[]>([]);
  const [toast, setToast] = useState<ToastState>(null);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

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
        const normalized = data
          .map(normalizeThesis)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
    const handleRefresh = () => {
      void loadTheses(true);
    };

    window.addEventListener(REFRESH_THESES_EVENT, handleRefresh);
    return () => window.removeEventListener(REFRESH_THESES_EVENT, handleRefresh);
  }, [loadTheses]);

  useEffect(() => {
    const voterId = getThesisVoterId(currentWallet);

    if (!backendReady) {
      setUserUpvotes(loadLocalThesisUpvotes(voterId));
      return;
    }

    let alive = true;
    void getUserUpvotedTheses(currentWallet).then((ids) => {
      if (alive) setUserUpvotes(ids);
    });
    return () => {
      alive = false;
    }
  }, [currentWallet, refreshKey]);

  const handleUpvote = async (thesisId: string) => {
    if (userUpvotes.includes(thesisId)) return;

    setToast(null);
    const voterId = getThesisVoterId(currentWallet);

    if (backendReady) {
      const success = await upvoteThesis(thesisId, currentWallet);
      if (!success) {
        setToast({
          type: "error",
          message: "Could not register your upvote. You may have already voted.",
        });
        return;
      }
    } else {
      saveLocalThesisUpvote(voterId, thesisId);
    }

    setUserUpvotes((prev) => [...prev, thesisId]);
    setTheses((prev) =>
      prev.map((t) =>
        t.id === thesisId ? { ...t, upvotes: (t.upvotes ?? 0) + 1 } : t,
      ),
    );
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleQuoteClick = (thesis: SavedInvestorThesis) => {
    if (onQuote) {
      onQuote({
        content: thesis.content,
        verdict: thesis.verdict,
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
          /* Improved Empty State with templates */
          <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center">
            <p className="text-lg font-semibold text-zinc-700">No theses yet for this token.</p>
            <p className="mt-1 text-sm text-zinc-500">Be the first to share your analysis.</p>

            <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
              {[
                { verdict: "Bullish", text: "Strong founder execution + clean tokenomics. Low FDV relative to traction. Watching for volume confirmation." },
                { verdict: "Bearish", text: "High concentration in top wallets. Limited on-chain activity. Need clearer catalysts before committing." }
              ].map((example, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (onQuote) {
                      onQuote({ content: example.text, verdict: example.verdict });
                    }
                  }}
                  className="rounded-xl border border-zinc-200 bg-white p-4 text-left text-sm hover:border-zinc-300 active:bg-zinc-50"
                >
                  <div className={`mb-1 inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                    example.verdict === "Bullish" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                  }`}>
                    {example.verdict}
                  </div>
                  <p className="text-zinc-600">{example.text}</p>
                  <div className="mt-2 text-[10px] text-indigo-600">Use as template →</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {theses.map((thesis) => {
              const hasUpvoted = userUpvotes.includes(thesis.id);
              const isExpanded = expandedIds.includes(thesis.id);
              const isLong = thesis.content.length > 280;

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

                    <div className="flex items-center gap-3">
                      <span
                        className="text-xs text-zinc-400"
                        title={new Date(thesis.created_at).toLocaleString()}
                      >
                        {formatRelativeTime(thesis.created_at)}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleUpvote(thesis.id)}
                        disabled={hasUpvoted}
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
                    {isExpanded || !isLong ? thesis.content : thesis.content.slice(0, 280) + "..."}
                    {isLong && (
                      <button
                        onClick={() => toggleExpanded(thesis.id)}
                        className="ml-1 text-[12px] font-semibold text-indigo-600 hover:underline"
                      >
                        {isExpanded ? "Show less" : "Read more"}
                      </button>
                    )}
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

                  {/* Quote button for backend theses */}
                  {onQuote && (
                    <div className="mt-4 border-t border-zinc-100 pt-3">
                      <button
                        onClick={() => handleQuoteClick(thesis)}
                        className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-700"
                      >
                        Quote this thesis
                      </button>
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

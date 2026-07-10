import { useCallback, useEffect, useState } from "react";
import { BLUE, Card } from "../../components";
import Toast, { type ToastState } from "../../components/Toast";
import WalletGate from "../../components/WalletGate";
import ThesisEditorModal, { type ThesisEditorSubmission } from "../../components/ThesisEditorModal";
import ThesesList from "../../components/ThesesList";
import { useWallet } from "../../hooks/useWallet";
import { backendReady } from "../../backend";
import type { LiveLaunch } from "../../kickstart";
import {
  addInvestorThesisComment,
  formatTokenAmount,
  loadInvestorTheses,
  persistInvestorThesis,
  refreshThesesList,
  shortWallet,
  type InvestorThesisPost,
  type ThesisVerdict,
} from "../../investorThesis";

function verdictStyle(v: ThesisVerdict): string {
  if (v === "BULL") return "bg-emerald-100 text-emerald-700";
  if (v === "BEAR") return "bg-red-100 text-red-700";
  return "bg-zinc-100 text-zinc-600";
}

function HolderBadge({
  symbol,
  holdingAmount,
}: {
  symbol: string;
  holdingAmount: number;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
      <span className="text-emerald-600">✓</span> Holding · {formatTokenAmount(holdingAmount)} ${symbol}
    </span>
  );
}

// Richer Post Card with expand + quote
function RichPostCard({
  post,
  token,
  wallet,
  hasHolding,
  onComment,
  onQuote,
}: {
  post: InvestorThesisPost;
  token: LiveLaunch;
  wallet: string | null;
  hasHolding: boolean;
  onComment: (postId: string, body: string) => void;
  onQuote: (post: InvestorThesisPost) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const isOwn = wallet === post.wallet;
  const isLong = post.body.length > 220;

  const submitComment = () => {
    const body = commentBody.trim();
    if (!body || !wallet) return;
    onComment(post.id, body);
    setCommentBody("");
    setCommentOpen(false);
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-widest ${verdictStyle(post.verdict)}`}>
          {post.verdict}
        </span>
        <span className="font-mono text-[11px] text-zinc-400">{shortWallet(post.wallet)}</span>
        {post.holdingVerified && post.holdingAmount !== null && (
          <HolderBadge symbol={token.symbol} holdingAmount={post.holdingAmount} />
        )}
        {isOwn && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-bold text-indigo-600">you</span>}
        <span className="ml-auto text-[10px] text-zinc-400">
          {new Date(post.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </span>
      </div>

      <div className="mt-3 text-[14px] leading-relaxed text-zinc-700">
        {expanded || !isLong ? post.body : post.body.slice(0, 220) + "..."}
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-1 text-[12px] font-semibold text-indigo-600 hover:underline"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3 border-t border-zinc-100 pt-3 text-[11px]">
        {wallet && (
          <button
            onClick={() => setCommentOpen(!commentOpen)}
            className="font-semibold text-indigo-600 hover:text-indigo-800"
          >
            {commentOpen ? "Cancel" : `Comment${post.comments.length ? ` · ${post.comments.length}` : ""}`}
          </button>
        )}
        <button
          onClick={() => onQuote(post)}
          className="font-semibold text-zinc-500 hover:text-zinc-700"
        >
          Quote
        </button>
      </div>

      {post.comments.length > 0 && (
        <div className="mt-3 space-y-2 border-l-2 border-zinc-100 pl-4 text-[13px]">
          {post.comments.map((c) => (
            <div key={c.id}>
              <span className="font-mono text-[10px] text-zinc-400">{shortWallet(c.wallet)}</span>
              <p className="mt-0.5 leading-relaxed text-zinc-600">{c.body}</p>
            </div>
          ))}
        </div>
      )}

      {commentOpen && wallet && (
        <div className="mt-3 space-y-2">
          <textarea
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder="Add your take…"
            rows={2}
            className="w-full resize-none rounded-xl border border-zinc-200 px-3 py-2 text-[13px] outline-none focus:border-indigo-300"
          />
          <button
            onClick={submitComment}
            disabled={!commentBody.trim()}
            className="rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white disabled:opacity-40"
            style={{ background: BLUE }}
          >
            Post comment
          </button>
        </div>
      )}
    </div>
  );
}

export function InvestorThesisPanel({ token }: { token: LiveLaunch }) {
  const { wallet } = useWallet();
  const [showThesisModal, setShowThesisModal] = useState(false);
  const [quoteInitialContent, setQuoteInitialContent] = useState("");
  const [isVerifiedHolder, setIsVerifiedHolder] = useState(false);
  const [holdingBalance, setHoldingBalance] = useState(0);
  const [thesesRefresh, setThesesRefresh] = useState(0);
  const [thesisCount, setThesisCount] = useState(0);
  const [localPosts, setLocalPosts] = useState<InvestorThesisPost[]>([]);
  const [toast, setToast] = useState<ToastState>(null);

  // Sorting & Filtering
  const [sortMode, setSortMode] = useState<"newest" | "discussed" | "verified">("newest");
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const holdingVerified =
    isVerifiedHolder &&
    holdingBalance > 0 &&
    (token.priceUsd <= 0 || holdingBalance * token.priceUsd >= 0.01);

  const refreshLocal = useCallback(() => {
    const posts = loadInvestorTheses(token.ca);
    setLocalPosts(posts);
    setThesisCount(posts.length);
  }, [token.ca]);

  useEffect(() => {
    if (!backendReady) refreshLocal();
  }, [refreshLocal]);

  const submitComment = (postId: string, commentBody: string) => {
    if (!wallet) return;
    addInvestorThesisComment(token.ca, postId, {
      wallet,
      body: commentBody,
      holdingAmount: holdingBalance > 0 ? holdingBalance : null,
      holdingVerified,
    });
    refreshLocal();
  };

  // Quote handler - opens modal with pre-filled quoted content
  const handleQuote = (postOrThesis: any) => {
    let quoted = "";
    if (postOrThesis.body) {
      // Local post
      quoted = `> ${postOrThesis.body.slice(0, 180)}${postOrThesis.body.length > 180 ? "..." : ""}\n\n`;
    } else if (postOrThesis.content) {
      // Backend thesis
      quoted = `> ${postOrThesis.content.slice(0, 180)}${postOrThesis.content.length > 180 ? "..." : ""}\n\n`;
    }
    setQuoteInitialContent(quoted);
    setShowThesisModal(true);
  };

  // Filtered + Sorted posts (local mode)
  const displayedPosts = [...localPosts]
    .filter((p) => !showVerifiedOnly || p.holdingVerified)
    .sort((a, b) => {
      if (sortMode === "newest") {
        return b.createdAt - a.createdAt;
      }
      if (sortMode === "discussed") {
        return b.comments.length - a.comments.length;
      }
      if (sortMode === "verified") {
        return (b.holdingVerified ? 1 : 0) - (a.holdingVerified ? 1 : 0);
      }
      return 0;
    });

  const openPostModal = () => {
    setQuoteInitialContent("");
    setShowThesisModal(true);
  };

  return (
    <>
      <Card
        title="💬 Community Investor Thesis"
        right={
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            Open to all · post with wallet
          </span>
        }
      >
        <div className="space-y-4 px-5 py-4">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3">
            <WalletGate
              tokenCa={token.ca}
              showPostButton={true}
              onPostThesis={openPostModal}
              onHoldingVerified={(holds, balance) => {
                setIsVerifiedHolder(holds);
                setHoldingBalance(balance);
                if (!holds) setShowThesisModal(false);
              }}
            />
          </div>

          <p className="text-[12px] leading-relaxed text-zinc-500">
            Anyone can read community theses. Connect your wallet and hold the token to post — verified
            holders earn a <span className="font-semibold text-emerald-700">✓ Holding</span> badge.
          </p>

          {/* Sorting & Filtering Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-zinc-500">Sort:</span>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as any)}
                className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm font-medium outline-none"
              >
                <option value="newest">Newest first</option>
                <option value="discussed">Most discussed</option>
                <option value="verified">Verified holders first</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-zinc-600">
              <input
                type="checkbox"
                checked={showVerifiedOnly}
                onChange={(e) => setShowVerifiedOnly(e.target.checked)}
                className="accent-emerald-600"
              />
              Verified holders only
            </label>
          </div>

          <div className="mt-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold">Community Theses</h3>
              <span className="text-sm text-zinc-500">{thesisCount} posted</span>
            </div>

            {backendReady ? (
              <ThesesList
                tokenCa={token.ca}
                currentWallet={wallet}
                refreshKey={thesesRefresh}
                onCountChange={setThesisCount}
                onQuote={handleQuote}
              />
            ) : localPosts.length > 0 ? (
              <div className="space-y-3">
                {displayedPosts.map((post) => (
                  <RichPostCard
                    key={post.id}
                    post={post}
                    token={token}
                    wallet={wallet}
                    hasHolding={isVerifiedHolder}
                    onComment={submitComment}
                    onQuote={handleQuote}
                  />
                ))}
              </div>
            ) : (
              /* Improved Empty State with example templates */
              <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center">
                <p className="text-lg font-semibold text-zinc-700">No theses yet for this token.</p>
                <p className="mt-1 text-sm text-zinc-500">Be the first to share your analysis.</p>

                <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
                  {[ 
                    { verdict: "BULL" as const, text: "Strong founder execution + clean tokenomics. Low FDV relative to traction. Watching for volume confirmation." },
                    { verdict: "BEAR" as const, text: "High concentration in top wallets. Limited on-chain activity. Need clearer catalysts before committing." }
                  ].map((example, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setQuoteInitialContent("");
                        setShowThesisModal(true);
                      }}
                      className="rounded-xl border border-zinc-200 bg-white p-4 text-left text-sm hover:border-zinc-300 active:bg-zinc-50"
                    >
                      <div className={`mb-1 inline-block rounded px-2 py-0.5 text-[10px] font-bold ${verdictStyle(example.verdict)}`}>
                        {example.verdict}
                      </div>
                      <p className="text-zinc-600">{example.text}</p>
                      <div className="mt-2 text-[10px] text-indigo-600">Use as template →</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <ThesisEditorModal
          isOpen={showThesisModal}
          onClose={() => {
            setShowThesisModal(false);
            setQuoteInitialContent("");
          }}
          tokenSymbol={token.symbol}
          isVerifiedHolder={isVerifiedHolder}
          onSubmit={async (thesis) => {
            if (!wallet) return;

            setToast(null);

            const result = await persistInvestorThesis({
              tokenCa: token.ca,
              wallet,
              thesis,
              holdingBalance,
              holdingVerified,
            });

            if (result.ok) {
              setShowThesisModal(false);
              setQuoteInitialContent("");
              setToast({ type: "success", message: result.message });
              if (result.remote) {
                setThesesRefresh((k) => k + 1);
                refreshThesesList();
              } else {
                refreshLocal();
              }
            } else {
              setToast({ type: "error", message: result.message });
            }
          }}
        />
      </Card>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </>
  );
}

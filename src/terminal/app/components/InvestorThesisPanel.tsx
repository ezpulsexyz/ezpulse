import { useCallback, useEffect, useState } from "react";
import { BLUE, Card } from "../../components";
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

function LocalPostCard({
  post,
  token,
  wallet,
  hasHolding,
  onComment,
}: {
  post: InvestorThesisPost;
  token: LiveLaunch;
  wallet: string | null;
  hasHolding: boolean;
  onComment: (postId: string, body: string) => void;
}) {
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const isOwn = wallet === post.wallet;

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
        {isOwn && (
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-bold text-indigo-600">you</span>
        )}
        <span className="ml-auto text-[10px] text-zinc-400">
          {new Date(post.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </span>
      </div>
      <p className="mt-3 text-[14px] leading-relaxed text-zinc-700">{post.body}</p>

      {wallet && (
        <div className="mt-4 border-t border-zinc-100 pt-3">
          <button
            type="button"
            onClick={() => setCommentOpen((v) => !v)}
            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
          >
            {commentOpen ? "Cancel" : `Comment${post.comments.length ? ` · ${post.comments.length}` : ""}`}
          </button>
        </div>
      )}

      {post.comments.length > 0 && (
        <div className="mt-3 space-y-2 border-l-2 border-zinc-100 pl-4">
          {post.comments.map((c) => (
            <div key={c.id} className="text-[13px]">
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
            type="button"
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
  const [isVerifiedHolder, setIsVerifiedHolder] = useState(false);
  const [holdingBalance, setHoldingBalance] = useState(0);
  const [thesesRefresh, setThesesRefresh] = useState(0);
  const [thesisCount, setThesisCount] = useState(0);
  const [localPosts, setLocalPosts] = useState<InvestorThesisPost[]>([]);

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

  return (
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
            onPostThesis={() => setShowThesisModal(true)}
            onHoldingVerified={(holds, balance) => {
              setIsVerifiedHolder(holds);
              setHoldingBalance(balance);
              if (!holds) setShowThesisModal(false);
            }}
          />
        </div>

        <p className="text-[12px] leading-relaxed text-zinc-500">
          Anyone can read community theses. Connect your wallet and hold the token to post — verified
          holders earn a <span className="font-semibold text-emerald-700">✓ Holding</span> badge with
          token amount (read-only, never your full wallet).
        </p>

        <div className="mt-10">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-semibold">Community Theses</h3>
            <span className="text-sm text-zinc-500">{thesisCount} posted</span>
          </div>

          {backendReady ? (
            <ThesesList
              tokenCa={token.ca}
              refreshKey={thesesRefresh}
              onCountChange={setThesisCount}
            />
          ) : localPosts.length > 0 ? (
            <div className="space-y-3">
              {localPosts.map((post) => (
                <LocalPostCard
                  key={post.id}
                  post={post}
                  token={token}
                  wallet={wallet}
                  hasHolding={isVerifiedHolder}
                  onComment={submitComment}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center">
              <p className="text-zinc-500">No theses posted yet for this token.</p>
              <p className="mt-1 text-sm text-zinc-400">Be the first to share your analysis.</p>
            </div>
          )}
        </div>
      </div>

      <ThesisEditorModal
        isOpen={showThesisModal}
        onClose={() => setShowThesisModal(false)}
        tokenSymbol={token.symbol}
        isVerifiedHolder={isVerifiedHolder}
        onSubmit={async (thesis) => {
          if (!wallet) return;

          const result = await persistInvestorThesis({
            tokenCa: token.ca,
            wallet,
            thesis,
            holdingBalance,
            holdingVerified,
          });

          alert(result.message);
          if (result.ok) {
            setShowThesisModal(false);
            if (result.remote) {
              setThesesRefresh((k) => k + 1);
            } else {
              refreshLocal();
            }
          }
        }}
      />
    </Card>
  );
}
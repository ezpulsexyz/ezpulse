import { useCallback, useEffect, useState } from "react";
import { BLUE, Card } from "../../components";
import WalletGate from "../../components/WalletGate";
import { useWallet } from "../../hooks/useWallet";
import type { LiveLaunch } from "../../kickstart";
import {
  addInvestorThesisComment,
  addInvestorThesisPost,
  formatTokenAmount,
  loadInvestorTheses,
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

function PostCard({
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
  const canVote = !!wallet && hasHolding;
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

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-3">
        <button
          type="button"
          disabled
          title="Coming soon — verified holders only"
          className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
            canVote
              ? "border border-zinc-200 text-zinc-400"
              : "cursor-not-allowed border border-zinc-100 text-zinc-300"
          }`}
        >
          👍 Convincing {post.convincingVotes > 0 ? `· ${post.convincingVotes}` : ""}
          <span className="ml-1 font-normal normal-case text-zinc-400">(soon)</span>
        </button>
        {wallet ? (
          <button
            type="button"
            onClick={() => setCommentOpen((v) => !v)}
            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
          >
            {commentOpen ? "Cancel" : `Comment${post.comments.length ? ` · ${post.comments.length}` : ""}`}
          </button>
        ) : (
          <span className="text-[11px] text-zinc-400">Connect wallet to comment</span>
        )}
      </div>

      {post.comments.length > 0 && (
        <div className="mt-3 space-y-2 border-l-2 border-zinc-100 pl-4">
          {post.comments.map((c) => (
            <div key={c.id} className="text-[13px]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] text-zinc-400">{shortWallet(c.wallet)}</span>
                {c.holdingVerified && c.holdingAmount !== null && (
                  <HolderBadge symbol={token.symbol} holdingAmount={c.holdingAmount} />
                )}
              </div>
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
  const [hasHolding, setHasHolding] = useState(false);
  const [holdingBalance, setHoldingBalance] = useState(0);
  const [posts, setPosts] = useState<InvestorThesisPost[]>(() => loadInvestorTheses(token.ca));
  const [verdict, setVerdict] = useState<ThesisVerdict>("BULL");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

  const holdingVerified =
    hasHolding &&
    holdingBalance > 0 &&
    (token.priceUsd <= 0 || holdingBalance * token.priceUsd >= 0.01);

  const refresh = useCallback(() => {
    setPosts(loadInvestorTheses(token.ca));
  }, [token.ca]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const submitPost = () => {
    if (!wallet) {
      setError("Connect your wallet to post.");
      return;
    }
    if (!hasHolding) {
      setError("Hold this token to post a thesis.");
      return;
    }
    const text = body.trim();
    if (text.length < 20) {
      setError("Thesis must be at least 20 characters.");
      return;
    }
    addInvestorThesisPost(token.ca, {
      tokenCa: token.ca,
      wallet,
      verdict,
      body: text,
      holdingAmount: holdingBalance > 0 ? holdingBalance : null,
      holdingVerified,
    });
    setBody("");
    setError(null);
    setComposerOpen(false);
    refresh();
  };

  const submitComment = (postId: string, commentBody: string) => {
    if (!wallet) return;
    addInvestorThesisComment(token.ca, postId, {
      wallet,
      body: commentBody,
      holdingAmount: holdingBalance > 0 ? holdingBalance : null,
      holdingVerified,
    });
    refresh();
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
            onPostThesis={() => setComposerOpen(true)}
            onHoldingVerified={(hasHolding, balance) => {
              setHasHolding(hasHolding);
              setHoldingBalance(balance);
              if (!hasHolding) setComposerOpen(false);
            }}
          />
        </div>

        <p className="text-[12px] leading-relaxed text-zinc-500">
          Anyone can read community theses. Connect your wallet and hold the token to post — verified
          holders earn a <span className="font-semibold text-emerald-700">✓ Holding</span> badge with
          token amount (read-only, never your full wallet).
        </p>

        {posts.length > 0 ? (
          <div className="space-y-3">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                token={token}
                wallet={wallet}
                hasHolding={hasHolding}
                onComment={submitComment}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-200 py-10 text-center text-[13px] text-zinc-400">
            No community theses yet — be the first to post your take on ${token.symbol}.
          </div>
        )}

        {composerOpen && wallet && hasHolding ? (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Write your thesis
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["BULL", "BEAR", "NEUTRAL"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVerdict(v)}
                  className={`rounded-full px-3 py-1 text-[10px] font-black tracking-widest transition ${
                    verdict === v ? "text-white" : "bg-white text-zinc-500 ring-1 ring-zinc-200"
                  }`}
                  style={verdict === v ? { background: v === "BULL" ? "#059669" : v === "BEAR" ? "#ef4444" : "#71717a" } : undefined}
                >
                  {v}
                </button>
              ))}
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Your thesis: verdict rationale, key metric, main risk, falsifiable claim…"
              rows={4}
              className="mt-3 w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[13px] outline-none focus:border-indigo-300"
            />
            {error && <p className="mt-2 text-[12px] text-red-500">{error}</p>}
            <button
              type="button"
              onClick={submitPost}
              className="mt-3 rounded-full px-5 py-2 text-[11px] font-bold uppercase tracking-wide text-white"
              style={{ background: BLUE }}
            >
              Post thesis
            </button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
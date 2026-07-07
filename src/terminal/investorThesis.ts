import type { PortfolioResult } from "./kickstart";

export type ThesisVerdict = "BULL" | "BEAR" | "NEUTRAL";

export interface InvestorThesisComment {
  id: string;
  wallet: string;
  body: string;
  holdingAmount: number | null;
  holdingVerified: boolean;
  createdAt: string;
}

export interface InvestorThesisPost {
  id: string;
  tokenCa: string;
  wallet: string;
  verdict: ThesisVerdict;
  body: string;
  holdingAmount: number | null;
  holdingVerified: boolean;
  createdAt: string;
  convincingVotes: number;
  comments: InvestorThesisComment[];
}

const STORAGE_KEY = "ezpulse:investor-theses";

export function shortWallet(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function formatTokenAmount(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  if (amount >= 1) return amount.toFixed(2);
  if (amount > 0) return amount.toFixed(4);
  return "0";
}

export function resolveTokenHolding(
  portfolio: PortfolioResult | null | "loading",
  tokenCa: string,
): { amount: number; valueUsd: number } | null {
  if (!portfolio || portfolio === "loading") return null;
  const pos = portfolio.holdings.find((h) => h.coin.ca === tokenCa);
  if (!pos || pos.amount <= 0) return null;
  return { amount: pos.amount, valueUsd: pos.valueUsd };
}

/** Any on-chain balance counts — even $0.01. */
export function isVerifiedHolder(
  portfolio: PortfolioResult | null | "loading",
  tokenCa: string,
): boolean {
  const holding = resolveTokenHolding(portfolio, tokenCa);
  return holding !== null && holding.valueUsd >= 0.01;
}

export function loadInvestorTheses(tokenCa: string): InvestorThesisPost[] {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as Record<
      string,
      InvestorThesisPost[]
    >;
    return (all[tokenCa] ?? []).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  } catch {
    return [];
  }
}

function saveForToken(tokenCa: string, posts: InvestorThesisPost[]): void {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as Record<
      string,
      InvestorThesisPost[]
    >;
    all[tokenCa] = posts;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* noop */
  }
}

export function addInvestorThesisPost(
  tokenCa: string,
  post: Omit<InvestorThesisPost, "id" | "createdAt" | "convincingVotes" | "comments">,
): InvestorThesisPost {
  const entry: InvestorThesisPost = {
    ...post,
    id: `th-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    convincingVotes: 0,
    comments: [],
  };
  const posts = loadInvestorTheses(tokenCa);
  saveForToken(tokenCa, [entry, ...posts]);
  return entry;
}

export function addInvestorThesisComment(
  tokenCa: string,
  postId: string,
  comment: Omit<InvestorThesisComment, "id" | "createdAt">,
): InvestorThesisComment | null {
  const posts = loadInvestorTheses(tokenCa);
  const idx = posts.findIndex((p) => p.id === postId);
  if (idx < 0) return null;
  const entry: InvestorThesisComment = {
    ...comment,
    id: `cm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  posts[idx] = { ...posts[idx], comments: [...posts[idx].comments, entry] };
  saveForToken(tokenCa, posts);
  return entry;
}

/** Future gate: only verified holders can mark theses convincing. */
export function canVoteConvincing(
  connectedWallet: string | null,
  portfolio: PortfolioResult | null | "loading",
  tokenCa: string,
): boolean {
  return !!connectedWallet && isVerifiedHolder(portfolio, tokenCa);
}
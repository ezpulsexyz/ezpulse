import type { ResolvedSignal } from "../backend";
import type {
  ForensicsReport,
  FounderMetrics,
  FounderPost,
  FounderRegistryEntry,
  LaunchPerformance,
  SentimentSnapshot,
} from "../founders";
import type { LiveLaunch } from "../kickstart";

export type Section = "market" | "projects" | "signals" | "record" | "watchlist" | "portfolio" | "smart" | "indexes" | "thesis";
export type MarketTab = "ALL" | "TRENDING" | "VERIFIED" | "BONDED" | "BONDING" | "UPCOMING";

export type TerminalTarget = { section?: Section; marketTab?: MarketTab };

export interface Notif {
  key: string;
  icon: string;
  strength: "BULLISH" | "BEARISH" | "NEUTRAL";
  title: string;
  detail: string;
  token: LiveLaunch;
}

/** Aggregated founder terminal view — wallet- or handle-keyed. */
export interface FounderProfile {
  id: string;
  founder: FounderRegistryEntry;
  primaryToken: LiveLaunch | null;
  launches: LiveLaunch[];
  performances: LaunchPerformance[];
  metrics: FounderMetrics;
  forensics: ForensicsReport;
  publicFeed: FounderPost[];
  sentiment: SentimentSnapshot;
  signals: ResolvedSignal[] | null;
  totalMcapLaunched: number;
  successRate: number;
  loading: boolean;
  refresh: () => void;
}

export const NAV_GROUPS: { workflow: string; items: { id: Section; icon: string; label: string; soon?: boolean }[] }[] = [
  { workflow: "Discover", items: [{ id: "market", icon: "◉", label: "Market" }] },
  { workflow: "Research", items: [
    { id: "projects", icon: "📟", label: "Projects" },
    { id: "thesis", icon: "🧠", label: "Investor Thesis" },
  ]},
  { workflow: "Track", items: [
    { id: "signals", icon: "⚡", label: "Signals" },
    { id: "record", icon: "🎯", label: "Track Record" },
    { id: "watchlist", icon: "★", label: "Watchlist" },
  ]},
  { workflow: "Invest", items: [
    { id: "indexes", icon: "🧺", label: "EasyA Indexes" },
    { id: "portfolio", icon: "💼", label: "Portfolio" },
    { id: "smart", icon: "🤖", label: "Smart Investing", soon: true },
  ]},
];

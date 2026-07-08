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

export type ProjectCategory =
  | "AI"
  | "Infra"
  | "DeFi"
  | "Consumer"
  | "Gaming"
  | "Meme"
  | "RWA"
  | "Utility"
  | "Other";

/** Filterable project categories (excludes "Other"). */
export const PROJECT_CATEGORIES: ProjectCategory[] = [
  "AI",
  "Infra",
  "DeFi",
  "Consumer",
  "Gaming",
  "Meme",
  "RWA",
  "Utility",
];

export type Section = "market" | "projects" | "signals" | "record" | "watchlist" | "portfolio" | "smart" | "indexes" | "thesis";
export type MarketTab = "ALL" | "TRENDING" | "VERIFIED" | "BONDED" | "BONDING" | "UPCOMING";

export type TerminalTarget = { section?: Section; marketTab?: MarketTab; projectCa?: string };

export interface Notif {
  key: string;
  icon: string;
  strength: "BULLISH" | "BEARISH" | "NEUTRAL";
  title: string;
  detail: string;
  token: LiveLaunch;
}

/** Founder terminal — headline stats block. */
export interface FounderProfileStats {
  totalLaunches: number;
  successRate: number;
  bestLaunch: LiveLaunch | null;
  totalMcapLaunched: number;
  avgPerformance24h: number;
  convictionScore: number;
}

/** Founder terminal — wallet summary for forensics sidebar. */
export interface FounderProfileForensics {
  walletAge: number;
  knownRugCount: number;
  totalVolumeMoved: number;
}

/** Aggregated founder terminal view — wallet- or handle-keyed. */
export interface FounderProfile {
  id: string;
  name: string;
  xHandle?: string;
  avatar?: string;
  bio?: string;
  verified: boolean;
  wallet: string;
  launches: LiveLaunch[];
  stats: FounderProfileStats;
  forensics: FounderProfileForensics;
  /** Per-launch performance rows (Launch history table). */
  performances: LaunchPerformance[];
  signals: ResolvedSignal[] | null;
  publicFeed: FounderPost[];
  sentiment: SentimentSnapshot;
  metrics: FounderMetrics;
  /** Full forensics report (on-chain cards). */
  detailedForensics: ForensicsReport;
  registry: FounderRegistryEntry;
  primaryToken: LiveLaunch | null;
  loading: boolean;
  refresh: () => void;
}

export const NAV_GROUPS: { workflow: string; items: { id: Section; icon: string; label: string; soon?: boolean }[] }[] = [
  { workflow: "Discover", items: [{ id: "market", icon: "MKT", label: "Market" }] },
  { workflow: "Research", items: [
    { id: "projects", icon: "PRJ", label: "Projects" },
    { id: "thesis", icon: "THS", label: "Investor Thesis" },
  ]},
  { workflow: "Track", items: [
    { id: "signals", icon: "SIG", label: "Signals" },
    { id: "record", icon: "REC", label: "Track Record" },
    { id: "watchlist", icon: "WCH", label: "Watchlist" },
  ]},
  { workflow: "Invest", items: [
    { id: "indexes", icon: "IDX", label: "EasyA Indexes" },
    { id: "portfolio", icon: "PRT", label: "Portfolio" },
    { id: "smart", icon: "SMT", label: "Smart Investing", soon: true },
  ]},
];
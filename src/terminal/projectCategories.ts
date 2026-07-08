import type { ProjectCategory } from "./app/types";

export interface CategoryTokenInput {
  ca: string;
  name: string;
  symbol: string;
  description?: string;
  website?: string;
}

/** Authoritative per-CA tags — always win over inference. */
const CATEGORY_OVERRIDES: Record<string, ProjectCategory[]> = {
  FKshTXX4wUcirV9b4LhLrNP4cxAsA2VBAFdMEw5EASY: ["Utility"],
  bS532krUcXBMNqXURPtGqYA7dhEsenYe2z9QKkcEASY: ["AI", "Infra"],
  "12z7AWnW5Q8mAS9qFtCWnnMdhNvqScZHe8w627EfEASY": ["AI"],
  iu3A7azWTm3zQSk81SUC1JctB4zPYnxLmcmqq71EASY: ["AI"],
  fmTCoRQFRiFUDFdjFYzzkfMbJfjpQea4LuaapNNEASY: ["Gaming"],
  "6bTQPMctA5V8RNJnUc59mP1tAJB5dzLpUep4JuFEASY": ["Gaming"],
  AXqEggnJtaWeu4ds6HcBS3dLXJh58Z17hcmo3AhEASY: ["Gaming"],
  "6gnvghh8LKoM59p1WZSuTgYmdJrnZnhU7BzCcEaEASY": ["Infra", "Utility"],
  EhkrQGCnGfVSJc118G1r1S9pxdFdPWJuSyz1iYKEASY: ["AI"],
  "9ufM9TJd1UEmi9awnGfxCkCHAgQ3JZ5Sw6YxeSeEASY": ["AI"],
  VtZmMdFowJcaXAqaW951RVuH84WeLTQxfs83XZWEASY: ["Utility", "Infra"],
  AKKAPZBnJnzfE83DspsBSoqGSMwa2haFvoEJj1qzdrmk: ["AI"],
};

/** Fast path for well-known tickers. */
const SYMBOL_CATEGORIES: Record<string, ProjectCategory[]> = {
  BITAGENTS: ["AI"],
  VSK: ["AI"],
  CPX: ["AI", "Infra"],
  SCOUT: ["AI"],
  INFERRA: ["AI"],
  HIIE: ["AI"],
  LOBBY: ["Gaming"],
  BIRBS: ["Gaming"],
  ANT: ["Gaming"],
  EZSCREENER: ["Utility", "Infra"],
  SWCH: ["Infra", "Utility"],
  EASY: ["Utility"],
};

type CategoryRule = {
  category: ProjectCategory;
  /** Matched against normalized search blob (name + symbol + description + website). */
  terms: string[];
  weight?: number;
};

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: "AI",
    weight: 2,
    terms: [
      "artificial intelligence",
      "intelligence",
      "inferra",
      "varsko",
      "scout ai",
      "neural",
      "llm",
      "gpt",
      "machine learning",
      "autonomous agent",
      "ai agent",
      "bit agent",
      "bitagents",
      "cognition",
      "deep learning",
      "predict",
      "copilot",
    ],
  },
  {
    category: "Gaming",
    weight: 2,
    terms: [
      "gaming",
      "video game",
      "the lobby",
      "lobby",
      "world colony",
      "colony",
      "birb",
      "birbs",
      "flappy",
      "arcade",
      "play-to-earn",
      "metaverse",
      "esport",
      "gamer",
      "quest",
      "pixel",
    ],
  },
  {
    category: "DeFi",
    terms: [
      "defi",
      "decentralized finance",
      "liquidity pool",
      "yield farm",
      "staking",
      "lending",
      "borrow",
      "amm",
      "dex swap",
      "perps",
      "money market",
    ],
  },
  {
    category: "Infra",
    terms: [
      "infrastructure",
      " infra",
      "protocol",
      "screener",
      "switch board",
      "capix",
      "oracle",
      "indexer",
      "middleware",
      "rpc",
      "data layer",
      "market infra",
    ],
  },
  {
    category: "Consumer",
    terms: [
      "consumer",
      "social app",
      "lifestyle",
      "marketplace",
      "shopping",
      "media app",
      "creator",
      "community app",
    ],
  },
  {
    category: "Meme",
    terms: [
      "meme",
      "pepe",
      "doge",
      "wojak",
      "bonk",
      "cult",
      "funny",
      "cat coin",
      "frog",
    ],
  },
  {
    category: "RWA",
    terms: [
      "rwa",
      "real world asset",
      "real estate",
      "treasury bill",
      "asset-backed",
      "tokenized asset",
      "commodity",
    ],
  },
  {
    category: "Utility",
    terms: [
      "utility",
      "toolkit",
      "tool ",
      "platform",
      "ecosystem",
      "kickstart",
      "easya",
      "productivity",
    ],
  },
];

/** Hard corrections after keyword scoring. */
const CATEGORY_EXCLUSIONS: { pattern: RegExp; remove: ProjectCategory[]; force?: ProjectCategory[] }[] = [
  { pattern: /bit\s*agents?/i, remove: ["Gaming"], force: ["AI"] },
  { pattern: /varsko/i, remove: ["Gaming", "Meme"], force: ["AI"] },
  { pattern: /capix/i, remove: ["Gaming", "Meme"], force: ["AI", "Infra"] },
  { pattern: /world colony/i, remove: ["AI", "Meme"], force: ["Gaming"] },
  { pattern: /flappy birbs?/i, remove: ["AI"], force: ["Gaming"] },
  { pattern: /the lobby/i, remove: ["AI", "DeFi"], force: ["Gaming"] },
];

const MAX_TAGS = 3;

function normalizeSymbol(symbol: string): string {
  return symbol.replace(/^\$/, "").trim().toUpperCase();
}

function searchBlob(token: CategoryTokenInput): string {
  return [token.name, token.symbol, token.description ?? "", token.website ?? ""]
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function scoreCategories(blob: string): Map<ProjectCategory, number> {
  const scores = new Map<ProjectCategory, number>();

  for (const rule of CATEGORY_RULES) {
    const weight = rule.weight ?? 1;
    for (const term of rule.terms) {
      if (blob.includes(term.toLowerCase())) {
        scores.set(rule.category, (scores.get(rule.category) ?? 0) + weight);
      }
    }
  }

  // Single-word AI/game signals with word boundaries
  if (/\bai\b/.test(blob)) scores.set("AI", (scores.get("AI") ?? 0) + 1);
  if (/\bgame\b/.test(blob) || /\bgames\b/.test(blob)) {
    scores.set("Gaming", (scores.get("Gaming") ?? 0) + 1);
  }
  if (/\bagent\b/.test(blob) || /\bagents\b/.test(blob)) {
    scores.set("AI", (scores.get("AI") ?? 0) + 1);
  }
  if (/\bdefi\b/.test(blob)) scores.set("DeFi", (scores.get("DeFi") ?? 0) + 2);
  if (/\binfra\b/.test(blob)) scores.set("Infra", (scores.get("Infra") ?? 0) + 2);
  if (/\bmeme\b/.test(blob)) scores.set("Meme", (scores.get("Meme") ?? 0) + 2);

  return scores;
}

function applyExclusions(blob: string, scores: Map<ProjectCategory, number>): ProjectCategory[] {
  let forced: ProjectCategory[] = [];

  for (const rule of CATEGORY_EXCLUSIONS) {
    if (!rule.pattern.test(blob)) continue;
    for (const cat of rule.remove) scores.delete(cat);
    if (rule.force?.length) forced = [...new Set([...forced, ...rule.force])];
  }

  const ranked = [...scores.entries()]
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat);

  const merged = [...new Set([...forced, ...ranked])];
  return merged.slice(0, MAX_TAGS);
}

/** Infer categories from token metadata (no CA override). */
export function inferProjectCategories(token: CategoryTokenInput): ProjectCategory[] {
  const sym = normalizeSymbol(token.symbol);
  const bySymbol = SYMBOL_CATEGORIES[sym];
  if (bySymbol?.length) return bySymbol.slice(0, MAX_TAGS);

  const blob = searchBlob(token);
  const scores = scoreCategories(blob);
  const inferred = applyExclusions(blob, scores);

  return inferred.length ? inferred : ["Other"];
}

/** Resolve final categories: CA override → symbol map → keyword inference. */
export function resolveProjectCategories(token: CategoryTokenInput): ProjectCategory[] {
  const override =
    CATEGORY_OVERRIDES[token.ca] ?? CATEGORY_OVERRIDES[token.ca.toLowerCase()];
  if (override?.length) return override.slice(0, MAX_TAGS);

  return inferProjectCategories(token);
}
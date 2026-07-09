import type { MarketTab, Section, TerminalTarget } from "./terminal/app/types";

const SECTIONS = new Set<Section>([
  "market", "projects", "signals", "record", "watchlist", "portfolio", "smart", "indexes", "thesis",
]);

const MARKET_TABS = new Set<MarketTab>(["ALL", "TRENDING", "VERIFIED", "BONDED", "BONDING", "UPCOMING"]);

const MARKET_TAB_PATH: Record<MarketTab, string | null> = {
  ALL: null,
  TRENDING: "trending",
  VERIFIED: "verified",
  BONDED: "bonded",
  BONDING: "bonding",
  UPCOMING: "upcoming",
};

const PATH_TO_MARKET_TAB = Object.fromEntries(
  Object.entries(MARKET_TAB_PATH)
    .filter(([, path]) => path)
    .map(([tab, path]) => [path!, tab as MarketTab]),
) as Record<string, MarketTab>;

/** Detect GitHub project-pages prefix from the current URL (e.g. `/ezpulse`). */
function runtimePagesBase(): string {
  if (typeof window === "undefined") return "";
  const { pathname } = window.location;
  // Custom domain: /terminal/... — no repo prefix.
  if (pathname === "/terminal" || pathname.startsWith("/terminal/")) return "";
  // Project pages: /ezpulse/terminal/... or /ezpulse/
  const m = pathname.match(/^\/([^/]+)\/(terminal(?:\/|$)|$)/);
  if (m && m[1] !== "terminal") return `/${m[1]}`;
  return "";
}

/** App base path (`` at ezpulse.xyz root, `/ezpulse` on project Pages without custom domain). */
export function appBase(): string {
  const runtime = runtimePagesBase();
  if (runtime) return runtime;

  let base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  // vite-plugin-singlefile sets BASE_URL to "./" — treat as site root, not a path prefix.
  if (base === "." || base === "./") base = "";
  return base;
}

export function terminalRoot(): string {
  const base = appBase();
  return base ? `${base}/terminal` : "/terminal";
}

export function landingHref(): string {
  const base = appBase();
  return base ? `${base}/` : "/";
}

/** Build a shareable terminal URL from section / tab / project. */
export function terminalHref(target?: TerminalTarget): string {
  const root = terminalRoot();
  if (!target) return `${root}/market`;

  if (target.projectCa) {
    return `${root}/project/${encodeURIComponent(target.projectCa)}`;
  }

  const section = target.section ?? "market";
  let path = `${root}/${section}`;

  if (section === "market" && target.marketTab && target.marketTab !== "ALL") {
    const tabPath = MARKET_TAB_PATH[target.marketTab];
    if (tabPath) path += `/${tabPath}`;
  }

  return path;
}

/** @deprecated Use terminalHref({ section, projectCa }) — kept as alias. */
export function projectHref(ca: string): string {
  return terminalHref({ section: "projects", projectCa: ca });
}

export function terminalTargetFromPath(pathname: string): TerminalTarget | undefined {
  const root = terminalRoot();
  const normalized = pathname.replace(/\/$/, "") || "/";

  if (normalized === root) return { section: "market", marketTab: "ALL" };
  if (!normalized.startsWith(`${root}/`)) return undefined;

  const rest = normalized.slice(root.length + 1);
  const parts = rest.split("/").filter(Boolean);
  if (!parts.length) return { section: "market", marketTab: "ALL" };

  if (parts[0] === "project" && parts[1]) {
    return {
      section: "projects",
      projectCa: decodeURIComponent(parts[1]),
    };
  }

  const section = parts[0];
  if (!SECTIONS.has(section as Section)) return undefined;

  const target: TerminalTarget = { section: section as Section };

  if (section === "market" && parts[1]) {
    const tab = PATH_TO_MARKET_TAB[parts[1].toLowerCase()];
    if (tab) target.marketTab = tab;
  }

  return target;
}

/** Legacy `?section=` / `?tab=` query URLs (still parsed for old links). */
export function terminalTargetFromSearch(search: string): TerminalTarget | undefined {
  const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const section = q.get("section");
  const tab = q.get("tab") ?? q.get("marketTab");
  const projectCa = q.get("project") ?? q.get("ca");
  const target: TerminalTarget = {};
  if (section && SECTIONS.has(section as Section)) target.section = section as Section;
  if (tab && MARKET_TABS.has(tab as MarketTab)) target.marketTab = tab as MarketTab;
  if (projectCa) {
    target.projectCa = projectCa;
    target.section = "projects";
  }
  return target.section || target.marketTab || target.projectCa ? target : undefined;
}

export function resolveTerminalTarget(pathname: string, search: string): TerminalTarget {
  const defaults: TerminalTarget = { section: "market", marketTab: "ALL" };
  const fromSearch = terminalTargetFromSearch(search);
  const fromPath = terminalTargetFromPath(pathname);
  return { ...defaults, ...fromSearch, ...fromPath };
}

export function isTerminalPath(pathname: string): boolean {
  const root = terminalRoot();
  const normalized = pathname.replace(/\/$/, "") || "/";
  return normalized === root || normalized.startsWith(`${root}/`);
}

export function hasLegacyTerminalSearch(search: string): boolean {
  if (!search || search === "?") return false;
  const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return q.has("section") || q.has("tab") || q.has("marketTab") || q.has("project") || q.has("ca");
}

type NavigationListener = () => void;
const navigationListeners = new Set<NavigationListener>();

/** Subscribe to client-side route changes (pushState + browser back/forward). */
export function subscribeNavigation(onStoreChange: () => void): () => void {
  navigationListeners.add(onStoreChange);
  const onPopState = () => onStoreChange();
  window.addEventListener("popstate", onPopState);
  return () => {
    navigationListeners.delete(onStoreChange);
    window.removeEventListener("popstate", onPopState);
  };
}

function notifyNavigation(): void {
  for (const listener of navigationListeners) listener();
}

export function navigate(href: string, replace = false): void {
  const next = new URL(href, window.location.origin);
  const current = `${window.location.pathname}${window.location.search}`;
  const target = `${next.pathname}${next.search}`;
  if (target === current) {
    notifyNavigation();
    return;
  }
  if (replace) window.history.replaceState(null, "", target);
  else window.history.pushState(null, "", target);
  notifyNavigation();
}

export function navigateToLanding(): void {
  navigate(landingHref());
}

export function navigateToTerminal(target?: TerminalTarget): void {
  navigate(terminalHref(target));
}
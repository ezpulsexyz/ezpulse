import type { MarketTab, Section, TerminalTarget } from "./terminal/app/types";

const SECTIONS = new Set<Section>([
  "market", "projects", "signals", "record", "watchlist", "portfolio", "smart", "indexes", "thesis",
]);

const MARKET_TABS = new Set<MarketTab>(["ALL", "TRENDING", "VERIFIED", "BONDED", "BONDING", "UPCOMING"]);

/** App base path (`` at ezpulse.xyz root, `/ezpulse` on project Pages without custom domain). */
export function appBase(): string {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return base;
}

export function landingHref(): string {
  const base = appBase();
  return base ? `${base}/` : "/";
}

export function terminalHref(target?: TerminalTarget): string {
  const base = appBase();
  const path = base ? `${base}/terminal` : "/terminal";
  if (!target?.section && !target?.marketTab) return path;
  const q = new URLSearchParams();
  if (target.section) q.set("section", target.section);
  if (target.marketTab) q.set("tab", target.marketTab);
  const qs = q.toString();
  return qs ? `${path}?${qs}` : path;
}

export function terminalTargetFromSearch(search: string): TerminalTarget | undefined {
  const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const section = q.get("section");
  const tab = q.get("tab") ?? q.get("marketTab");
  const target: TerminalTarget = {};
  if (section && SECTIONS.has(section as Section)) target.section = section as Section;
  if (tab && MARKET_TABS.has(tab as MarketTab)) target.marketTab = tab as MarketTab;
  return target.section || target.marketTab ? target : undefined;
}

export function isTerminalPath(pathname: string): boolean {
  const base = appBase();
  const normalized = pathname.replace(/\/$/, "") || "/";
  const terminalPath = base ? `${base}/terminal` : "/terminal";
  return normalized === terminalPath;
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

export function navigate(href: string): void {
  const next = new URL(href, window.location.origin);
  const current = `${window.location.pathname}${window.location.search}`;
  const target = `${next.pathname}${next.search}`;
  if (target === current) {
    notifyNavigation();
    return;
  }
  // Full navigation: GitHub Pages serves our SPA via 404.html — more reliable than pushState alone.
  window.location.assign(target);
}

export function navigateToLanding(): void {
  navigate(landingHref());
}

export function navigateToTerminal(target?: TerminalTarget): void {
  navigate(terminalHref(target));
}
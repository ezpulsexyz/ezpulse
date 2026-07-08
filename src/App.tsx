import { useEffect, useSyncExternalStore } from "react";
import GlobalFx from "./GlobalFx";
import ErrorBoundary from "./terminal/ErrorBoundary";
import Landing from "./terminal/Landing";
import Terminal from "./terminal/Terminal";
import {
  hasLegacyTerminalSearch,
  isTerminalPath,
  navigate,
  resolveTerminalTarget,
  subscribeNavigation,
  terminalHref,
  terminalRoot,
} from "./routes";

function getLocationKey() {
  return `${window.location.pathname}${window.location.search}`;
}

function routeFromKey(key: string) {
  const q = key.indexOf("?");
  return {
    pathname: q === -1 ? key : key.slice(0, q),
    search: q === -1 ? "" : key.slice(q),
  };
}

export default function App() {
  const locationKey = useSyncExternalStore(subscribeNavigation, getLocationKey, getLocationKey);
  const { pathname, search } = routeFromKey(locationKey);
  const onTerminal = isTerminalPath(pathname);
  const target = onTerminal ? resolveTerminalTarget(pathname, search) : undefined;

  useEffect(() => {
    if (!onTerminal) return;
    const normalized = pathname.replace(/\/$/, "") || "/";
    if (normalized === terminalRoot()) {
      navigate(terminalHref({ section: "market" }), true);
      return;
    }
    if (!hasLegacyTerminalSearch(search)) return;
    navigate(terminalHref(resolveTerminalTarget(pathname, search)), true);
  }, [onTerminal, pathname, search]);

  return (
    <ErrorBoundary>
      {!onTerminal && <GlobalFx />}
      {onTerminal ? (
        <Terminal target={target} />
      ) : (
        <Landing />
      )}
    </ErrorBoundary>
  );
}
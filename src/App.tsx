import { useSyncExternalStore } from "react";
import ErrorBoundary from "./terminal/ErrorBoundary";
import Landing from "./terminal/Landing";
import Terminal from "./terminal/Terminal";
import { isTerminalPath, subscribeNavigation, terminalTargetFromSearch } from "./routes";

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
  const target = onTerminal ? terminalTargetFromSearch(search) : undefined;

  return (
    <ErrorBoundary>
      {onTerminal ? (
        <Terminal key={locationKey} target={target} />
      ) : (
        <Landing />
      )}
    </ErrorBoundary>
  );
}
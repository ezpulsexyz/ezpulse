import { useSyncExternalStore } from "react";
import ErrorBoundary from "./terminal/ErrorBoundary";
import Landing from "./terminal/Landing";
import Terminal from "./terminal/Terminal";
import { isTerminalPath, terminalTargetFromSearch } from "./routes";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
}

function getLocationKey() {
  return `${window.location.pathname}${window.location.search}`;
}

export default function App() {
  const locationKey = useSyncExternalStore(subscribe, getLocationKey, getLocationKey);
  const onTerminal = isTerminalPath(window.location.pathname);
  const target = onTerminal ? terminalTargetFromSearch(window.location.search) : undefined;

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
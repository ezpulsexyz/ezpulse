import { useSyncExternalStore } from "react";
import ErrorBoundary from "./terminal/ErrorBoundary";
import Landing from "./terminal/Landing";
import Terminal from "./terminal/Terminal";
import { isTerminalPath, subscribeNavigation, terminalTargetFromSearch } from "./routes";

function getLocationKey() {
  return `${window.location.pathname}${window.location.search}`;
}

export default function App() {
  const locationKey = useSyncExternalStore(subscribeNavigation, getLocationKey, getLocationKey);
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
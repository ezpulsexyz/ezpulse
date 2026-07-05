import { useState } from "react";
import ErrorBoundary from "./terminal/ErrorBoundary";
import Landing from "./terminal/Landing";
import Terminal, { type TerminalTarget } from "./terminal/Terminal";

export default function App() {
  const [view, setView] = useState<"landing" | "app">("landing");
  const [target, setTarget] = useState<TerminalTarget | undefined>(undefined);

  const openApp = (t?: TerminalTarget) => {
    setTarget(t);
    setView("app");
  };

  return (
    <ErrorBoundary>
      {view === "landing" ? (
        <Landing onOpenApp={openApp} />
      ) : (
        <div>
          <button
            onClick={() => setView("landing")}
            className="fixed bottom-4 right-4 z-50 rounded-full border border-zinc-200 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-zinc-500 shadow-lg transition hover:text-indigo-700"
          >
            ← Back to site
          </button>
          <Terminal key={JSON.stringify(target ?? {})} target={target} />
        </div>
      )}
    </ErrorBoundary>
  );
}

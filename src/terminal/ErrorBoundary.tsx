import { Component, type ReactNode } from "react";
import { BLUE, PulseMark } from "./brand";

interface State { error: Error | null }

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    try {
      const buf = JSON.parse(localStorage.getItem("ezpulse:errors") || "[]");
      buf.push({ ts: new Date().toISOString(), message: error.message, stack: error.stack?.slice(0, 1500) });
      localStorage.setItem("ezpulse:errors", JSON.stringify(buf.slice(-20)));
    } catch { /* noop */ }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fbfbfd] px-5 font-sans" style={{ colorScheme: "light" }}>
        <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex justify-center"><PulseMark size={56} /></div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Flatline detected</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
            Something unexpected broke this view. Your watchlist and settings are safe in your browser.
          </p>
          <pre className="mt-4 max-h-24 overflow-auto rounded-xl bg-zinc-900 p-3 text-left font-mono text-[10px] text-zinc-300">
            {this.state.error.message}
          </pre>
          <div className="mt-5 flex gap-2">
            <button onClick={() => this.setState({ error: null })}
              className="flex-1 rounded-full py-2.5 text-[12px] font-bold uppercase tracking-wide text-white" style={{ background: BLUE }}>
              Try again
            </button>
            <button onClick={() => window.location.reload()}
              className="flex-1 rounded-full border border-zinc-200 bg-white py-2.5 text-[12px] font-bold uppercase tracking-wide text-zinc-600 hover:border-indigo-300 hover:text-indigo-700">
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}

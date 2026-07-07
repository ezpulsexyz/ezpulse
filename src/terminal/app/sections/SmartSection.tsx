import { BLUE } from "../../components";
import { PageHead } from "../components/PageLayout";
import { useTerminalContext } from "../TerminalContext";

export function SmartSection() {
  const { goto } = useTerminalContext();

  return (
            <>
              <PageHead title="Smart Investing" sub="Rules-based allocation over the Kickstart market — set the strategy, let the signals execute."
                right={<span className="rounded-full bg-zinc-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-zinc-500">Coming soon</span>} />
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  ["🧺", "Index investing", "One-click exposure to any EasyA Index — Composite, Verified, Momentum 5 or Liquid — auto-rebalanced as constituents change."],
                  ["⚡", "Signal strategies", "Automate on live signals: 'buy verified tokens on volume spikes', 'trim anything after +50% in 48h'. You set the rules."],
                  ["🛡️", "Guardrails", "Position caps, liquidity floors and verified-only filters baked in — the platform enforces the discipline."],
                ].map(([icon, t, b]) => (
                  <div key={t as string} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <div className="text-2xl">{icon}</div>
                    <h3 className="mt-3 text-[15px] font-bold text-zinc-900">{t}</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">{b}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl px-8 py-10 text-center text-white" style={{ background: `linear-gradient(135deg, ${BLUE}, #4f2ff0)` }}>
                <h2 className="font-display text-2xl font-semibold">Watch your holdings today</h2>
                <p className="mx-auto mt-2 max-w-md text-[13px] text-white/70">Portfolio already works in watch-only mode — see your Kickstart positions at live prices. Smart Investing adds execution on top.</p>
                <button onClick={() => goto("portfolio")} className="mt-5 rounded-full bg-white px-7 py-3 text-[12px] font-bold uppercase tracking-wide text-indigo-700 transition hover:-translate-y-0.5">
                  Open Portfolio →
                </button>
              </div>
            </>
  );
}

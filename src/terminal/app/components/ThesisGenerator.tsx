import { useEffect, useState } from "react";
import { fetchPriceHistory, fetchFounderSignals, backendReady } from "../../backend";
import { BLUE, Card } from "../../components";
import { generateThesis, type GeneratedThesis } from "../../thesis";
import { resolveFounder } from "../../founders";
import type { LiveLaunch } from "../../kickstart";

export function ThesisGenerator({ token, feed }: { token: LiveLaunch; feed: LiveLaunch[] }) {
  const [thesis, setThesis] = useState<GeneratedThesis | null | "loading">("loading");

  useEffect(() => {
    let alive = true;
    setThesis("loading");
    const founder = resolveFounder(token);
    Promise.all([
      fetchPriceHistory(token.ca, 720),
      backendReady ? fetchFounderSignals(founder.tokens, 20) : Promise.resolve(null),
    ]).then(([history, signals]) => {
      if (!alive) return;
      setThesis(generateThesis(token, feed, { founder, history, founderSignals: signals }));
    });
    return () => { alive = false; };
  }, [token.ca, feed]);

  if (thesis === "loading") {
    return (
      <Card title="✨ AI Thesis Generator" pad>
        <div className="flex items-center gap-2 text-[13px] text-zinc-500">
          <span className="term-blink h-2 w-2 rounded-full" style={{ background: BLUE }} />
          Synthesizing signals + founder data…
        </div>
      </Card>
    );
  }

  if (!thesis) return null;

  const verdictCol =
    thesis.verdict === "BULL CASE" ? "bg-emerald-600" : thesis.verdict === "BEAR CASE" ? "bg-red-500" : "bg-zinc-500";

  return (
    <Card
      title="✨ AI Thesis Generator"
      right={
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-500">
          <span className="term-blink h-1.5 w-1.5 rounded-full bg-indigo-500" />
          LIVE · {thesis.conviction}/100 conviction
        </span>
      }
    >
      <div className="border-b border-zinc-100 px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[9px] font-black tracking-widest text-white ${verdictCol}`}>
            {thesis.verdict}
          </span>
          <span className="text-[13px] font-bold text-zinc-900">on {token.name} ${token.symbol}</span>
          <span className="ml-auto rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-bold text-indigo-600">
            {thesis.horizon} horizon
          </span>
        </div>
        <div className="mt-1 text-[11px] text-zinc-400">{thesis.signalSummary}</div>
      </div>

      <div className="space-y-3 px-5 py-4">
        {[
          ["Verdict & horizon", `${thesis.verdict.replace(" CASE", "")} · ${thesis.horizon}`],
          ["Key metric", thesis.keyMetric],
          ["The case", thesis.thesis],
          ["Main risk", thesis.risk],
        ].map(([label, value]) => (
          <div key={label as string}>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{label}</div>
            <div className="mt-0.5 text-[13px] leading-relaxed text-zinc-700">{value}</div>
          </div>
        ))}

        <div className="rounded-xl bg-amber-50/70 px-3.5 py-2.5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Falsifiable claim · auto-scored</div>
          <div className="mt-0.5 text-[13px] font-semibold text-zinc-800">
            "{thesis.falsifiableClaim}" — resolves {thesis.resolveDate} from live data
          </div>
        </div>

        {thesis.founderInsight && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 px-3.5 py-2.5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">Founder context</div>
            <p className="mt-1 text-[13px] leading-relaxed text-zinc-700">{thesis.founderInsight}</p>
          </div>
        )}
      </div>

      <div className="border-t border-zinc-100 px-5 py-2.5 text-[10px] text-zinc-400">
        Sources: {thesis.sources.join(" · ")} · Not investment advice · regenerate on every load
      </div>
    </Card>
  );
}
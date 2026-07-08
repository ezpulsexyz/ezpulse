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
      <div className="border-b px-5 py-3.5" style={{ borderColor: "var(--term-border-subtle)" }}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[9px] font-black tracking-widest text-white ${verdictCol}`}>
            {thesis.verdict}
          </span>
          <span className="text-[13px] font-bold" style={{ color: "var(--term-text)" }}>
            on {token.name} ${token.symbol}
          </span>
          <span className="term-thesis-horizon ml-auto rounded-full px-2 py-0.5 text-[9px] font-bold">
            {thesis.horizon} horizon
          </span>
        </div>
        <div className="mt-1 text-[11px]" style={{ color: "var(--term-text-subtle)" }}>
          {thesis.signalSummary}
        </div>
      </div>

      <div className="space-y-3 px-5 py-4">
        {[
          ["Verdict & horizon", `${thesis.verdict.replace(" CASE", "")} · ${thesis.horizon}`],
          ["Key metric", thesis.keyMetric],
          ["The case", thesis.thesis],
          ["Main risk", thesis.risk],
        ].map(([label, value]) => (
          <div key={label as string}>
            <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--term-text-subtle)" }}>
              {label}
            </div>
            <div className="mt-0.5 text-[13px] leading-relaxed" style={{ color: "var(--term-text-secondary)" }}>
              {value}
            </div>
          </div>
        ))}

        <div className="term-thesis-claim">
          <div className="term-thesis-claim__label">Falsifiable claim · auto-scored</div>
          <div className="term-thesis-claim__body">
            "{thesis.falsifiableClaim}" — resolves {thesis.resolveDate} from live data
          </div>
        </div>

        {thesis.founderInsight && (
          <div className="term-thesis-founder">
            <div className="term-thesis-founder__label">Founder context</div>
            <p className="term-thesis-founder__body">{thesis.founderInsight}</p>
          </div>
        )}
      </div>

      <div className="border-t px-5 py-2.5 text-[10px]" style={{ borderColor: "var(--term-border-subtle)", color: "var(--term-text-subtle)" }}>
        Sources: {thesis.sources.join(" · ")} · Not investment advice · regenerate on every load
      </div>
    </Card>
  );
}
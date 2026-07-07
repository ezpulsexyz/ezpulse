import { useState } from "react";
import { BLUE, Card } from "../../components";
import { PageHead } from "../components/PageLayout";
import { ThesisGenerator } from "../components/ThesisGenerator";
import { useTerminalContext } from "../TerminalContext";

export function ThesisSection() {
  const { feed, wallet, portfolio, goto, openToken } = useTerminalContext();
  const [pickCa, setPickCa] = useState(feed[0]?.ca ?? "");
  const token = feed.find((c) => c.ca === pickCa) ?? feed[0];

  return (
    <>
      <PageHead
        title="Investor Thesis"
        sub="AI-generated structured research from live signals + founder data — verdict, metric, risk, and a falsifiable claim."
        right={<span className="rounded-full bg-indigo-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-indigo-700">✨ Live generator</span>}
      />

      <div className="mb-4 grid gap-4 md:grid-cols-3">
        {[
          ["🎫", "Skin in the game", "Writing a thesis requires holding ≥$10 of the project — verified read-only from your wallet. No holdings, no takes."],
          ["📋", "Structured, not free-form", "Every thesis follows a template: verdict, time horizon, key metric, risk, and a falsifiable claim."],
          ["🎯", "Scored by reality", "Predictions resolve against live market data automatically. Right calls compound reputation."],
        ].map(([icon, t, b]) => (
          <div key={t as string} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="text-2xl">{icon}</div>
            <h3 className="mt-3 text-[15px] font-bold text-zinc-900">{t}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">{b}</p>
          </div>
        ))}
      </div>

      {feed.length > 0 && token && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="text-[12px] font-semibold text-zinc-600">Generate for</label>
          <select
            value={pickCa}
            onChange={(e) => setPickCa(e.target.value)}
            className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-[12px] font-semibold outline-none focus:border-indigo-300"
          >
            {feed.map((c) => (
              <option key={c.ca} value={c.ca}>{c.name} (${c.symbol})</option>
            ))}
          </select>
          <button onClick={() => openToken(token)} className="rounded-full border border-zinc-200 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-zinc-600 transition hover:border-indigo-300 hover:text-indigo-700">
            Open terminal →
          </button>
        </div>
      )}

      {token ? (
        <ThesisGenerator token={token} feed={feed} />
      ) : (
        <Card pad><p className="text-[13px] text-zinc-500">No live tokens to analyze yet.</p></Card>
      )}

      <Card className="mt-4" title="🎫 Check your eligibility · live" right={<span className="text-[10px] text-zinc-400">read-only, via your watched wallet</span>}>
        <div className="px-5 py-4">
          {!wallet ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[13px] text-zinc-500">Watch a wallet to see which projects you already qualify for (≥$10 position).</p>
              <button onClick={() => goto("portfolio")} className="rounded-full px-5 py-2 text-[11px] font-bold uppercase tracking-wide text-white" style={{ background: BLUE }}>
                Watch a wallet →
              </button>
            </div>
          ) : portfolio && portfolio !== "loading" ? (() => {
            const eligible = portfolio.holdings.filter((h) => h.valueUsd >= 10);
            return eligible.length ? (
              <div>
                <p className="mb-3 text-[13px] text-zinc-600">
                  This wallet qualifies to write theses on <strong className="text-zinc-900">{eligible.length} project{eligible.length !== 1 ? "s" : ""}</strong>:
                </p>
                <div className="flex flex-wrap gap-2">
                  {eligible.map((h) => (
                    <button key={h.coin.ca} onClick={() => setPickCa(h.coin.ca)}
                      className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-700 transition hover:border-emerald-300">
                      🎫 {h.coin.name} · ${h.valueUsd.toFixed(0)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-zinc-500">
                No positions ≥$10 in featured tokens yet — hold $10 of any listed project to qualify.
              </p>
            );
          })() : (
            <p className="text-[13px] text-zinc-500">Reading wallet…</p>
          )}
        </div>
      </Card>
    </>
  );
}
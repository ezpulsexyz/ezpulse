import { BLUE, Card } from "../../components";
import { PageHead } from "../components/PageLayout";
import { useTerminalContext } from "../TerminalContext";

export function ThesisSection() {
  const { feed, wallet, portfolio, goto } = useTerminalContext();

  return (
            <>
              <PageHead title="Investor Thesis" sub="Structured research with skin in the game — hold the token to write, founders respond, predictions get scored."
                right={<span className="rounded-full bg-zinc-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-zinc-500">Coming soon</span>} />

              {/* how it works */}
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  ["🎫", "Skin in the game", "Writing a thesis requires holding ≥$10 of the project — verified read-only from your wallet. No holdings, no takes. Spam dies; conviction speaks."],
                  ["📋", "Structured, not free-form", "No comment-section noise. Every thesis follows a template: verdict, time horizon, key metric, risk, and a falsifiable claim — so takes are comparable and gradeable."],
                  ["🎯", "Scored by reality", "Predictions resolve against live market data automatically. Your public track record follows you — right calls compound reputation, wrong ones stay on the board."],
                ].map(([icon, t, b]) => (
                  <div key={t as string} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <div className="text-2xl">{icon}</div>
                    <h3 className="mt-3 text-[15px] font-bold text-zinc-900">{t}</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">{b}</p>
                  </div>
                ))}
              </div>

              {/* preview: a structured thesis with founder response */}
              <div className="mt-6 mb-2 flex items-center justify-between">
                <h2 className="text-[13px] font-bold uppercase tracking-widest text-zinc-400">Preview · how a thesis looks</h2>
                <span className="text-[11px] text-zinc-400">illustrative mockup</span>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                {/* thesis card */}
                <Card className="opacity-90">
                  <div className="border-b border-zinc-100 px-5 py-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[9px] font-black tracking-widest text-white">BULL CASE</span>
                      <span className="text-[13px] font-bold text-zinc-900">on {feed[0]?.name ?? "CapIX Protocol"} ${feed[0]?.symbol ?? "CPX"}</span>
                      <span className="ml-auto flex items-center gap-1.5 rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-bold text-indigo-600" title="Author holds a verified position">
                        🎫 HOLDER · $47 position
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-zinc-400">by <span className="font-mono">7xKp…9fQz</span> · track record 4/6 correct · 2d ago</div>
                  </div>
                  <div className="space-y-3 px-5 py-4">
                    {[
                      ["Verdict & horizon", "Accumulate · 30 days"],
                      ["Key metric", "Holder count — currently 656, thesis breaks below 500"],
                      ["The case", "Only Kickstart token with organic volume ≥40% and a working product link. Fee revenue is real, and holder growth survived a -30% drawdown."],
                      ["Main risk", "Top-10 wallets hold 60% — one exit nukes the pool."],
                    ].map(([l, v]) => (
                      <div key={l as string}>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{l}</div>
                        <div className="mt-0.5 text-[13px] leading-relaxed text-zinc-700">{v}</div>
                      </div>
                    ))}
                    <div className="rounded-xl bg-amber-50/70 px-3.5 py-2.5">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Falsifiable claim · auto-scored</div>
                      <div className="mt-0.5 text-[13px] font-semibold text-zinc-800">"Mcap ≥ $2M within 30 days" — resolves 8 Aug from live data</div>
                    </div>
                  </div>
                  {/* founder response */}
                  <div className="border-t border-zinc-100 bg-indigo-50/30 px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full px-2 py-0.5 text-[9px] font-black tracking-widest text-white" style={{ background: BLUE }}>FOUNDER RESPONSE</span>
                      <span className="text-[11px] text-zinc-500">verified via authorized X account · 1d ago</span>
                    </div>
                    <p className="mt-2 text-[13px] leading-relaxed text-zinc-700">
                      "Fair read on concentration — two of those wallets are the locked dev allocation (Streamflow, verifiable on-chain).
                      Holder-count is the right metric to watch; we ship the referral system next week which should move it."
                    </p>
                  </div>
                </Card>

                {/* prediction poll */}
                <div className="space-y-4">
                  <Card className="opacity-90" title="🗳 Prediction poll · holders only" right={<span className="text-[10px] font-bold text-zinc-400">resolves from live data</span>}>
                    <div className="px-5 py-4">
                      <div className="text-[14px] font-bold text-zinc-900">Will ${feed[0]?.symbol ?? "CPX"} hold #1 by market cap through the next 7 days?</div>
                      <div className="mt-1 text-[11px] text-zinc-400">23 holder votes · weighted by verified position size · closes in 4d</div>
                      <div className="mt-4 space-y-2.5">
                        {[["Yes — holds #1", 68, true], ["No — gets flipped", 32, false]].map(([label, pct, lead]) => (
                          <div key={label as string}>
                            <div className="mb-1 flex justify-between text-[12px]">
                              <span className={`font-semibold ${lead ? "text-zinc-900" : "text-zinc-500"}`}>{label}</span>
                              <span className="font-bold tabular-nums text-zinc-700">{pct}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                              <div className={`h-full rounded-full ${lead ? "bg-emerald-500" : "bg-zinc-300"}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <button disabled className="mt-4 w-full cursor-not-allowed rounded-full border border-zinc-200 py-2.5 text-[11px] font-bold uppercase tracking-wide text-zinc-400">
                        🎫 Hold ≥$10 to vote · coming soon
                      </button>
                    </div>
                  </Card>

                  <Card title="Why gated + structured" pad className="opacity-90">
                    <ul className="space-y-2.5 text-[13px] leading-relaxed text-zinc-600">
                      <li className="flex gap-2"><span className="text-indigo-500">▸</span><span><strong className="text-zinc-800">The $10 gate kills spam economics.</strong> Bots and drive-by shillers won't buy in; anyone with a real position has real incentive to be right.</span></li>
                      <li className="flex gap-2"><span className="text-indigo-500">▸</span><span><strong className="text-zinc-800">Templates make takes comparable.</strong> Every thesis names its metric and a falsifiable claim — so the market of opinions gets a price too.</span></li>
                      <li className="flex gap-2"><span className="text-indigo-500">▸</span><span><strong className="text-zinc-800">Founders answer on the record.</strong> Responses verified through the same X authorization as the ✓ badge — no impersonation.</span></li>
                    </ul>
                  </Card>
                </div>
              </div>

              {/* eligibility check — works today */}
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
                          This wallet qualifies to write theses on <strong className="text-zinc-900">{eligible.length} project{eligible.length !== 1 ? "s" : ""}</strong> when the feature ships:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {eligible.map((h) => (
                            <span key={h.coin.ca} className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-700">
                              🎫 {h.coin.name} · ${h.valueUsd.toFixed(0)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[13px] text-zinc-500">
                        No positions ≥$10 in featured tokens yet — hold $10 of any listed project to qualify when Investor Thesis ships.
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

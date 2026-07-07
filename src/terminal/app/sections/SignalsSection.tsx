import { ecosystemSignals } from "../../kickstart";
import { Card, Stat } from "../../components";
import { PageHead, EmptyState, LaunchCta, LoadingRows } from "../components/PageLayout";
import { useTerminalContext } from "../TerminalContext";

export function SignalsSection() {
  const { feed, loading, topMover, openToken } = useTerminalContext();

  return (
            <>
              <PageHead title="Signals" sub="Everything happening in the ecosystem, in real time — not static rankings. This is the feed that changes every time you open it."
                right={
                  <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-600">
                    <span className="term-blink h-1.5 w-1.5 rounded-full bg-red-500" /> LIVE FEED
                  </span>
                } />

              {loading && <Card><LoadingRows /></Card>}
              {!loading && feed.length === 0 && (
                <EmptyState icon="⚡" title="The feed is quiet" body="Signals fire the moment live …EASY tokens start moving — momentum, volume spikes, liquidity shifts, rank changes, new launches." cta={<LaunchCta />} />
              )}
              {!loading && feed.length > 0 && (() => {
                const events = ecosystemSignals(feed);
                const bulls = events.filter((e) => e.strength === "BULLISH").length;
                const bears = events.filter((e) => e.strength === "BEARISH").length;
                return (
                  <>
                    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                      <div className={`rounded-2xl px-5 py-4 text-white shadow-lg ${bulls > bears ? "bg-emerald-600" : bears > bulls ? "bg-red-500" : "bg-zinc-700"}`}>
                        <div className="text-[11px] font-semibold uppercase tracking-widest text-white/60">Ecosystem bias</div>
                        <div className="mt-1 font-display text-2xl font-semibold">{bulls > bears ? "BULLISH" : bears > bulls ? "BEARISH" : "MIXED"}</div>
                        <div className="mt-0.5 text-[11px] text-white/70">{bulls} bullish · {bears} bearish</div>
                      </div>
                      <Stat label="Signals firing" value={String(events.length)} sub={`across ${feed.length} tokens`} />
                      <Stat label="Top mover" value={topMover ? `${topMover.change24h >= 0 ? "+" : ""}${topMover.change24h.toFixed(1)}%` : "—"} sub={topMover ? `$${topMover.symbol}` : ""} />
                      <Stat label="Refresh" value="Live" sub="recomputed on every load" />
                    </div>

                    <div className="space-y-2.5">
                      {events.map((e, i) => (
                        <button key={i} onClick={() => openToken(e.token)}
                          className="flex w-full items-start gap-3.5 rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
                          <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] ${
                            e.strength === "BULLISH" ? "bg-emerald-50" : e.strength === "BEARISH" ? "bg-red-50" : "bg-zinc-100"
                          }`}>
                            {e.kind === "WHALE" ? "🐋" : e.kind === "LAUNCH" ? "🚀" : e.kind === "MOMENTUM" ? (e.strength === "BULLISH" ? "📈" : "📉") : e.kind === "VOLUME" ? "🔊" : e.kind === "LIQUIDITY" ? "💧" : e.kind === "RANK" ? "👑" : "✓"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[14px] font-bold text-zinc-900">{e.title}</span>
                              <span className={`rounded-full px-2 py-0.5 text-[8px] font-black tracking-widest text-white ${
                                e.strength === "BULLISH" ? "bg-emerald-600" : e.strength === "BEARISH" ? "bg-red-500" : "bg-zinc-400"
                              }`}>{e.strength}</span>
                              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[8px] font-bold tracking-widest text-zinc-500">{e.kind}</span>
                            </div>
                            <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-500">{e.detail}</p>
                            <div className="mt-1.5 flex items-center gap-2 text-[11px] text-zinc-400">
                              {e.token.icon && <img src={e.token.icon} alt="" className="h-4 w-4 rounded-full" onError={(ev) => { (ev.target as HTMLImageElement).style.display = "none"; }} />}
                              <span className="font-semibold text-zinc-600">{e.token.name}</span> ${e.token.symbol}
                              <span className="ml-auto font-semibold text-indigo-500">Open terminal →</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <p className="mt-4 text-[10px] text-zinc-400">
                      Signals are computed live from momentum, turnover, liquidity, rank, verification and launch events across every …EASY token. Ordered by significance. Not investment advice.
                    </p>
                  </>
                );
              })()}
            </>
  );
}

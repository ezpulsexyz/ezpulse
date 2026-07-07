import { INDEXES, indexStats } from "../../kickstart";
import { fmtUsd } from "../../data";
import { Card, Delta } from "../../components";
import { PageHead, EmptyState, LaunchCta, LoadingRows } from "../components/PageLayout";
import { useTerminalContext } from "../TerminalContext";

export function IndexesSection() {
  const { feed, loading, openToken } = useTerminalContext();

  return (
            <>
              <PageHead title="EasyA Indexes" sub="Live baskets over the Kickstart market — one number for each way of owning the ecosystem." />
              {loading && <Card><LoadingRows /></Card>}
              {!loading && feed.length === 0 && (
                <EmptyState icon="🧺" title="Indexes need constituents" body="Indexes compute automatically once live …EASY tokens are indexed." cta={<LaunchCta />} />
              )}
              {!loading && feed.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  {INDEXES.map((idx) => {
                    const coins = idx.pick(feed);
                    const s = indexStats(coins);
                    return (
                      <div key={idx.id} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 text-[16px] font-bold text-zinc-900">{idx.icon} {idx.name}</div>
                            <div className="mt-0.5 text-[11px] text-zinc-400">{idx.method}</div>
                          </div>
                          <span className={`text-[14px] font-bold tabular-nums ${s.change >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {s.change >= 0 ? "▲" : "▼"} {Math.abs(s.change).toFixed(1)}%
                          </span>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-zinc-100 pt-4">
                          <div>
                            <div className="text-[10px] uppercase tracking-widest text-zinc-400">Index mcap</div>
                            <div className="font-display text-lg font-semibold text-zinc-900">{fmtUsd(s.mcap)}</div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase tracking-widest text-zinc-400">Constituents</div>
                            <div className="font-display text-lg font-semibold text-zinc-900">{s.count}</div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase tracking-widest text-zinc-400">24h volume</div>
                            <div className="font-display text-lg font-semibold text-zinc-900">{fmtUsd(s.vol)}</div>
                          </div>
                        </div>
                        {coins.length > 0 && (
                          <div className="mt-4 space-y-1.5 border-t border-zinc-100 pt-3">
                            {coins.slice(0, 4).map((c) => (
                              <button key={c.ca} onClick={() => openToken(c)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] transition hover:bg-indigo-50/50">
                                <span className="font-semibold text-zinc-800">{c.name}</span>
                                <span className="text-zinc-400">${c.symbol}</span>
                                <span className="ml-auto tabular-nums text-zinc-500">{s.mcap > 0 && c.mcap > 0 ? `${((c.mcap / s.mcap) * 100).toFixed(0)}% wt` : "—"}</span>
                                <Delta v={c.change24h} suffix="%" />
                              </button>
                            ))}
                          </div>
                        )}
                        <button className="mt-4 w-full rounded-full border border-zinc-200 py-2.5 text-[11px] font-bold uppercase tracking-wide text-zinc-400" disabled>
                          Invest in this index · coming soon
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="mt-4 text-[11px] text-zinc-400">Index values are cap-weighted and recomputed live on every load. Investable index products ship with Smart Investing.</p>
            </>
  );
}

import { fmtNum, fmtUsd } from "../../data";
import { BLUE, Card, Delta, InfoTip, Stat } from "../../components";
import { fmtPrice, isVerified, isGraduated, kickstartUrl, tokenSignals } from "../../kickstart";
import { FounderTerminal } from "../components/FounderTerminal";
import { HistoryChart } from "../components/HistoryChart";
import { ThesisGenerator } from "../components/ThesisGenerator";
import { WhaleTxViz } from "../components/WhaleTxViz";
import { useWhaleAlerts } from "../hooks/useWhaleAlerts";
import { useTokenSupply } from "../hooks/useTokenSupply";
import { PageHead, EmptyState, LaunchCta, LoadingRows } from "../components/PageLayout";
import { PEER_GRID, TermNum, TermRowButton } from "../components/TermTable";
import { useTerminalContext } from "../TerminalContext";

export function ProjectsSection() {
  const { feed, loading, selected, setSelected, setLiveFeed, projTab, setProjTab, copiedCa, copyCa, watchlist, toggleWatch, setShareToken, wallet, portfolio, goto, openToken, note } = useTerminalContext();
  const whaleAlerts = useWhaleAlerts(feed, selected?.ca ?? null);
  const whaleFlow = selected ? whaleAlerts.flows.get(selected.ca) : undefined;

  useTokenSupply(selected, (enriched) => {
    setSelected(enriched);
    setLiveFeed((prev) => (Array.isArray(prev) ? prev.map((c) => (c.ca === enriched.ca ? enriched : c)) : prev));
  });

  return (
            <>
              {!selected ? (
                <>
                  <PageHead title="Projects" sub="Research them — every Kickstart token gets its own Bloomberg-style page. Pick one." />
                  {loading && <Card><LoadingRows /></Card>}
                  {!loading && feed.length === 0 && (
                    <EmptyState icon="📟" title="No tokens to inspect yet" body="The moment a …EASY pair is indexed, its terminal page is available here." cta={<LaunchCta />} />
                  )}
                  {!loading && feed.length > 0 && (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {feed.map((c) => (
                        <button key={c.ca} onClick={() => openToken(c)}
                          className="rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
                          <div className="flex items-center gap-2.5">
                            {c.icon && <img src={c.icon} alt="" className="h-9 w-9 rounded-full border border-zinc-100" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                            <div>
                              <div className="flex items-center gap-1.5 text-[15px] font-semibold text-zinc-900">
                                {c.name}
                                {isVerified(c) && <span className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black text-white" style={{ background: BLUE }}>✓</span>}
                              </div>
                              <div className="text-[11px] text-zinc-400">${c.symbol} · SOL</div>
                            </div>
                          </div>
                          <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3">
                            <span className="text-[13px] font-semibold tabular-nums text-zinc-800">{c.mcap ? fmtUsd(c.mcap) : "—"}</span>
                            <div className="flex items-center gap-2">
                              {isVerified(c) && <span className="text-[10px] font-bold text-indigo-600">👤 Founder</span>}
                              <Delta v={c.change24h} suffix="%" />
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="animate-fade-up">
                  <button onClick={() => setSelected(null)} className="mb-4 flex items-center gap-1.5 text-[13px] font-semibold text-zinc-400 transition hover:text-indigo-600">
                    ← All tokens
                  </button>

                  {/* header */}
                  <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      {selected.icon && <img src={selected.icon} alt="" className="h-10 w-10 shrink-0 rounded-full border border-zinc-100 sm:h-12 sm:w-12" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">{selected.name}</h1>
                          <span className="text-[14px] font-semibold text-zinc-400">${selected.symbol}</span>
                          {isVerified(selected) && <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-white" style={{ background: BLUE }}>✓ VERIFIED</span>}
                          {isGraduated(selected)
                            ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">🔗 BONDED</span>
                            : <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">⏳ BONDING {typeof selected.bondingCurve === "number" ? `${Math.min(selected.bondingCurve, 100).toFixed(0)}%` : ""}</span>}
                          <span className="rounded-full bg-red-50 px-2 py-1 text-[9px] font-black tracking-widest text-red-500">● LIVE</span>
                        </div>
                        <button onClick={() => copyCa(selected.ca)} className="mt-1 flex max-w-full items-center gap-1 font-mono text-[11px] text-zinc-400 transition hover:text-zinc-700">
                          <span className="truncate">{copiedCa === selected.ca ? "✓ copied to clipboard" : selected.ca}</span> ⧉
                        </button>
                      </div>
                    </div>
                    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
                      <button onClick={() => setShareToken(selected)}
                        className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-zinc-600 transition hover:border-indigo-300 hover:text-indigo-700 sm:px-5 sm:py-2.5 sm:text-[12px]">
                        📤 Share
                      </button>
                      <button onClick={() => toggleWatch(selected.ca)}
                        className={`rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wide transition sm:px-5 sm:py-2.5 sm:text-[12px] ${
                          watchlist.includes(selected.ca)
                            ? "text-white shadow-lg" : "border border-zinc-200 bg-white text-zinc-600 hover:border-amber-300 hover:text-amber-600"
                        }`}
                        style={watchlist.includes(selected.ca) ? { background: "#f59e0b" } : undefined}>
                        {watchlist.includes(selected.ca) ? "★ Watching" : "☆ Watch"}
                      </button>
                      {isGraduated(selected) ? (
                        <a href={selected.links.dexscreener} target="_blank" rel="noopener noreferrer"
                          className="col-span-2 rounded-full px-5 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-white shadow-lg transition hover:-translate-y-px sm:col-span-1 sm:px-6 sm:py-2.5 sm:text-[12px]" style={{ background: "#0b0e13" }}>
                          📊 Trade →
                        </a>
                      ) : (
                        <a href={kickstartUrl(selected.ca)} target="_blank" rel="noopener noreferrer"
                          className="col-span-2 rounded-full px-5 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-white shadow-lg shadow-indigo-600/25 transition hover:-translate-y-px sm:col-span-1 sm:px-6 sm:py-2.5 sm:text-[12px]" style={{ background: BLUE }}>
                          🚀 Buy on Kickstart →
                        </a>
                      )}
                      {isVerified(selected) && (
                        <button onClick={() => setProjTab("founder")}
                          className="col-span-2 rounded-full px-5 py-2 text-[11px] font-bold uppercase tracking-wide text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-px sm:col-span-1 sm:py-2.5 sm:text-[12px]"
                          style={{ background: `linear-gradient(135deg, ${BLUE}, #4f2ff0)` }}>
                          👤 Founder Terminal
                        </button>
                      )}
                      <a href={kickstartUrl(selected.ca)} target="_blank" rel="noopener noreferrer"
                        className="col-span-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-zinc-600 transition hover:border-indigo-300 hover:text-indigo-700 sm:col-span-1 sm:px-5 sm:py-2.5 sm:text-[12px]">
                        Kickstart ↗
                      </a>
                    </div>
                  </div>

                  {/* tabs */}
                  <div className="term-tab-rail term-scroll-x mt-5 max-w-full">
                    {([
                      ["overview", "Overview"],
                      ["signals", "⚡ Signals"],
                      ...(isVerified(selected) ? [["founder", "👤 Founder"] as const] : []),
                    ] as const).map(([id, label]) => (
                      <button key={id} onClick={() => setProjTab(id)}
                        className={`rounded-full px-4 py-2 text-[11px] font-bold transition sm:px-5 sm:text-[12px] ${projTab === id ? "text-white" : "text-zinc-500 hover:text-zinc-800"}`}
                        style={projTab === id ? { background: BLUE } : undefined}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* stat band */}
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
                    <div className="col-span-2 rounded-2xl px-4 py-3.5 text-white md:col-span-1" style={{ background: `linear-gradient(135deg, ${BLUE}, #4f2ff0)` }}>
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-white/60">Market Cap</div>
                      <div className="mt-0.5 font-display text-lg font-semibold tabular-nums sm:text-xl">{selected.mcap ? fmtUsd(selected.mcap) : "—"}</div>
                    </div>
                    <Stat label="Price" value={selected.priceUsd ? fmtPrice(selected.priceUsd) : "—"} sub={<Delta v={selected.change24h} suffix="% 24h" />} />
                    <Stat label="Volume 24h" value={selected.volume24h ? fmtUsd(selected.volume24h) : "—"} sub={selected.mcap ? `${((selected.volume24h / selected.mcap) * 100).toFixed(0)}% turnover` : ""} />
                    <Stat label="Liquidity" value={selected.liquidity ? fmtUsd(selected.liquidity) : "—"} sub={selected.mcap ? `${((selected.liquidity / selected.mcap) * 100).toFixed(0)}% of cap` : ""} />
                    <Stat
                      label={
                        <span className="inline-flex items-center gap-1">
                          Circulating supply
                          <InfoTip text="Circulating supply is declared by teams and verified by reviewers. An API endpoint hosted on your corporate domain is preferred to keep the numbers updated. Manual input is discouraged and may delay reviews unless sufficient evidence is provided. If nothing is provided, we display FDV for MC on our platforms." />
                        </span>
                      }
                      value={typeof selected.circulatingSupply === "number"
                        ? fmtNum(selected.circulatingSupply)
                        : "…"}
                      sub={typeof selected.circulatingSupply === "number" ? "via Jupiter · team verified" : "loading supply…"}
                    />
                    <Stat
                      label={
                        <span className="inline-flex items-center gap-1">
                          Max supply
                          <InfoTip text="Max supply is the maximum number of tokens that can ever be created. When unavailable, we fall back to total supply declared by the team." />
                        </span>
                      }
                      value={typeof selected.maxSupply === "number"
                        ? fmtNum(selected.maxSupply)
                        : typeof selected.totalSupply === "number"
                          ? fmtNum(selected.totalSupply)
                          : "—"}
                      sub={typeof selected.maxSupply === "number" ? "Max supply" : "Total supply fallback"}
                    />
                    <Stat label={selected.holderCount ? "Holders" : "Listed"}
                      value={selected.holderCount ? String(selected.holderCount) : selected.pairCreatedAt ? `${Math.max(1, Math.round((Date.now() - selected.pairCreatedAt) / 86400000))}d` : "—"}
                      sub={selected.holderCount ? "via Jupiter" : "since pair creation"} />
                  </div>

                  {/* bonding curve — real state from Jupiter */}
                  <div className="mt-3 rounded-2xl border border-zinc-200 bg-white px-5 py-3.5 shadow-sm">
                    {isGraduated(selected) ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-black tracking-widest text-white">🔗 BONDED</span>
                        <span className="text-[13px] text-zinc-600">
                          Bonding curve completed{selected.graduatedAt ? ` on ${new Date(selected.graduatedAt).toLocaleDateString()}` : ""} — graduated to an AMM pool.
                        </span>
                        <div className="ml-auto h-2 w-40 overflow-hidden rounded-full bg-zinc-100">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: "100%" }} />
                        </div>
                        <span className="text-[12px] font-bold tabular-nums text-emerald-600">100%</span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-amber-500 px-3 py-1 text-[10px] font-black tracking-widest text-white">⏳ BONDING</span>
                        <span className="text-[13px] text-zinc-600">
                          Bonding Curve: <strong className="tabular-nums text-zinc-900">{typeof selected.bondingCurve === "number" ? `${Math.min(selected.bondingCurve, 100).toFixed(1)}%` : "—"}</strong> · live via Jupiter — graduates to Bonded at 100%.
                        </span>
                        <div className="ml-auto h-2 w-40 overflow-hidden rounded-full bg-zinc-100">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(selected.bondingCurve ?? 0, 100)}%` }} />
                        </div>
                        <span className="text-[12px] font-bold tabular-nums text-amber-600">{typeof selected.bondingCurve === "number" ? `${Math.min(selected.bondingCurve, 100).toFixed(1)}%` : "—"}</span>
                      </div>
                    )}
                  </div>

                  {projTab === "founder" && isVerified(selected) ? (
                    <div className="mt-4">
                      <FounderTerminal token={selected} feed={feed} onOpenToken={openToken} />
                    </div>
                  ) : projTab === "signals" ? (
                    <div className="mt-4">
                      <div className="mb-4 grid gap-3 sm:grid-cols-3">
                        {(() => {
                          const sigs = tokenSignals(selected, feed);
                          const bulls = sigs.filter((s) => s.strength === "BULLISH").length;
                          const bears = sigs.filter((s) => s.strength === "BEARISH").length;
                          const bias = bulls > bears ? "BULLISH" : bears > bulls ? "BEARISH" : "MIXED";
                          return (
                            <>
                              <div className={`rounded-2xl px-5 py-4 text-white shadow-lg ${bias === "BULLISH" ? "bg-emerald-600" : bias === "BEARISH" ? "bg-red-500" : "bg-zinc-700"}`}>
                                <div className="text-[11px] font-semibold uppercase tracking-widest text-white/60">Net signal bias</div>
                                <div className="mt-1 font-display text-2xl font-semibold">{bias}</div>
                                <div className="mt-0.5 text-[11px] text-white/70">{bulls} bullish · {bears} bearish · {sigs.length - bulls - bears} neutral</div>
                              </div>
                              <Stat label="Signals firing" value={String(sigs.length)} sub="recomputed on every load" />
                              <Stat label="Data freshness" value="Live" sub="DexScreener public API" />
                            </>
                          );
                        })()}
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {tokenSignals(selected, feed).map((s, i) => (
                          <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-black tracking-widest text-white ${
                                s.strength === "BULLISH" ? "bg-emerald-600" : s.strength === "BEARISH" ? "bg-red-500" : "bg-zinc-400"
                              }`}>{s.strength}</span>
                              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] font-bold tracking-widest text-zinc-500">{s.kind}</span>
                            </div>
                            <div className="mt-2 text-[15px] font-bold text-zinc-900">{s.title}</div>
                            <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-500">{s.detail}</p>
                          </div>
                        ))}
                      </div>
                      {whaleFlow && <div className="mt-4"><WhaleTxViz flow={whaleFlow} /></div>}
                      <p className="mt-4 text-[10px] text-zinc-400">Signals are computed live from momentum, turnover, liquidity depth, rank and verification status. Not investment advice — check back daily, the tape changes.</p>
                    </div>
                  ) : (
                  <div className="mt-4 grid gap-4 xl:grid-cols-3">
                    {/* chart embed + insights + portfolio */}
                    <div className="space-y-4 xl:col-span-2">
                      <Card title="Live chart · DexScreener">
                        <iframe
                          title={`${selected.symbol} chart`}
                          src={`${selected.links.dexscreener}?embed=1&theme=light&trades=0&info=0`}
                          className="h-[min(420px,55vw)] min-h-[240px] w-full border-0 sm:h-[380px] lg:h-[420px]"
                          loading="lazy"
                        />
                      </Card>

                      {/* ezpulse-recorded history — the data moat */}
                      <HistoryChart ca={selected.ca} />

                      {whaleFlow && <WhaleTxViz flow={whaleFlow} compact />}

                      <ThesisGenerator token={selected} feed={feed} />

                      {/* AI INSIGHTS — under the chart */}
                      <Card title="✨ AI Insights · live" right={
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-500">
                          <span className="term-blink h-1.5 w-1.5 rounded-full bg-indigo-500" /> RECOMPUTED ON LOAD
                        </span>
                      }>
                        {(() => {
                          const sigs = tokenSignals(selected, feed);
                          const bulls = sigs.filter((s) => s.strength === "BULLISH").length;
                          const bears = sigs.filter((s) => s.strength === "BEARISH").length;
                          const bias = bulls > bears ? "BULLISH" : bears > bulls ? "BEARISH" : "MIXED";
                          const top = sigs.filter((s) => s.strength !== "NEUTRAL").slice(0, 3);
                          const turnover = selected.mcap > 0 ? selected.volume24h / selected.mcap : 0;
                          return (
                            <>
                              <div className="flex flex-wrap items-center gap-3 border-b border-zinc-100 px-5 py-3.5">
                                <span className={`rounded-full px-3 py-1 text-[10px] font-black tracking-widest text-white ${
                                  bias === "BULLISH" ? "bg-emerald-600" : bias === "BEARISH" ? "bg-red-500" : "bg-zinc-500"
                                }`}>{bias}</span>
                                <span className="text-[12px] text-zinc-500">{bulls} bullish · {bears} bearish · {sigs.length - bulls - bears} neutral signals</span>
                                <button onClick={() => setProjTab("signals")} className="ml-auto text-[12px] font-semibold text-indigo-600 hover:text-indigo-800">All signals →</button>
                              </div>
                              <div className="grid gap-px bg-zinc-100 sm:grid-cols-3">
                                {top.map((s, i) => (
                                  <div key={i} className="bg-white px-5 py-4">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[13px]">{s.kind === "WHALE" ? "🐋" : s.kind === "MOMENTUM" ? (s.strength === "BULLISH" ? "📈" : "📉") : s.kind === "VOLUME" ? "🔊" : s.kind === "LIQUIDITY" ? "💧" : s.kind === "RANK" ? "👑" : "✓"}</span>
                                      <span className={`text-[10px] font-black tracking-widest ${s.strength === "BULLISH" ? "text-emerald-600" : "text-red-500"}`}>{s.kind}</span>
                                    </div>
                                    <div className="mt-1 text-[13px] font-bold leading-snug text-zinc-900">{s.title}</div>
                                    <p className="mt-1 text-[11.5px] leading-relaxed text-zinc-500">{s.detail}</p>
                                  </div>
                                ))}
                                {top.length === 0 && <div className="bg-white px-5 py-4 text-[13px] text-zinc-400 sm:col-span-3">Quiet tape — no directional signals firing right now.</div>}
                              </div>
                              {note && (
                                <div className="border-t border-zinc-100 px-5 py-3.5">
                                  <p className="text-[12.5px] leading-relaxed text-zinc-600">
                                    <span className="mr-1.5 font-bold text-zinc-900">Summary:</span>{note.note}
                                    {turnover > 0 && <span className="text-zinc-400"> Daily turnover {(turnover * 100).toFixed(0)}% of cap · {selected.buys24h} buys / {selected.sells24h} sells.</span>}
                                  </p>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </Card>

                      {/* PORTFOLIO — your position in this token */}
                      <Card title="💼 Your position" right={
                        wallet
                          ? <span className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{wallet.slice(0, 4)}…{wallet.slice(-4)} · watch-only</span>
                          : <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">No wallet watched</span>
                      }>
                        {!wallet && (
                          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                            <p className="text-[13px] text-zinc-500">Watch a wallet to see your {`$${selected.symbol}`} position here — read-only, no signatures.</p>
                            <button onClick={() => goto("portfolio")} className="rounded-full px-5 py-2 text-[11px] font-bold uppercase tracking-wide text-white" style={{ background: BLUE }}>
                              Watch a wallet →
                            </button>
                          </div>
                        )}
                        {wallet && portfolio === "loading" && (
                          <div className="flex items-center gap-3 px-5 py-4 text-[13px] text-zinc-500">
                            <span className="term-blink h-2 w-2 rounded-full bg-indigo-500" /> Reading balances…
                          </div>
                        )}
                        {wallet && portfolio && portfolio !== "loading" && (() => {
                          const pos = portfolio.holdings.find((h) => h.coin.ca === selected.ca);
                          if (!pos) return (
                            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                              <p className="text-[13px] text-zinc-500">This wallet holds no ${selected.symbol}.</p>
                              <a href={selected.links.dexscreener} target="_blank" rel="noopener noreferrer" className="rounded-full bg-zinc-900 px-5 py-2 text-[11px] font-bold uppercase tracking-wide text-white transition hover:-translate-y-px">
                                📊 Trade on DexScreener →
                              </a>
                            </div>
                          );
                          const share = portfolio.totalUsd > 0 ? (pos.valueUsd / portfolio.totalUsd) * 100 : 0;
                          return (
                            <div className="grid grid-cols-2 gap-px bg-zinc-100 sm:grid-cols-4">
                              {[
                                ["Balance", pos.amount >= 1_000_000 ? `${(pos.amount / 1_000_000).toFixed(2)}M` : pos.amount >= 1000 ? `${(pos.amount / 1000).toFixed(1)}K` : pos.amount.toFixed(2), `$${selected.symbol}`],
                                ["Value", pos.valueUsd >= 0.01 ? `$${pos.valueUsd.toFixed(2)}` : "<$0.01", "at live price"],
                                ["24h move", `${selected.change24h >= 0 ? "+" : ""}${selected.change24h.toFixed(1)}%`, selected.change24h >= 0 ? "▲ position up" : "▼ position down"],
                                ["Of portfolio", `${share.toFixed(0)}%`, "Kickstart value share"],
                              ].map(([l, v, s]) => (
                                <div key={l as string} className="bg-white px-5 py-4">
                                  <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">{l}</div>
                                  <div className={`mt-0.5 font-display text-lg font-semibold tabular-nums ${l === "24h move" ? (selected.change24h >= 0 ? "text-emerald-600" : "text-red-500") : "text-zinc-900"}`}>{v}</div>
                                  <div className="text-[10px] text-zinc-400">{s}</div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </Card>
                    </div>

                    <div className="space-y-4">
                      {/* AI note */}
                      {note && (
                        <Card title="AI read · live" right={<span className={`rounded-full px-2.5 py-1 text-[9px] font-black tracking-widest text-white ${note.cls}`}>{note.rating}</span>} pad>
                          <p className="text-[13px] leading-relaxed text-zinc-600">{note.note}</p>
                          <p className="mt-2 text-[10px] text-zinc-400">Computed from live DexScreener data. Not investment advice.</p>
                        </Card>
                      )}
                      {/* links */}
                      <Card title="Website & socials" pad>
                        <div className="space-y-2">
                          {/* official project pages */}
                          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Official</div>
                          <a href={kickstartUrl(selected.ca)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50/40 px-3.5 py-2.5 text-[13px] font-semibold text-indigo-700 transition hover:border-indigo-300">
                            🚀 <span className="min-w-0 flex-1 truncate">Kickstart project page</span>
                            <span className="text-[10px] text-indigo-400">↗</span>
                          </a>
                          {selected.links.website && !selected.links.website.includes("kickstart.easya.io") ? (
                            <a href={selected.links.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 rounded-xl border border-zinc-100 px-3.5 py-2.5 text-[13px] font-semibold text-zinc-700 transition hover:border-indigo-200 hover:text-indigo-700">
                              🌐 <span className="min-w-0 flex-1 truncate">{selected.links.website.replace(/^https?:\/\/(www\.)?/, "")}</span>
                              <span className="text-[10px] text-zinc-300">↗</span>
                            </a>
                          ) : !selected.links.website ? (
                            <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-zinc-200 px-3.5 py-2.5 text-[13px] text-zinc-400">
                              🌐 <span className="truncate">No website linked on-chain yet</span>
                            </div>
                          ) : null}

                          {/* socials */}
                          <div className="mb-1 mt-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Socials</div>
                          {selected.links.x ? (
                            <a href={selected.links.x} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 rounded-xl border border-zinc-100 px-3.5 py-2.5 text-[13px] font-semibold text-zinc-700 transition hover:border-indigo-200 hover:text-indigo-700">
                              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                              <span className="min-w-0 flex-1 truncate">{selected.links.x.replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//, "@")}</span>
                              {isVerified(selected) && <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[8px] font-black text-white" style={{ background: BLUE }} title="Authorized (address-in-bio)">✓</span>}
                            </a>
                          ) : (
                            <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-zinc-200 px-3.5 py-2.5 text-[13px] text-zinc-400">
                              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                              <span className="truncate">No X account authorized yet</span>
                            </div>
                          )}
                          {selected.links.telegram && (
                            <a href={selected.links.telegram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 rounded-xl border border-zinc-100 px-3.5 py-2.5 text-[13px] font-semibold text-zinc-700 transition hover:border-indigo-200 hover:text-indigo-700">
                              ✈️ <span className="min-w-0 flex-1 truncate">{selected.links.telegram.replace(/^https?:\/\//, "")}</span>
                              <span className="text-[10px] text-zinc-300">↗</span>
                            </a>
                          )}

                          {/* market & chain */}
                          <div className="mb-1 mt-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Market & chain</div>
                          <a href={selected.links.dexscreener} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 rounded-xl border border-zinc-100 px-3.5 py-2.5 text-[13px] font-semibold text-zinc-700 transition hover:border-indigo-200 hover:text-indigo-700">
                            📊 <span className="min-w-0 flex-1 truncate">DexScreener chart</span>
                            <span className="text-[10px] text-zinc-300">↗</span>
                          </a>
                          <a href={`https://solscan.io/token/${selected.ca}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 rounded-xl border border-zinc-100 px-3.5 py-2.5 text-[13px] font-semibold text-zinc-700 transition hover:border-indigo-200 hover:text-indigo-700">
                            🔍 <span className="min-w-0 flex-1 truncate">Solscan explorer</span>
                            <span className="text-[10px] text-zinc-300">↗</span>
                          </a>
                          <a href={`https://jup.ag/tokens/${selected.ca}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 rounded-xl border border-zinc-100 px-3.5 py-2.5 text-[13px] font-semibold text-zinc-700 transition hover:border-indigo-200 hover:text-indigo-700">
                            🪐 <span className="min-w-0 flex-1 truncate">Jupiter token page</span>
                            <span className="text-[10px] text-zinc-300">↗</span>
                          </a>
                        </div>
                      </Card>
                      {/* peers */}
                      {feed.filter((x) => x.ca !== selected.ca).length > 0 && (
                        <Card title="Other live tokens">
                          {feed.filter((x) => x.ca !== selected.ca).slice(0, 4).map((x) => (
                            <TermRowButton key={x.ca} grid={PEER_GRID} onClick={() => openToken(x)} className="w-full">
                              <span className="truncate font-mono text-[12px] font-semibold text-zinc-900">{x.name} <span className="text-zinc-400">${x.symbol}</span></span>
                              <TermNum>{x.mcap ? fmtUsd(x.mcap) : "—"}</TermNum>
                              <span className="flex justify-end"><Delta v={x.change24h} suffix="%" /></span>
                            </TermRowButton>
                          ))}
                        </Card>
                      )}
                    </div>
                  </div>
                  )}
                </div>
              )}
            </>
  );
}

import { ALUMNI } from "../../kickstart";
import { fmtUsd } from "../../data";
import { BLUE, Card, Stat } from "../../components";
import { PageHead, EmptyState, LaunchCta } from "../components/PageLayout";
import { TerminalCoinTable } from "../components/TerminalCoinTable";
import { useTerminalContext } from "../TerminalContext";

export function MarketSection() {
  const { feed, loading, verified, bonded, bonding, trending, totalMcap, totalVol, marketTab, setMarketTab } = useTerminalContext();

  return (
            <>
              <PageHead title="Market" sub="Discover opportunities — the EasyA Kickstart token market, live and on-chain." />

              {/* stat cards drive the filter */}
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <div className="col-span-2 rounded-2xl px-4 py-4 text-white shadow-lg shadow-indigo-600/20 sm:col-span-1 sm:px-5" style={{ background: `linear-gradient(135deg, ${BLUE}, #4f2ff0)` }}>
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-white/60">Market Cap</div>
                  <div className="mt-1 font-display text-2xl font-semibold tabular-nums sm:text-3xl">{loading ? "…" : fmtUsd(totalMcap)}</div>
                  <div className="mt-0.5 text-[11px] text-white/60">{feed.length} live token{feed.length !== 1 ? "s" : ""}</div>
                </div>
                <button onClick={() => setMarketTab("VERIFIED")} className="text-left">
                  <Stat label="Verified Projects" value={loading ? "…" : String(verified.length)} sub={<span className="flex items-center gap-1"><span className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-black text-white" style={{ background: BLUE }}>✓</span> X account authorized</span>} />
                </button>
                <button onClick={() => setMarketTab("BONDED")} className="text-left">
                  <Stat label="Bonded Projects" value={loading ? "…" : String(bonded.length)} sub="🔗 curve completed · graduated" />
                </button>
                <button onClick={() => setMarketTab("BONDING")} className="text-left">
                  <Stat label="Bonding Now" value={loading ? "…" : String(bonding.length)} sub="⏳ live on the curve" />
                </button>
              </div>

              {/* filter tabs */}
              <div className="term-tab-rail term-scroll-x mt-4">
                {([["ALL", "🏆 All · by mcap"], ["TRENDING", "🔥 Trending Today"], ["VERIFIED", "✓ Verified"], ["BONDED", "🔗 Bonded"], ["BONDING", "⏳ Bonding"], ["UPCOMING", "🗓 Upcoming"]] as [MarketTab, string][]).map(([id, label]) => (
                  <button key={id} onClick={() => setMarketTab(id)}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-[12px] font-bold transition ${marketTab === id ? "text-white" : "text-zinc-500 hover:text-zinc-800"}`}
                    style={marketTab === id ? { background: BLUE } : undefined}>
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-4">
                {marketTab === "ALL" && (
                  <TerminalCoinTable coins={[...feed].sort((a, b) => b.mcap - a.mcap)} title="🏆 All live Kickstart tokens · by market cap"
                    right={<span className="text-[11px] text-zinc-400">{feed.length} tokens · {fmtUsd(totalMcap)} combined · {fmtUsd(totalVol)} vol 24h</span>} />
                )}
                {marketTab === "TRENDING" && (
                  <TerminalCoinTable coins={trending} title="🔥 Trending Today · ranked by 24h move"
                    right={<span className="text-[11px] text-zinc-400">recomputed on every load</span>} />
                )}
                {marketTab === "VERIFIED" && (
                  !loading && verified.length === 0
                    ? <EmptyState icon="✓" title="No verified tokens right now"
                        body="A token is verified when its X account is authorized — the project links its X this way, following Kickstart's address-in-bio model. It confirms the link only, not the project. Bonded tokens upgrade automatically once their X is indexed."
                        cta={<LaunchCta />} />
                    : <TerminalCoinTable coins={verified} title="✓ Verified Kickstart tokens · by market cap" />
                )}
                {marketTab === "BONDED" && (
                  !loading && bonded.length === 0
                    ? <EmptyState icon="🔗" title="No graduated tokens yet"
                        body="A token is Bonded once it completes its bonding curve and graduates to an AMM pool — real state read live from Jupiter."
                        cta={<LaunchCta />} />
                    : <TerminalCoinTable coins={[...bonded].sort((a, b) => b.mcap - a.mcap)} title="🔗 Bonded · curve completed (graduated) · by market cap" />
                )}
                {marketTab === "BONDING" && (
                  !loading && bonding.length === 0
                    ? <EmptyState icon="⏳" title="Nothing on the curve right now"
                        body="Fresh launches appear here with their live bonding-curve progress the moment Jupiter indexes them — and move to Bonded when the curve completes."
                        cta={<LaunchCta />} />
                    : <TerminalCoinTable coins={[...bonding].sort((a, b) => (b.bondingCurve ?? 0) - (a.bondingCurve ?? 0))} title="⏳ Bonding · live curve progress via Jupiter" />
                )}
                {marketTab === "UPCOMING" && (
                  <EmptyState icon="⏳" title="No upcoming launches announced yet"
                    body="Kickstart is permissionless — founders can launch at any moment, and new tokens appear in Bonded automatically the instant their …EASY pair is created."
                    cta={<LaunchCta />} />
                )}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <Card title="Proof this ecosystem works" pad>
                  <p className="text-[13px] leading-relaxed text-zinc-600">
                    EasyA hackathons produced a <strong className="text-zinc-900">$26B company</strong> (Cognition AI), a $500M Series B (Listen Labs), and multiple YC admits —
                    {" "}{ALUMNI.length} tracked outcomes worth $26.5B+. Kickstart is where the next generation launches as idea-coins.
                  </p>
                </Card>
                <Card title="How discovery works" pad>
                  <ul className="space-y-2 text-[13px] leading-relaxed text-zinc-600">
                    <li className="flex gap-2"><span className="text-indigo-400">1.</span> Founder launches on kickstart.easya.io → contract mints ending in <span className="font-mono font-bold text-indigo-600">EASY</span></li>
                    <li className="flex gap-2"><span className="text-indigo-400">2.</span> Pair indexes on DexScreener → appears here in minutes, auto-classified 🔗 Bonded</li>
                    <li className="flex gap-2"><span className="text-indigo-400">3.</span> X account authorized (address-in-bio) → upgraded to ✓ Verified</li>
                  </ul>
                </Card>
              </div>
            </>
  );
}

import { useMemo } from "react";
import { ALUMNI } from "../../kickstart";
import { fmtUsd } from "../../data";
import { Card } from "../../components";
import { PageHead, EmptyState, LaunchCta } from "../components/PageLayout";
import { TerminalCoinTable } from "../components/TerminalCoinTable";
import { useTerminalContext } from "../TerminalContext";
import type { MarketTab } from "../types";

const MARKET_TABS: [MarketTab, string][] = [
  ["ALL", "All"],
  ["TRENDING", "Trending"],
  ["VERIFIED", "Verified"],
  ["BONDED", "Bonded"],
  ["BONDING", "Bonding"],
  ["UPCOMING", "Upcoming"],
];

export function MarketSection() {
  const {
    feed,
    loading,
    verified,
    bonded,
    bonding,
    trending,
    totalMcap,
    totalVol,
    marketTab,
    setMarketTab,
    categoryFilter,
    setCategoryFilter,
    categories,
  } = useTerminalContext();

  const tabTokens = useMemo(() => {
    switch (marketTab) {
      case "ALL":
        return [...feed].sort((a, b) => b.mcap - a.mcap);
      case "TRENDING":
        return trending;
      case "VERIFIED":
        return verified;
      case "BONDED":
        return [...bonded].sort((a, b) => b.mcap - a.mcap);
      case "BONDING":
        return [...bonding].sort((a, b) => (b.bondingCurve ?? 0) - (a.bondingCurve ?? 0));
      default:
        return [];
    }
  }, [marketTab, feed, trending, verified, bonded, bonding]);

  const filteredTokens = useMemo(() => {
    let result = [...tabTokens];

    if (categoryFilter) {
      result = result.filter((token) => token.categories?.includes(categoryFilter));
    }

    return result;
  }, [tabTokens, categoryFilter]);

  return (
            <>
              <PageHead title="Market" sub="Discover opportunities — the EasyA Kickstart token market, live and on-chain." />

              {/* stat cards drive the filter */}
              <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
                <div className="term-market-stat term-market-stat--hero col-span-2 sm:col-span-1">
                  <div className="term-market-stat__label">Market Cap</div>
                  <div className="term-market-stat__value">{loading ? "…" : fmtUsd(totalMcap)}</div>
                  <div className="term-market-stat__sub">{feed.length} live token{feed.length !== 1 ? "s" : ""}</div>
                </div>
                <button type="button" onClick={() => setMarketTab("VERIFIED")} className="term-market-stat">
                  <div className="term-market-stat__label">Verified Projects</div>
                  <div className="term-market-stat__value">{loading ? "…" : verified.length}</div>
                  <div className="term-market-stat__sub">X account authorized</div>
                </button>
                <button type="button" onClick={() => setMarketTab("BONDED")} className="term-market-stat">
                  <div className="term-market-stat__label">Bonded Projects</div>
                  <div className="term-market-stat__value">{loading ? "…" : bonded.length}</div>
                  <div className="term-market-stat__sub">Curve completed</div>
                </button>
                <button type="button" onClick={() => setMarketTab("BONDING")} className="term-market-stat">
                  <div className="term-market-stat__label">Bonding Now</div>
                  <div className="term-market-stat__value">{loading ? "…" : bonding.length}</div>
                  <div className="term-market-stat__sub">Live on curve</div>
                </button>
              </div>

              {/* Mobile-friendly filter tabs */}
              <div className="-mx-1 mt-3 flex gap-1 overflow-x-auto px-1 pb-1.5 lg:hidden">
                {MARKET_TABS.map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setMarketTab(id)}
                    className={`term-tab-pill flex-shrink-0 whitespace-nowrap ${marketTab === id ? "term-tab-pill--active" : ""}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Desktop filter tabs */}
              <div className="term-tab-rail term-scroll-x mt-3 hidden lg:flex">
                {MARKET_TABS.map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setMarketTab(id)}
                    className={`term-tab whitespace-nowrap ${marketTab === id ? "term-tab--active" : ""}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-4">
                {marketTab !== "UPCOMING" && (
                  <div className="mb-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="term-card__title">Categories</span>
                      {categoryFilter && (
                        <button
                          type="button"
                          onClick={() => setCategoryFilter(null)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Clear filter
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCategoryFilter(cat === categoryFilter ? null : cat)}
                          className={`term-tab-pill px-2.5 py-1 transition ${categoryFilter === cat ? "term-tab-pill--active" : ""}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {marketTab === "ALL" && (
                  <TerminalCoinTable coins={filteredTokens} title="All live Kickstart tokens · by market cap"
                    right={<span className="text-[11px] text-zinc-400">{feed.length} tokens · {fmtUsd(totalMcap)} combined · {fmtUsd(totalVol)} vol 24h</span>} />
                )}
                {marketTab === "TRENDING" && (
                  <TerminalCoinTable coins={filteredTokens} title="Trending today · ranked by 24h move"
                    right={<span className="text-[11px] text-zinc-400">recomputed on every load</span>} />
                )}
                {marketTab === "VERIFIED" && (
                  !loading && verified.length === 0
                    ? <EmptyState icon="VER" title="No verified tokens right now"
                        body="A token is verified when its X account is authorized — the project links its X this way, following Kickstart's address-in-bio model. It confirms the link only, not the project. Bonded tokens upgrade automatically once their X is indexed."
                        cta={<LaunchCta />} />
                    : <TerminalCoinTable coins={filteredTokens} title="Verified Kickstart tokens · by market cap" />
                )}
                {marketTab === "BONDED" && (
                  !loading && bonded.length === 0
                    ? <EmptyState icon="BND" title="No graduated tokens yet"
                        body="A token is Bonded once it completes its bonding curve and graduates to an AMM pool — real state read live from Jupiter."
                        cta={<LaunchCta />} />
                    : <TerminalCoinTable coins={filteredTokens} title="Bonded · curve completed · by market cap" />
                )}
                {marketTab === "BONDING" && (
                  !loading && bonding.length === 0
                    ? <EmptyState icon="CRV" title="Nothing on the curve right now"
                        body="Fresh launches appear here with their live bonding-curve progress the moment Jupiter indexes them — and move to Bonded when the curve completes."
                        cta={<LaunchCta />} />
                    : <TerminalCoinTable coins={filteredTokens} title="Bonding · live curve progress via Jupiter" />
                )}
                {marketTab === "UPCOMING" && (
                  <EmptyState icon="UPC" title="No upcoming launches announced yet"
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
                    <li className="flex gap-2"><span className="font-mono text-[10px] text-zinc-400">01</span> Founder launches on kickstart.easya.io → contract mints ending in <span className="font-mono font-semibold text-zinc-700">EASY</span></li>
                    <li className="flex gap-2"><span className="font-mono text-[10px] text-zinc-400">02</span> Pair indexes on DexScreener → appears here in minutes, auto-classified Bonded</li>
                    <li className="flex gap-2"><span className="font-mono text-[10px] text-zinc-400">03</span> X account authorized (address-in-bio) → upgraded to Verified</li>
                  </ul>
                </Card>
              </div>
            </>
  );
}

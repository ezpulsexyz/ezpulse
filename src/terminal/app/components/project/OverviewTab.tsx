import { fmtNum, fmtUsd } from "../../../data";
import { BLUE, Card, Delta, InfoTip, Num, Stat } from "../../../components";
import {
  fmtPrice,
  isVerified,
  isGraduated,
  kickstartUrl,
  tokenNote,
  tokenSignals,
  type LiveLaunch,
} from "../../../kickstart";
import { HistoryChart } from "../HistoryChart";
import { ThesisGenerator } from "../ThesisGenerator";
import { YourPositionCard } from "../YourPositionCard";
import { PEER_GRID, TermNum, TermRowButton } from "../TermTable";
import type { Section } from "../../types";

export function OverviewTab({
  token,
  feed,
  goto,
  openToken,
  onViewSignals,
}: {
  token: LiveLaunch;
  feed: LiveLaunch[];
  goto: (s: Section) => void;
  openToken: (c: LiveLaunch) => void;
  onViewSignals: () => void;
}) {
  const note = tokenNote(token, feed);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
        <div
          className="col-span-2 rounded-2xl px-4 py-3.5 text-white md:col-span-1"
          style={{ background: `linear-gradient(135deg, ${BLUE}, #4f2ff0)` }}
        >
          <div className="text-[10px] font-semibold uppercase tracking-widest text-white/60">Market Cap</div>
          <div className="mt-0.5">
            <Num size="lg" bold>
              {token.mcap ? fmtUsd(token.mcap) : "—"}
            </Num>
          </div>
        </div>
        <Stat
          label="Price"
          value={token.priceUsd ? fmtPrice(token.priceUsd) : "—"}
          sub={<Delta v={token.change24h} suffix="% 24h" />}
        />
        <Stat
          label="Volume 24h"
          value={token.volume24h ? fmtUsd(token.volume24h) : "—"}
          sub={token.mcap ? `${((token.volume24h / token.mcap) * 100).toFixed(0)}% turnover` : ""}
        />
        <Stat
          label="Liquidity"
          value={token.liquidity ? fmtUsd(token.liquidity) : "—"}
          sub={token.mcap ? `${((token.liquidity / token.mcap) * 100).toFixed(0)}% of cap` : ""}
        />
        <Stat
          label={
            <span className="inline-flex items-center gap-1">
              Circulating supply
              <InfoTip text="Circulating supply is declared by teams and verified by reviewers. An API endpoint hosted on your corporate domain is preferred to keep the numbers updated. Manual input is discouraged and may delay reviews unless sufficient evidence is provided. If nothing is provided, we display FDV for MC on our platforms." />
            </span>
          }
          value={typeof token.circulatingSupply === "number" ? fmtNum(token.circulatingSupply) : "…"}
          sub={
            typeof token.circulatingSupply === "number"
              ? "via Jupiter · team verified"
              : "loading supply…"
          }
        />
        <Stat
          label={
            <span className="inline-flex items-center gap-1">
              Max supply
              <InfoTip text="Max supply is the maximum number of tokens that can ever be created. When unavailable, we fall back to total supply declared by the team." />
            </span>
          }
          value={
            typeof token.maxSupply === "number"
              ? fmtNum(token.maxSupply)
              : typeof token.totalSupply === "number"
                ? fmtNum(token.totalSupply)
                : "—"
          }
          sub={typeof token.maxSupply === "number" ? "Max supply" : "Total supply fallback"}
        />
        <Stat
          label={token.holderCount ? "Holders" : "Listed"}
          value={
            token.holderCount
              ? String(token.holderCount)
              : token.pairCreatedAt
                ? `${Math.max(1, Math.round((Date.now() - token.pairCreatedAt) / 86400000))}d`
                : "—"
          }
          sub={token.holderCount ? "via Jupiter" : "since pair creation"}
        />
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-3.5 shadow-sm">
        {isGraduated(token) ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-black tracking-widest text-white">
              🔗 BONDED
            </span>
            <span className="text-[13px] text-zinc-600">
              Bonding curve completed
              {token.graduatedAt ? ` on ${new Date(token.graduatedAt).toLocaleDateString()}` : ""} — graduated
              to an AMM pool.
            </span>
            <div className="ml-auto h-2 w-40 overflow-hidden rounded-full bg-zinc-100">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: "100%" }} />
            </div>
            <span className="text-[12px] font-bold tabular-nums text-emerald-600">100%</span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-amber-500 px-3 py-1 text-[10px] font-black tracking-widest text-white">
              ⏳ BONDING
            </span>
            <span className="text-[13px] text-zinc-600">
              Bonding Curve:{" "}
              <strong className="tabular-nums text-zinc-900">
                {typeof token.bondingCurve === "number"
                  ? `${Math.min(token.bondingCurve, 100).toFixed(1)}%`
                  : "—"}
              </strong>{" "}
              · live via Jupiter — graduates to Bonded at 100%.
            </span>
            <div className="ml-auto h-2 w-40 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${Math.min(token.bondingCurve ?? 0, 100)}%` }}
              />
            </div>
            <span className="text-[12px] font-bold tabular-nums text-amber-600">
              {typeof token.bondingCurve === "number"
                ? `${Math.min(token.bondingCurve, 100).toFixed(1)}%`
                : "—"}
            </span>
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card title="Live chart · DexScreener">
            <iframe
              title={`${token.symbol} chart`}
              src={`${token.links.dexscreener}?embed=1&theme=light&trades=0&info=0`}
              className="h-[min(420px,55vw)] min-h-[240px] w-full border-0 sm:h-[380px] lg:h-[420px]"
              loading="lazy"
            />
          </Card>

          <HistoryChart ca={token.ca} />

          <ThesisGenerator token={token} feed={feed} />

          <Card
            title="✨ AI Insights · live"
            right={
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-500">
                <span className="term-blink h-1.5 w-1.5 rounded-full bg-indigo-500" /> RECOMPUTED ON LOAD
              </span>
            }
          >
            {(() => {
              const sigs = tokenSignals(token, feed);
              const bulls = sigs.filter((s) => s.strength === "BULLISH").length;
              const bears = sigs.filter((s) => s.strength === "BEARISH").length;
              const bias = bulls > bears ? "BULLISH" : bears > bulls ? "BEARISH" : "MIXED";
              const top = sigs.filter((s) => s.strength !== "NEUTRAL").slice(0, 3);
              const turnover = token.mcap > 0 ? token.volume24h / token.mcap : 0;
              return (
                <>
                  <div className="flex flex-wrap items-center gap-3 border-b border-zinc-100 px-5 py-3.5">
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-black tracking-widest text-white ${
                        bias === "BULLISH"
                          ? "bg-emerald-600"
                          : bias === "BEARISH"
                            ? "bg-red-500"
                            : "bg-zinc-500"
                      }`}
                    >
                      {bias}
                    </span>
                    <span className="text-[12px] text-zinc-500">
                      {bulls} bullish · {bears} bearish · {sigs.length - bulls - bears} neutral signals
                    </span>
                    <button
                      type="button"
                      onClick={onViewSignals}
                      className="ml-auto text-[12px] font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      All signals →
                    </button>
                  </div>
                  <div className="grid gap-px bg-zinc-100 sm:grid-cols-3">
                    {top.map((s, i) => (
                      <div key={i} className="bg-white px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px]">
                            {s.kind === "WHALE"
                              ? "🐋"
                              : s.kind === "MOMENTUM"
                                ? s.strength === "BULLISH"
                                  ? "📈"
                                  : "📉"
                                : s.kind === "VOLUME"
                                  ? "🔊"
                                  : s.kind === "LIQUIDITY"
                                    ? "💧"
                                    : s.kind === "RANK"
                                      ? "👑"
                                      : "✓"}
                          </span>
                          <span
                            className={`text-[10px] font-black tracking-widest ${
                              s.strength === "BULLISH" ? "text-emerald-600" : "text-red-500"
                            }`}
                          >
                            {s.kind}
                          </span>
                        </div>
                        <div className="mt-1 text-[13px] font-bold leading-snug text-zinc-900">{s.title}</div>
                        <p className="mt-1 text-[11.5px] leading-relaxed text-zinc-500">{s.detail}</p>
                      </div>
                    ))}
                    {top.length === 0 && (
                      <div className="bg-white px-5 py-4 text-[13px] text-zinc-400 sm:col-span-3">
                        Quiet tape — no directional signals firing right now.
                      </div>
                    )}
                  </div>
                  {note && (
                    <div className="border-t border-zinc-100 px-5 py-3.5">
                      <p className="text-[12.5px] leading-relaxed text-zinc-600">
                        <span className="mr-1.5 font-bold text-zinc-900">Summary:</span>
                        {note.note}
                        {turnover > 0 && (
                          <span className="text-zinc-400">
                            {" "}
                            Daily turnover {(turnover * 100).toFixed(0)}% of cap · {token.buys24h} buys /{" "}
                            {token.sells24h} sells.
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </>
              );
            })()}
          </Card>

          <YourPositionCard token={token} goto={goto} />
        </div>

        <div className="space-y-4">
          {note && (
            <Card
              title="AI read · live"
              right={
                <span className={`rounded-full px-2.5 py-1 text-[9px] font-black tracking-widest text-white ${note.cls}`}>
                  {note.rating}
                </span>
              }
              pad
            >
              <p className="text-[13px] leading-relaxed text-zinc-600">{note.note}</p>
              <p className="mt-2 text-[10px] text-zinc-400">Computed from live DexScreener data. Not investment advice.</p>
            </Card>
          )}

          <Card title="Website & socials" pad>
            <div className="space-y-2">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Official</div>
              <a
                href={kickstartUrl(token.ca)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50/40 px-3.5 py-2.5 text-[13px] font-semibold text-indigo-700 transition hover:border-indigo-300"
              >
                🚀 <span className="min-w-0 flex-1 truncate">Kickstart project page</span>
                <span className="text-[10px] text-indigo-400">↗</span>
              </a>
              {token.links.website && !token.links.website.includes("kickstart.easya.io") ? (
                <a
                  href={token.links.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 rounded-xl border border-zinc-100 px-3.5 py-2.5 text-[13px] font-semibold text-zinc-700 transition hover:border-indigo-200 hover:text-indigo-700"
                >
                  🌐{" "}
                  <span className="min-w-0 flex-1 truncate">
                    {token.links.website.replace(/^https?:\/\/(www\.)?/, "")}
                  </span>
                  <span className="text-[10px] text-zinc-300">↗</span>
                </a>
              ) : !token.links.website ? (
                <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-zinc-200 px-3.5 py-2.5 text-[13px] text-zinc-400">
                  🌐 <span className="truncate">No website linked on-chain yet</span>
                </div>
              ) : null}

              <div className="mb-1 mt-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Socials</div>
              {token.links.x ? (
                <a
                  href={token.links.x}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 rounded-xl border border-zinc-100 px-3.5 py-2.5 text-[13px] font-semibold text-zinc-700 transition hover:border-indigo-200 hover:text-indigo-700"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 fill-current">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  <span className="min-w-0 flex-1 truncate">
                    {token.links.x.replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//, "@")}
                  </span>
                  {isVerified(token) && (
                    <span
                      className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[8px] font-black text-white"
                      style={{ background: BLUE }}
                      title="Authorized (address-in-bio)"
                    >
                      ✓
                    </span>
                  )}
                </a>
              ) : (
                <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-zinc-200 px-3.5 py-2.5 text-[13px] text-zinc-400">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 fill-current">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  <span className="truncate">No X account authorized yet</span>
                </div>
              )}
              {token.links.telegram && (
                <a
                  href={token.links.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 rounded-xl border border-zinc-100 px-3.5 py-2.5 text-[13px] font-semibold text-zinc-700 transition hover:border-indigo-200 hover:text-indigo-700"
                >
                  ✈️{" "}
                  <span className="min-w-0 flex-1 truncate">
                    {token.links.telegram.replace(/^https?:\/\//, "")}
                  </span>
                  <span className="text-[10px] text-zinc-300">↗</span>
                </a>
              )}

              <div className="mb-1 mt-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Market & chain
              </div>
              <a
                href={token.links.dexscreener}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 rounded-xl border border-zinc-100 px-3.5 py-2.5 text-[13px] font-semibold text-zinc-700 transition hover:border-indigo-200 hover:text-indigo-700"
              >
                📊 <span className="min-w-0 flex-1 truncate">DexScreener chart</span>
                <span className="text-[10px] text-zinc-300">↗</span>
              </a>
              <a
                href={`https://solscan.io/token/${token.ca}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 rounded-xl border border-zinc-100 px-3.5 py-2.5 text-[13px] font-semibold text-zinc-700 transition hover:border-indigo-200 hover:text-indigo-700"
              >
                🔍 <span className="min-w-0 flex-1 truncate">Solscan explorer</span>
                <span className="text-[10px] text-zinc-300">↗</span>
              </a>
              <a
                href={`https://jup.ag/tokens/${token.ca}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 rounded-xl border border-zinc-100 px-3.5 py-2.5 text-[13px] font-semibold text-zinc-700 transition hover:border-indigo-200 hover:text-indigo-700"
              >
                🪐 <span className="min-w-0 flex-1 truncate">Jupiter token page</span>
                <span className="text-[10px] text-zinc-300">↗</span>
              </a>
            </div>
          </Card>

          {feed.filter((x) => x.ca !== token.ca).length > 0 && (
            <Card title="Other live tokens">
              {feed
                .filter((x) => x.ca !== token.ca)
                .slice(0, 4)
                .map((x) => (
                  <TermRowButton key={x.ca} grid={PEER_GRID} onClick={() => openToken(x)} className="w-full">
                    <span className="truncate font-mono text-[12px] font-semibold text-zinc-900">
                      {x.name} <span className="text-zinc-400">${x.symbol}</span>
                    </span>
                    <TermNum>{x.mcap ? fmtUsd(x.mcap) : "—"}</TermNum>
                    <span className="flex justify-end">
                      <Delta v={x.change24h} suffix="%" />
                    </span>
                  </TermRowButton>
                ))}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
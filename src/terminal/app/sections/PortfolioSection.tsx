import { fetchLiveFeed, fmtPrice, isVerified, isPhantomAvailable } from "../../kickstart";
import { TokenAvatar } from "../components/TokenAvatar";
import { BLUE, Card, Delta, Stat } from "../../components";
import { LaunchSimulator } from "../components/LaunchSimulator";
import { PageHead, EmptyState } from "../components/PageLayout";
import { PhantomHint } from "../components/PhantomHint";
import { PORTFOLIO_COLS, PORTFOLIO_GRID, TermActions, TermHead, TermHeadCell, TermNum, TermRow } from "../components/TermTable";
import { useTerminalContext } from "../TerminalContext";

export function PortfolioSection() {
  const {
    feed,
    wallet,
    walletConnecting,
    walletErr,
    portfolio,
    setLiveFeed,
    loadPortfolio,
    signInPhantom,
    signOutPhantom,
    goto,
    openToken,
  } = useTerminalContext();

  return (
    <>
      <PageHead
        title="Portfolio"
        sub="Connect your wallet to see Kickstart holdings — read-only, no signatures, valued at live prices."
        right={
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-emerald-700">
            👻 Your wallet
          </span>
        }
      />

      {!wallet ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-10 shadow-sm">
          <div className="mx-auto max-w-md text-center">
            <div className="mb-3 text-4xl">💼</div>
            <h2 className="font-display text-xl font-semibold text-zinc-900">Connect your wallet</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
              Sign in with Phantom to load your Kickstart positions. We only read public token balances;{" "}
              <strong className="text-zinc-700">no signature is ever requested</strong>, nothing can be moved.
            </p>
            <button
              type="button"
              onClick={() => void signInPhantom()}
              disabled={walletConnecting}
              className="mt-6 rounded-full px-7 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white transition hover:-translate-y-px disabled:opacity-70"
              style={{ background: BLUE }}
            >
              {walletConnecting ? "Connecting…" : "👻 Connect Phantom"}
            </button>
            {!isPhantomAvailable() && (
              <div className="mx-auto mt-3 max-w-sm">
                <PhantomHint compact />
              </div>
            )}
            {walletErr && (
              <p className="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-[12px] text-red-600">{walletErr}</p>
            )}
            <p className="mt-4 text-[11px] text-zinc-400">
              Balances are read per token via Solana RPC — the same path used for thesis posting.
            </p>
            <LaunchSimulator coins={feed} defaultCa={feed[0]?.ca} />
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-3.5 shadow-sm">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-mono text-[12px] text-zinc-600">
                {wallet.slice(0, 6)}…{wallet.slice(-6)}
              </span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black tracking-widest text-emerald-600">
                CONNECTED
              </span>
              <a
                href={`https://solscan.io/account/${wallet}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-zinc-200 px-2.5 py-0.5 text-[9px] font-bold text-zinc-500 transition hover:border-indigo-300 hover:text-indigo-700"
                title="Verify these holdings independently on Solscan"
              >
                🔍 Verify on Solscan ↗
              </a>
            </span>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  const fresh = await fetchLiveFeed();
                  const launches = fresh?.launches;
                  if (launches) setLiveFeed(launches);
                  await loadPortfolio(wallet, launches);
                }}
                className="rounded-full border border-zinc-200 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-500 transition hover:border-indigo-300 hover:text-indigo-700"
              >
                ⟳ Refresh
              </button>
              <button
                type="button"
                onClick={signOutPhantom}
                className="rounded-full border border-zinc-200 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-500 transition hover:border-red-200 hover:text-red-500"
              >
                Disconnect
              </button>
            </div>
          </div>

          {portfolio === "loading" && (
            <Card pad>
              <div className="flex items-center gap-3 text-[13px] text-zinc-500">
                <span className="term-blink h-2 w-2 rounded-full bg-indigo-500" /> Reading token balances…
              </div>
            </Card>
          )}

          {portfolio === null && walletErr && (
            <Card pad>
              <p className="text-[13px] text-red-600">{walletErr}</p>
            </Card>
          )}

          {portfolio && portfolio !== "loading" && (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div
                  className="rounded-2xl px-5 py-4 text-white shadow-lg shadow-indigo-600/20"
                  style={{ background: `linear-gradient(135deg, ${BLUE}, #4f2ff0)` }}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-white/60">Kickstart value</div>
                  <div className="mt-1 font-display text-3xl font-semibold tabular-nums">
                    {portfolio.totalUsd >= 0.01
                      ? `$${portfolio.totalUsd.toFixed(2)}`
                      : portfolio.holdings.length
                        ? "<$0.01"
                        : "$0"}
                  </div>
                  <div className="mt-0.5 text-[11px] text-white/60">at live prices</div>
                </div>
                <Stat
                  label="◎ SOL balance"
                  value={
                    portfolio.sol
                      ? `${portfolio.sol.amount < 0.001 && portfolio.sol.amount > 0 ? "<0.001" : portfolio.sol.amount.toFixed(portfolio.sol.amount >= 100 ? 1 : 3)} SOL`
                      : "—"
                  }
                  sub={
                    portfolio.sol?.valueUsd != null
                      ? `≈ $${portfolio.sol.valueUsd.toFixed(2)} · via RPC`
                      : "native balance"
                  }
                />
                <Stat
                  label="Positions"
                  value={String(portfolio.holdings.length)}
                  sub={`${portfolio.scanned} featured tokens checked`}
                />
                <Stat
                  label="24h move"
                  value={(() => {
                    const t = portfolio.totalUsd;
                    if (!t || !portfolio.holdings.length) return "—";
                    const w = portfolio.holdings.reduce((s, h) => s + h.coin.change24h * h.valueUsd, 0) / t;
                    return `${w >= 0 ? "+" : ""}${w.toFixed(1)}%`;
                  })()}
                  sub="value-weighted · Kickstart only"
                />
              </div>

              {portfolio.holdings.length === 0 ? (
                <div className="mt-4">
                  <EmptyState
                    icon="🪙"
                    title="No featured Kickstart tokens in your wallet"
                    body={`Checked ${portfolio.scanned} featured token${portfolio.scanned !== 1 ? "s" : ""}${portfolio.sol ? ` and found ${portfolio.sol.amount.toFixed(3)} SOL` : ""} — none match your current Kickstart holdings on ezpulse.`}
                    cta={
                      <>
                        <button
                          type="button"
                          onClick={() => goto("market")}
                          className="rounded-full px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white"
                          style={{ background: BLUE }}
                        >
                          Browse the market →
                        </button>
                        <a
                          href={`https://solscan.io/account/${wallet}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border border-zinc-200 bg-white px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-zinc-600 transition hover:border-indigo-300 hover:text-indigo-700"
                        >
                          🔍 Verify on Solscan
                        </a>
                      </>
                    }
                  />
                </div>
              ) : (
                <Card
                  className="mt-4"
                  title="Holdings · featured Kickstart tokens"
                  right={
                    <span className="font-mono text-[11px] text-zinc-400">
                      valued live · DexScreener
                      {portfolio.fetchedAt
                        ? ` · synced ${Math.max(0, Math.round((Date.now() - portfolio.fetchedAt) / 1000))}s ago`
                        : ""}
                    </span>
                  }
                >
                  <TermHead cols={PORTFOLIO_COLS}>
                    <TermHeadCell>Token</TermHeadCell>
                    <TermHeadCell align="right">Balance</TermHeadCell>
                    <TermHeadCell align="right">Price</TermHeadCell>
                    <TermHeadCell align="right">24h</TermHeadCell>
                    <TermHeadCell align="right">Value</TermHeadCell>
                    <TermHeadCell align="right">Act</TermHeadCell>
                  </TermHead>
                  {portfolio.holdings.map((h) => (
                    <TermRow key={h.coin.ca} grid={PORTFOLIO_GRID}>
                      <button type="button" onClick={() => openToken(h.coin)} className="min-w-0 text-left">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <TokenAvatar
                            token={h.coin}
                            className="h-7 w-7 shrink-0 rounded-full border border-zinc-100 object-cover"
                            fallbackClassName="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-100 bg-zinc-100 text-[10px] font-bold text-zinc-500"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-mono text-[13px] font-semibold text-zinc-900">
                                {h.coin.name}
                              </span>
                              <span className="font-mono text-[11px] text-zinc-400">${h.coin.symbol}</span>
                              {isVerified(h.coin) && (
                                <span
                                  className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black text-white"
                                  style={{ background: BLUE }}
                                >
                                  ✓
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-[10px] text-zinc-400">
                              {h.coin.ca.slice(0, 4)}…{h.coin.ca.slice(-4)}
                            </div>
                          </div>
                        </div>
                      </button>
                      <TermNum className="hidden lg:block">
                        {h.amount >= 1_000_000
                          ? `${(h.amount / 1_000_000).toFixed(2)}M`
                          : h.amount >= 1000
                            ? `${(h.amount / 1000).toFixed(1)}K`
                            : h.amount.toFixed(2)}
                      </TermNum>
                      <TermNum className="hidden text-zinc-500 lg:block">
                        {h.coin.priceUsd ? fmtPrice(h.coin.priceUsd) : "—"}
                      </TermNum>
                      <span className="hidden justify-end lg:flex">
                        <Delta v={h.coin.change24h} suffix="%" />
                      </span>
                      <TermNum bold>{h.valueUsd >= 0.01 ? `$${h.valueUsd.toFixed(2)}` : "<$0.01"}</TermNum>
                      <TermActions>
                        <a
                          href={`https://solscan.io/account/${wallet}#portfolio`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`Verify ${h.coin.symbol} balance on Solscan`}
                          className="flex h-7 w-7 items-center justify-center rounded border border-zinc-200 bg-white font-mono text-[10px] text-zinc-500 transition hover:border-indigo-300 hover:text-indigo-700"
                        >
                          🔍
                        </a>
                        <button
                          type="button"
                          onClick={() => openToken(h.coin)}
                          className="rounded bg-zinc-900 px-2 py-1.5 font-mono text-[10px] font-bold text-white transition hover:-translate-y-px"
                        >
                          📟
                        </button>
                      </TermActions>
                    </TermRow>
                  ))}
                </Card>
              )}
              <LaunchSimulator
                coins={portfolio.holdings.length ? portfolio.holdings.map((h) => h.coin) : feed}
                defaultCa={portfolio.holdings[0]?.coin.ca}
                holdingHints={portfolio.holdings.map((h) => ({ ca: h.coin.ca, valueUsd: h.valueUsd }))}
              />

              <p className="mt-3 text-[11px] leading-relaxed text-zinc-400">
                Read-only: per-token balances via Solana RPC (same as thesis verification) —{" "}
                {portfolio.scanned} featured tokens checked. SOL priced via Jupiter. No signature was requested.
                Cross-check on{" "}
                <a
                  href={`https://solscan.io/account/${wallet}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-indigo-500 hover:text-indigo-700"
                >
                  Solscan ↗
                </a>
                .
              </p>
            </>
          )}
        </>
      )}
    </>
  );
}
import { useState } from "react";
import { fmtUsd } from "../../data";
import { BLUE, Card, Delta, Stat } from "../../components";
import { KIND_ICON } from "../../kickstart";
import type { LiveLaunch } from "../../kickstart";
import { useFounderProfile } from "../hooks/useFounderProfile";
import { SOURCE_ICON } from "../../founders";
import { KindBadge } from "./SignalBadges";
import { EmptyState, LoadingRows } from "./PageLayout";
import { STATS_COLS, STATS_GRID, TermHead, TermHeadCell, TermNum, TermRow, TermRowButton } from "./TermTable";

type FounderTab = "record" | "feed" | "forensics" | "sentiment";

const TABS: [FounderTab, string][] = [
  ["record", "🎯 Track Record"],
  ["feed", "📣 Build in Public"],
  ["forensics", "🔬 On-Chain Forensics"],
  ["sentiment", "💬 Sentiment & Verification"],
];

export function FounderTerminal({ token, feed, onOpenToken }: {
  token: LiveLaunch;
  feed: LiveLaunch[];
  onOpenToken: (c: LiveLaunch) => void;
}) {
  const profile = useFounderProfile(token, feed);
  const [tab, setTab] = useState<FounderTab>("record");

  if (!profile) return null;
  const { loading, founder, launches, performances, metrics, forensics, feed: posts, sentiment, signals } = profile;

  return (
    <div className="animate-fade-up">
      {/* conviction header */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white px-5 py-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-[9px] font-black tracking-widest text-white">FOUNDER TERMINAL</span>
            <span className="text-[11px] font-semibold text-indigo-600">Verified project · linked from ${token.symbol}</span>
          </div>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-zinc-900">{founder.displayName}</h2>
          {founder.bio && <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-zinc-500">{founder.bio}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {founder.xHandle && (
              <a href={`https://x.com/${founder.xHandle}`} target="_blank" rel="noopener noreferrer"
                className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-700 transition hover:border-indigo-300">
                𝕏 @{founder.xHandle}
              </a>
            )}
            {founder.github && (
              <a href={`https://github.com/${founder.github}`} target="_blank" rel="noopener noreferrer"
                className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-700 transition hover:border-indigo-300">
                GitHub ↗
              </a>
            )}
            <a href={`https://solscan.io/account/${founder.wallet}`} target="_blank" rel="noopener noreferrer"
              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 font-mono text-[11px] text-zinc-500 transition hover:border-indigo-300">
              {founder.wallet.slice(0, 4)}…{founder.wallet.slice(-4)} ⧉
            </a>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-center rounded-2xl border border-indigo-200 bg-white px-6 py-4 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Conviction Score</div>
          <div className="relative mt-1 flex h-20 w-20 items-center justify-center">
            <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e4e4e7" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.5" fill="none" stroke={BLUE} strokeWidth="3"
                strokeDasharray={`${metrics.convictionScore} 100`} strokeLinecap="round" />
            </svg>
            <span className="absolute font-display text-xl font-bold text-indigo-700">{metrics.convictionScore}</span>
          </div>
          <div className="mt-1 text-[10px] text-zinc-400">history + on-chain</div>
        </div>
      </div>

      {/* tabs */}
      <div className="mt-4 flex flex-wrap gap-1 rounded-full border border-zinc-200 bg-white p-1">
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`rounded-full px-4 py-2 text-[11px] font-bold transition ${tab === id ? "text-white" : "text-zinc-500 hover:text-zinc-800"}`}
            style={tab === id ? { background: BLUE } : undefined}>
            {label}
          </button>
        ))}
      </div>

      {loading && <Card className="mt-4"><LoadingRows /></Card>}

      {!loading && tab === "record" && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Stat label="Launches" value={String(metrics.launchCount)} sub="on Kickstart" accent />
            <Stat label="Avg exit multiple" value={`${metrics.avgExitMultiple}×`} sub="peak mcap / launch mcap" />
            <Stat label="7d survival" value={`${metrics.survival7d}%`} sub="mcap &gt; $5K threshold" />
            <Stat label="30d survival" value={`${metrics.survival30d}%`} sub="still trading" />
            <Stat label="Signal hit rate" value={metrics.signalHitRate !== null ? `${metrics.signalHitRate}%` : "—"} sub="founder tokens · +24h" />
          </div>

          <Card title="Past launches · performance">
            <TermHead cols={STATS_COLS} breakpoint="sm">
              <TermHeadCell>Token</TermHeadCell>
              <TermHeadCell align="right">Age</TermHeadCell>
              <TermHeadCell align="right">Exit ×</TermHeadCell>
              <TermHeadCell align="right">MCap</TermHeadCell>
              <TermHeadCell align="right">Status</TermHeadCell>
            </TermHead>
            {performances.map((p) => {
              const launch = launches.find((c) => c.ca === p.ca);
              return (
                <TermRowButton key={p.ca} grid={STATS_GRID} onClick={() => launch && onOpenToken(launch)} className="w-full">
                  <span className="truncate font-mono text-[12px] font-semibold text-zinc-900">{p.name} <span className="text-zinc-400">${p.symbol}</span></span>
                  <TermNum className="text-zinc-500">{p.ageDays}d</TermNum>
                  <TermNum className="text-indigo-600" bold>{p.exitMultiple}×</TermNum>
                  <TermNum>{p.currentMcap ? fmtUsd(p.currentMcap) : "—"}</TermNum>
                  <span className="flex justify-end gap-1">
                    {p.graduated && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">BONDED</span>}
                    {p.verified && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-bold text-indigo-700">✓</span>}
                  </span>
                </TermRowButton>
              );
            })}
          </Card>

          {signals && signals.length > 0 ? (
            <Card title="Resolved signals · founder tokens" right={<span className="text-[11px] text-zinc-400">snapshot-scored · +24h</span>}>
              {signals.slice(0, 15).map((r, i) => (
                <TermRowButton key={i} onClick={() => { const c = launches.find((x) => x.ca === r.ca); if (c) onOpenToken(c); }} className="w-full flex-wrap gap-2.5">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] ${r.hit ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>{r.hit ? "✓" : "✗"}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[12px]">{KIND_ICON[r.kind as keyof typeof KIND_ICON] ?? "•"}</span>
                      <span className="truncate font-mono text-[12px] font-semibold text-zinc-900">{r.title}</span>
                      <KindBadge kind={r.kind as import("../../../../shared/signals-core").SignalKind} />
                    </span>
                    <span className="font-mono text-[10px] text-zinc-400">${r.symbol} · {new Date(r.ts).toLocaleDateString()}</span>
                  </span>
                  <TermNum className={r.change_24h >= 0 ? "text-emerald-600" : "text-red-500"} bold>
                    {r.change_24h >= 0 ? "+" : ""}{r.change_24h.toFixed(1)}%
                  </TermNum>
                </TermRowButton>
              ))}
            </Card>
          ) : (
            <Card>
              <EmptyState icon="🎯" title="Signal record building"
                body="Founder-scoped signals appear here as the snapshot pipeline archives and resolves directional calls on this founder's tokens."
                cta={<span className="text-[11px] text-zinc-400">Same engine as the global Track Record · filtered to founder wallet</span>} />
            </Card>
          )}
        </div>
      )}

      {!loading && tab === "feed" && (
        <div className="mt-4 space-y-4">
          <Card title="Build in Public" right={<span className="text-[11px] text-zinc-400">X · GitHub · Kickstart · verified posts</span>}>
            {posts.length === 0 && (
              <div className="px-5 py-8 text-center text-[13px] text-zinc-400">No posts yet — founder activity will sync here.</div>
            )}
            {posts.map((p) => (
              <div key={p.id} className="border-b border-zinc-50 px-5 py-4 last:border-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px]">{SOURCE_ICON[p.source]}</span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-zinc-500">{p.source}</span>
                  <span className="font-mono text-[10px] text-zinc-400">{new Date(p.ts).toLocaleString()}</span>
                  {p.source === "manual" && (
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-bold text-indigo-600">✓ verified</span>
                  )}
                </div>
                <div className="mt-1.5 text-[14px] font-semibold text-zinc-900">{p.title}</div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-500">{p.body}</p>
                {p.url && (
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[12px] font-semibold text-indigo-600 hover:text-indigo-800">
                    Read more ↗
                  </a>
                )}
              </div>
            ))}
          </Card>
          <p className="text-[11px] text-zinc-400">
            Auto-sync from X and GitHub connects via the founder accounts backend. Manual posts are curator-verified until self-serve founder posting ships.
          </p>
        </div>
      )}

      {!loading && tab === "forensics" && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Rug risk" value={forensics.rugRisk} sub={forensics.rugFlags.length ? forensics.rugFlags[0] : "No flags"} accent={forensics.rugRisk === "LOW"} />
            <Stat label="Team concentration" value={`${forensics.teamConcentrationPct}%`} sub="top holders · estimated" />
            <Stat label="Dev holdings" value={forensics.devHoldingsUsd !== null ? fmtUsd(forensics.devHoldingsUsd) : "—"} sub="founder wallet · Kickstart tokens" />
            <Stat label="Post-launch activity" value={forensics.postLaunchActivity} sub="24h txn flow" />
          </div>

          <Card title="Wallet history" pad>
            <div className="space-y-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Founder wallet</div>
                <a href={`https://solscan.io/account/${forensics.founderWallet}`} target="_blank" rel="noopener noreferrer"
                  className="mt-1 block font-mono text-[12px] text-indigo-600 hover:text-indigo-800">
                  {forensics.founderWallet} ↗
                </a>
              </div>
              {forensics.priorLaunchCount > 0 && (
                <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-4 py-3 text-[12px] text-amber-900">
                  {forensics.priorLaunchCount} prior launch{forensics.priorLaunchCount !== 1 ? "es" : ""} linked to this wallet on Kickstart.
                </div>
              )}
              {forensics.rugFlags.length > 0 && (
                <div className="rounded-xl border border-red-100 bg-red-50/50 px-4 py-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-red-500">Flags</div>
                  <ul className="mt-1 space-y-1 text-[12px] text-red-800">
                    {forensics.rugFlags.map((f) => <li key={f}>· {f}</li>)}
                  </ul>
                </div>
              )}
              {forensics.rugFlags.length === 0 && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 text-[12px] text-emerald-800">
                  No rug-pattern flags on current on-chain data. Liquidity depth and verification checks passed.
                </div>
              )}
            </div>
          </Card>

          <Card title="Team wallets">
            {forensics.teamWallets.map((w) => (
              <TermRow key={w}>
                <a href={`https://solscan.io/account/${w}`} target="_blank" rel="noopener noreferrer"
                  className="font-mono text-[12px] text-indigo-600 hover:text-indigo-800">
                  {w}
                </a>
                <TermNum className="text-zinc-400">{w === forensics.founderWallet ? "primary" : "team"}</TermNum>
              </TermRow>
            ))}
          </Card>
        </div>
      )}

      {!loading && tab === "sentiment" && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className={`rounded-2xl px-5 py-4 text-white shadow-lg ${sentiment.label === "BULLISH" ? "bg-emerald-600" : sentiment.label === "BEARISH" ? "bg-red-500" : "bg-zinc-600"}`}>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-white/60">X / market sentiment</div>
              <div className="mt-1 font-display text-2xl font-semibold">{sentiment.label}</div>
              <div className="mt-0.5 text-[11px] text-white/70">score {sentiment.score}/100</div>
            </div>
            <Stat label="Buy pressure" value={`${sentiment.buyPressure}%`} sub="24h buy vs sell count" />
            <Stat label="Organic score" value={sentiment.organicScore !== null ? String(Math.round(sentiment.organicScore)) : "—"} sub="Jupiter organic rating" />
            <Stat label="24h move" value={`${token.change24h >= 0 ? "+" : ""}${token.change24h.toFixed(1)}%`} sub={<Delta v={token.change24h} suffix="%" />} />
          </div>

          <Card title="Sentiment trend · 5 checkpoints">
            <div className="flex h-24 items-end gap-2 px-5 py-4">
              {sentiment.trend.map((v, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full overflow-hidden rounded-t bg-zinc-100" style={{ height: 80 }}>
                    <div className="w-full rounded-t transition-all" style={{ height: `${v}%`, marginTop: `${100 - v}%`, background: BLUE }} />
                  </div>
                  <span className="font-mono text-[9px] text-zinc-400">t{i + 1}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Verified links" pad>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                ["X account", sentiment.xLinked, token.links.x, "Address-in-bio authorized"],
                ["Website", sentiment.websiteLinked, token.links.website, "On-chain metadata"],
                ["Kickstart", true, `https://kickstart.easya.io/token/${token.ca}`, "Canonical launch page"],
                ["Kickstart verified", sentiment.kickstartVerified, token.links.x, "X linked on-chain"],
              ].map(([label, ok, url, hint]) => (
                <div key={label as string} className={`flex items-center justify-between rounded-xl border px-4 py-3 ${ok ? "border-emerald-100 bg-emerald-50/30" : "border-zinc-200 bg-zinc-50"}`}>
                  <div>
                    <div className="text-[13px] font-semibold text-zinc-900">{label as string}</div>
                    <div className="text-[11px] text-zinc-400">{hint as string}</div>
                  </div>
                  {ok && url ? (
                    <a href={url as string} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[11px] font-bold text-indigo-600">↗</a>
                  ) : (
                    <span className="text-[11px] font-bold text-zinc-300">—</span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
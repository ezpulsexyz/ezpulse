import { useEffect, useState } from "react";
import { fmtUsd } from "./data";
import { ALUMNI, fetchLiveFeed, isVerified, kickstartUrl, type LiveLaunch } from "./kickstart";
import Legal, { type LegalPage } from "./Legal";
import { syncVote } from "./backend";
import { BLUE, CONTACT, X_URL, X_HANDLE, Logo, PulseMark } from "./brand";
import type { TerminalTarget } from "./Terminal";

type Page = "home" | "upcoming" | "roadmap" | "directory" | "about" | LegalPage;

function ArrowBtn({ children, ghost = false, onClick }: { children: React.ReactNode; ghost?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`group inline-flex items-center gap-2.5 rounded-full px-6 py-3 text-[13px] font-bold uppercase tracking-wide transition ${
        ghost
          ? "border border-indigo-200 bg-white text-indigo-700 hover:border-indigo-400"
          : "text-white shadow-lg shadow-indigo-600/25 hover:-translate-y-0.5 hover:shadow-xl"
      }`}
      style={ghost ? undefined : { background: BLUE }}
    >
      {!ghost && (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 transition group-hover:translate-x-0.5">→</span>
      )}
      {children}
    </button>
  );
}

function PageShell({ kicker, title, sub, children }: { kicker: string; title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-10">
        <div className="text-[11px] font-bold uppercase tracking-[.2em]" style={{ color: BLUE }}>{kicker}</div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">{title}</h1>
        <p className="mt-3 max-w-xl text-zinc-500">{sub}</p>
      </div>
      {children}
    </section>
  );
}

/* ── public feature board ── */
type FeatStatus = "SHIPPED" | "IN PROGRESS" | "PLANNED" | "EXPLORING";

interface Feature { id: string; title: string; body: string; status: FeatStatus; area: string; date?: string }

const FEATURES: Feature[] = [
  // shipped
  { id: "feed", title: "Live …EASY token feed", body: "Every Kickstart launch auto-discovered via the on-chain fingerprint, priced by DexScreener.", status: "SHIPPED", area: "Market", date: "Live" },
  { id: "terminal", title: "Project terminal pages", body: "Bloomberg-style page per token: chart, AI insights, position, links, peers.", status: "SHIPPED", area: "Research", date: "Live" },
  { id: "signals", title: "Real-time Signals feed", body: "Whale moves, momentum, volume spikes, rank battles — ecosystem-wide, recomputed live.", status: "SHIPPED", area: "Signals", date: "Live" },
  { id: "watchlist", title: "Watchlists + alert preferences", body: "Star tokens, choose alert events. Stored locally, no account needed.", status: "SHIPPED", area: "Tracking", date: "Live" },
  { id: "portfolio", title: "Watch-only Portfolio", body: "Paste any address or connect Phantom read-only — holdings valued at live prices.", status: "SHIPPED", area: "Portfolio", date: "Live" },
  { id: "indexes", title: "EasyA Indexes", body: "Composite, Verified, Momentum 5 and Liquid baskets, cap-weighted and live.", status: "SHIPPED", area: "Invest", date: "Live" },
  { id: "xverify", title: "X-authorization verification", body: "✓ requires an authorized X account (address-in-bio model). Link ≠ endorsement.", status: "SHIPPED", area: "Trust", date: "Live" },
  { id: "bell", title: "🔔 Watchlist notification bell", body: "In-app alerts when signals fire on watched tokens — price moves ±10%, whale bursts, volume spikes. Respects your alert preferences.", status: "SHIPPED", area: "Tracking", date: "Live" },
  { id: "phantom", title: "Phantom sign-in (read-only)", body: "One-click sign-in with Phantom — restores your watchlist across devices and auto-loads your portfolio. No signatures, ever.", status: "SHIPPED", area: "Account", date: "Live" },
  // in progress
  { id: "alerts", title: "Alert delivery (email / Telegram)", body: "The bell, but off-site — watchlist alerts that reach your inbox even when ezpulse is closed.", status: "IN PROGRESS", area: "Tracking" },
  { id: "coverage", title: "Full Kickstart coverage", body: "Every bonded launch pinned as CAs are confirmed — targeting 100% of the board.", status: "IN PROGRESS", area: "Market" },
  // planned
  { id: "upcoming", title: "Upcoming-launches feed", body: "Pre-launch tracking the moment Kickstart exposes an announcements feed.", status: "PLANNED", area: "Market" },
  { id: "track-record", title: "Public signal track record", body: "Every signal we fire, archived with outcomes — accountability as a feature.", status: "PLANNED", area: "Signals" },
  { id: "holders", title: "Holder & wallet-flow analytics", body: "Holder counts, concentration, smart-wallet inflows per token.", status: "PLANNED", area: "Research" },
  { id: "pnl", title: "Portfolio P&L history", body: "Cost-basis tracking and historical performance for watched wallets.", status: "PLANNED", area: "Portfolio" },
  // exploring
  { id: "thesis", title: "Investor Thesis — gated structured research", body: "Write bull/bear cases with falsifiable claims. Requires ≥$10 holding, founders respond on the record, prediction polls resolve from live data.", status: "EXPLORING", area: "Research" },
  { id: "smart", title: "Smart Investing strategies", body: "Rules-based allocation: index buys, signal triggers, guardrails.", status: "EXPLORING", area: "Invest" },
  { id: "api", title: "Public API", body: "The ezpulse feed, signals and scores as an API for funds and builders.", status: "EXPLORING", area: "Platform" },
  { id: "beyond", title: "Beyond Kickstart", body: "The same engine pointed at every startup-token launchpad.", status: "EXPLORING", area: "Platform" },
];

const STATUS_META: Record<FeatStatus, { icon: string; cls: string; chip: string; note: string }> = {
  "SHIPPED": { icon: "✅", cls: "border-emerald-200", chip: "bg-emerald-600 text-white", note: "Live in the product today" },
  "IN PROGRESS": { icon: "🔨", cls: "border-indigo-200", chip: "text-white", note: "Being built right now" },
  "PLANNED": { icon: "🗓", cls: "border-zinc-200", chip: "bg-zinc-200 text-zinc-600", note: "Committed, not yet started" },
  "EXPLORING": { icon: "💡", cls: "border-dashed border-zinc-300", chip: "bg-amber-100 text-amber-700", note: "Validating demand — vote!" },
};

function loadVotes(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem("ezpulse:votes") || "{}"); } catch { return {}; }
}

function FeatureBoard() {
  const [filter, setFilter] = useState<FeatStatus | "ALL">("ALL");
  const [votes, setVotes] = useState<Record<string, boolean>>(() => loadVotes());

  const toggleVote = (id: string) => {
    setVotes((v) => {
      const next = { ...v, [id]: !v[id] };
      try { localStorage.setItem("ezpulse:votes", JSON.stringify(next)); } catch { /* noop */ }
      syncVote(id, !!next[id]); // Supabase aggregate when configured
      return next;
    });
  };

  const statuses: FeatStatus[] = ["SHIPPED", "IN PROGRESS", "PLANNED", "EXPLORING"];
  const shown = filter === "ALL" ? statuses : [filter];
  const count = (s: FeatStatus) => FEATURES.filter((f) => f.status === s).length;

  return (
    <PageShell kicker="Public feature board" title="What's shipped, what's next" sub="Grouped by status, updated as we ship. Vote on anything not yet live — votes shape the order.">
      {/* filter pills */}
      <div className="mb-8 flex flex-wrap gap-1.5">
        <button onClick={() => setFilter("ALL")}
          className={`rounded-full px-4 py-2 text-[12px] font-bold transition ${filter === "ALL" ? "text-white" : "bg-zinc-100 text-zinc-500 hover:text-zinc-800"}`}
          style={filter === "ALL" ? { background: BLUE } : undefined}>
          All · {FEATURES.length}
        </button>
        {statuses.map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-2 text-[12px] font-bold transition ${filter === s ? "text-white" : "bg-zinc-100 text-zinc-500 hover:text-zinc-800"}`}
            style={filter === s ? { background: BLUE } : undefined}>
            {STATUS_META[s].icon} {s.charAt(0) + s.slice(1).toLowerCase()} · {count(s)}
          </button>
        ))}
      </div>

      {/* status groups */}
      <div className="space-y-10">
        {shown.map((status) => (
          <div key={status}>
            <div className="mb-3 flex items-baseline gap-3">
              <h2 className="text-[15px] font-bold text-zinc-900">{STATUS_META[status].icon} {status.charAt(0) + status.slice(1).toLowerCase()}</h2>
              <span className="text-[12px] text-zinc-400">{STATUS_META[status].note}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.filter((f) => f.status === status).map((f) => (
                <div key={f.id} className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${STATUS_META[status].cls}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-zinc-500">{f.area}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-black tracking-widest ${STATUS_META[status].chip}`} style={status === "IN PROGRESS" ? { background: BLUE } : undefined}>
                      {f.date ?? status}
                    </span>
                  </div>
                  <h3 className="mt-2.5 text-[14px] font-bold leading-snug text-zinc-900">{f.title}</h3>
                  <p className="mt-1 flex-1 text-[12.5px] leading-relaxed text-zinc-500">{f.body}</p>
                  {status !== "SHIPPED" ? (
                    <button onClick={() => toggleVote(f.id)}
                      className={`mt-3 flex items-center justify-center gap-1.5 rounded-full border py-2 text-[11px] font-bold uppercase tracking-wide transition ${
                        votes[f.id] ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-zinc-200 text-zinc-500 hover:border-indigo-300 hover:text-indigo-700"
                      }`}>
                      {votes[f.id] ? "▲ Voted — thanks!" : "▲ Vote for this"}
                    </button>
                  ) : (
                    <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-600">
                      ✓ Shipped & live
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-10 text-[12px] text-zinc-400">
        Votes are stored locally in this preview and guide prioritization. Have something that's not on the board? Tell us — <a href={`mailto:${CONTACT}?subject=%5BFeature%5D`} className="font-semibold text-indigo-600 hover:text-indigo-800">{CONTACT}</a> or the Kickstart Telegram.
      </p>
    </PageShell>
  );
}

/* ── the landing site ── */
export default function Landing({ onOpenApp }: { onOpenApp: (t?: TerminalTarget) => void }) {
  const [page, setPage] = useState<Page>("home");
  const [feed, setFeed] = useState<LiveLaunch[] | "loading" | null>("loading");

  useEffect(() => {
    let alive = true;
    fetchLiveFeed().then((f) => { if (alive) setFeed(f ? f.launches : null); });
    return () => { alive = false; };
  }, []);

  const coins = Array.isArray(feed) ? feed : [];
  const liveMcap = coins.reduce((s, c) => s + c.mcap, 0);
  const nav = (p: Page) => { setPage(p); window.scrollTo({ top: 0 }); };

  const SITE_PAGES: [Page, string][] = [["upcoming", "Upcoming"], ["roadmap", "Feature Board"], ["directory", "Directory"], ["about", "About"]];
  const APP_LINKS: [string, TerminalTarget][] = [
    ["Market", { section: "market", marketTab: "ALL" }],
    ["Verified", { section: "market", marketTab: "VERIFIED" }],
    ["Rankings", { section: "market", marketTab: "TRENDING" }],
  ];

  return (
    <div className="min-h-screen bg-[#fbfbfd] font-sans text-zinc-900" style={{ colorScheme: "light" }}>
      {/* nav */}
      <nav className="sticky top-0 z-40 border-b border-zinc-100 bg-[#fbfbfd]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <button onClick={() => nav("home")}>
            <Logo />
          </button>
          <div className="hidden items-center gap-6 text-[13px] lg:flex">
            {SITE_PAGES.map(([p, label]) => (
              <button key={p} onClick={() => nav(p)}
                className={`transition ${page === p ? "font-semibold text-zinc-900" : "text-zinc-600 hover:text-zinc-900"}`}>
                {label}
              </button>
            ))}
            <span className="h-4 w-px bg-zinc-200" />
            {APP_LINKS.map(([label, t]) => (
              <button key={label} onClick={() => onOpenApp(t)} className="flex items-center gap-1 text-zinc-600 transition hover:text-indigo-700">
                {label} <span className="text-[10px] text-zinc-300">↗</span>
              </button>
            ))}
          </div>
          <ArrowBtn onClick={() => onOpenApp()}>Open Terminal</ArrowBtn>
        </div>
      </nav>

      {/* ═══ HOME — minimal ═══ */}
      {page === "home" && (
        <>
          <header className="mx-auto max-w-6xl px-6 pb-20 pt-20 text-center md:pt-28">
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/60 px-4 py-1.5 text-[12px] font-bold" style={{ color: BLUE }}>
              <span className="term-blink h-1.5 w-1.5 rounded-full bg-red-500" />
              {feed === "loading" ? "Connecting to the live market…" : `CA 5d9VvLtAZQWtyL9EZ3cHWpgdfyeWetwYuiG6746EASY`}
            </div>
            <h1 className="mx-auto max-w-3xl text-5xl font-semibold leading-[1.06] tracking-tight md:text-6xl">
              The Bloomberg Terminal for <span className="relative whitespace-nowrap">startup tokens<svg className="absolute -bottom-2 left-0 w-full" height="10" viewBox="0 0 300 10" preserveAspectRatio="none"><path d="M0 7 h95 l12 -5 l18 7 l14 -6 l8 3 H300" fill="none" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" opacity=".85" /></svg></span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-500">
              Every EasyA Kickstart launch — live prices, real-time signals, and a research page per project. Which tokens are worth your attention today?
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <ArrowBtn onClick={() => onOpenApp()}>Open Terminal</ArrowBtn>
              <ArrowBtn ghost onClick={() => nav("directory")}>Browse Directory</ArrowBtn>
            </div>

            {/* live strip */}
            <div className="mx-auto mt-14 max-w-2xl overflow-hidden rounded-2xl border border-zinc-200 bg-white text-left shadow-[0_30px_60px_-30px_rgba(39,67,240,.25)]">
              <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                <span className="flex items-center gap-1.5"><span className="term-blink h-1.5 w-1.5 rounded-full bg-red-500" /> Live Kickstart tokens</span>
                <button onClick={() => onOpenApp({ section: "market" })} className="text-indigo-600 hover:text-indigo-800">Open market →</button>
              </div>
              {feed === "loading" && <div className="px-4 py-6 text-center text-[12px] text-zinc-400">Scanning for …EASY contracts…</div>}
              {Array.isArray(feed) && coins.length === 0 && <div className="px-4 py-6 text-center text-[12px] text-zinc-400">New launches appear the moment their pair is indexed.</div>}
              {coins.slice(0, 5).map((c, i) => (
                <button key={c.ca} onClick={() => onOpenApp({ section: "market" })} className="flex w-full items-center gap-3 border-b border-zinc-50 px-4 py-2.5 text-left text-[13px] last:border-0 hover:bg-zinc-50">
                  <span className="w-5 text-zinc-300">{i + 1}</span>
                  {c.icon && <img src={c.icon} alt="" className="h-5 w-5 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                  <span className="font-semibold text-zinc-900">{c.name}</span>
                  <span className="hidden text-[11px] text-zinc-400 sm:inline">${c.symbol}</span>
                  {isVerified(c) && <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-black text-white" style={{ background: BLUE }}>✓</span>}
                  <span className="ml-auto font-semibold tabular-nums text-zinc-700">{c.mcap ? fmtUsd(c.mcap) : "—"}</span>
                  <span className={`w-16 text-right text-[12px] font-semibold tabular-nums ${c.change24h >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {c.change24h >= 0 ? "▲" : "▼"} {Math.abs(c.change24h).toFixed(1)}%
                  </span>
                </button>
              ))}
            </div>

            {/* proof line */}
            <p className="mx-auto mt-10 max-w-lg text-[13px] text-zinc-400">
              From the ecosystem that produced <span className="font-semibold text-zinc-600">Cognition AI ($26B)</span>, <span className="font-semibold text-zinc-600">Listen Labs ($500M)</span> and multiple YC companies.
            </p>
          </header>
        </>
      )}

      {/* ═══ UPCOMING ═══ */}
      {page === "upcoming" && (
        <PageShell kicker="Before launch" title="Upcoming launches" sub="Pre-launch Kickstart projects — announced before their token goes live.">
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-14 text-center">
            <div className="mb-3 text-4xl">⏳</div>
            <h2 className="text-xl font-semibold text-zinc-900">No upcoming launches announced yet</h2>
            <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-zinc-500">
              Kickstart is permissionless — founders launch at any moment, and new tokens appear in the live market automatically the instant their <span className="font-mono font-bold text-indigo-600">…EASY</span> pair is created. Pre-launch tracking arrives when Kickstart publishes an upcoming-launches feed.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <a href="https://kickstart.easya.io" target="_blank" rel="noopener noreferrer"
                className="rounded-full px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white" style={{ background: BLUE }}>
                Launch on Kickstart →
              </a>
              <button onClick={() => onOpenApp({ section: "market" })}
                className="rounded-full border border-zinc-200 bg-white px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-zinc-600 transition hover:border-indigo-300 hover:text-indigo-700">
                See what's already live →
              </button>
            </div>
          </div>
        </PageShell>
      )}

      {/* ═══ PUBLIC FEATURE BOARD ═══ */}
      {page === "roadmap" && <FeatureBoard />}

      {/* ═══ ABOUT ═══ */}
      {page === "about" && (
        <PageShell kicker="Company" title="About ezpulse" sub="The research terminal for startup tokens — starting with the EasyA Kickstart ecosystem.">
          <div className="mb-10 flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <PulseMark size={56} />
            <div>
              <div className="text-[15px] font-bold text-zinc-900">ezpulse.xyz</div>
              <p className="mt-0.5 text-[13px] leading-relaxed text-zinc-500">
                Pronounced "easy pulse" — because reading the market's heartbeat should be easy.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-zinc-900">Why we exist</h2>
              <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-zinc-600">
                EasyA hackathons have produced a $26B company (Cognition AI), a $500M Series B (Listen Labs), and multiple YC admits.
                Now the same ecosystem launches ideas as tokens on Kickstart — permissionless, fast, and chaotic. Great ideas and noise
                land on the same curve, minutes apart. ezpulse exists to make that market <em>legible</em>: one terminal where every
                launch is verified, priced, signaled, and researchable.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold tracking-tight text-zinc-900">What we believe</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {[
                  ["Live or nothing", "Every number on this site is read from public on-chain data at load time. No cached dashboards, no invented metrics, no mockups."],
                  ["Verify, don't trust", "Only contracts carrying the Kickstart fingerprint — addresses ending in EASY — are listed. The ✓ badge means the project's X account is authorized (address-in-bio), never endorsement."],
                  ["Read-only by design", "Watch-only portfolios, no signatures, no custody. We are an instrument panel, not a counterparty."],
                  ["Complementary, not competitive", "Kickstart creates the market; ezpulse creates the information efficiency. More launches → better data → smarter capital → more launches."],
                ].map(([t, b]) => (
                  <div key={t} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="text-[14px] font-bold text-zinc-900">{t}</div>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">{b}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold tracking-tight text-zinc-900">Where it goes</h2>
              <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-zinc-600">
                Today: the discovery terminal for Kickstart — live market, signals, watchlists, indexes, watch-only portfolios.
                Next: alerts that reach you, and a public track record for every signal we fire. Later: the same engine pointed at
                every startup-token launchpad, with Kickstart as the proven first market. See the <button onClick={() => nav("roadmap")} className="font-semibold text-indigo-600 hover:text-indigo-800">feature board</button> — and vote on what ships next.
              </p>
            </div>

            <div className="rounded-2xl px-8 py-8 text-white" style={{ background: `linear-gradient(135deg, ${BLUE}, #4f2ff0)` }}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Talk to us</h2>
                  <p className="mt-1 text-[13px] text-white/70">Feedback shapes the roadmap. Founders, investors, partners — we read everything.</p>
                </div>
                <div className="flex gap-3">
                  <a href={`mailto:${CONTACT}`} className="rounded-full bg-white px-5 py-2.5 text-[12px] font-bold uppercase tracking-wide text-indigo-700 transition hover:-translate-y-0.5">
                    {CONTACT}
                  </a>
                  <a href={X_URL} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/40 px-5 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white transition hover:bg-white/10">
                    𝕏 {X_HANDLE}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </PageShell>
      )}

      {/* ═══ LEGAL PAGES ═══ */}
      {(page === "terms" || page === "privacy" || page === "disclaimer" || page === "cookies") && <Legal page={page} />}

      {/* ═══ DIRECTORY ═══ */}
      {page === "directory" && (
        <PageShell kicker="The ecosystem" title="Directory" sub="Every live Kickstart token, plus the alumni that prove this ecosystem produces real outcomes.">
          {/* live tokens */}
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13px] font-bold uppercase tracking-widest text-zinc-400">Live tokens · on-chain now</h2>
            <button onClick={() => onOpenApp({ section: "market" })} className="text-[12px] font-semibold text-indigo-600 hover:text-indigo-800">Open in terminal →</button>
          </div>
          <div className="mb-12 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            {feed === "loading" && <div className="px-5 py-8 text-center text-[13px] text-zinc-400">Scanning for …EASY contracts…</div>}
            {Array.isArray(feed) && coins.length === 0 && <div className="px-5 py-8 text-center text-[13px] text-zinc-400">New launches appear here automatically.</div>}
            {coins.map((c, i) => (
              <div key={c.ca} className="flex w-full items-center gap-3 border-b border-zinc-50 px-5 py-3 text-left last:border-0 hover:bg-indigo-50/30">
                <span className={`w-5 text-[12px] font-semibold tabular-nums ${i < 3 ? "text-indigo-600" : "text-zinc-300"}`}>{i + 1}</span>
                <button onClick={() => onOpenApp({ section: "projects" })} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  {c.icon && <img src={c.icon} alt="" className="h-7 w-7 rounded-full border border-zinc-100" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold text-zinc-900">{c.name}</span>
                      <span className="text-[11px] text-zinc-400">${c.symbol}</span>
                      {isVerified(c) && <span className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black text-white" style={{ background: BLUE }}>✓</span>}
                      {c.graduatedAt
                        ? <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[8px] font-black tracking-widest text-emerald-600">🔗 BONDED</span>
                        : <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[8px] font-black tracking-widest text-amber-600">⏳ BONDING {typeof c.bondingCurve === "number" ? `${Math.min(c.bondingCurve, 100).toFixed(0)}%` : ""}</span>}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-zinc-400">{c.ca.slice(0, 6)}…{c.ca.slice(-6)}</div>
                  </div>
                </button>
                <span className="hidden text-[13px] font-semibold tabular-nums text-zinc-800 sm:block">{c.mcap ? fmtUsd(c.mcap) : "—"}</span>
                <span className={`w-16 text-right text-[12px] font-semibold tabular-nums ${c.change24h >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {c.change24h >= 0 ? "▲" : "▼"} {Math.abs(c.change24h).toFixed(1)}%
                </span>
                <a href={kickstartUrl(c.ca)} target="_blank" rel="noopener noreferrer" title="Open on Kickstart"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50/50 text-[12px] transition hover:-translate-y-px hover:border-indigo-300">
                  🚀
                </a>
              </div>
            ))}
          </div>

          {/* alumni */}
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13px] font-bold uppercase tracking-widest text-zinc-400">Alumni · real outcomes from EasyA hackathons</h2>
            <span className="text-[12px] font-semibold" style={{ color: BLUE }}>$26.5B+ created</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ALUMNI.map((a) => (
              <div key={a.name} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-bold text-zinc-900">{a.name}</span>
                  <span className="font-semibold" style={{ color: BLUE }}>{a.outcome}</span>
                </div>
                <p className="mt-2 text-[12.5px] leading-relaxed text-zinc-500">{a.now}</p>
                {a.backers && <div className="mt-3 border-t border-zinc-100 pt-2 text-[11px] text-zinc-400">Backed by {a.backers.join(" · ")}</div>}
              </div>
            ))}
          </div>
        </PageShell>
      )}

      {/* CTA — every page */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-4">
        <div className="rounded-3xl px-8 py-14 text-center text-white" style={{ background: `linear-gradient(135deg, ${BLUE}, #4f2ff0)` }}>
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">Know which tokens are worth your attention — today</h2>
          <p className="mx-auto mt-3 max-w-md text-[14px] text-white/70">Live market · real-time signals · a research page per project. Free.</p>
          <button onClick={() => onOpenApp()} className="mt-7 rounded-full bg-white px-8 py-3.5 text-[13px] font-bold uppercase tracking-wide text-indigo-700 shadow-lg transition hover:-translate-y-0.5">
            Open Terminal →
          </button>
        </div>
      </section>

      {/* footer — built for trust */}
      <footer className="border-t border-zinc-100 bg-white pt-14">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-10 pb-12 md:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">
            {/* brand + trust statement */}
            <div>
              <Logo />
              <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-zinc-500">
                ezpulse.xyz — independent research terminal for the EasyA Kickstart ecosystem. Every number on this site is read live from public on-chain data; we list nothing we can't verify.
              </p>
              <div className="mt-4 space-y-1.5 text-[11px] text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${coins.length ? "bg-emerald-500" : "bg-amber-400"}`} />
                  {feed === "loading" ? "Connecting to data feed…" : coins.length ? `Feed live · ${coins.length} tokens · DexScreener public API` : "Feed connected · awaiting launches"}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-indigo-500">…EASY</span> only verified Kickstart contracts are listed
                </div>
              </div>
            </div>

            {/* Product */}
            <div>
              <div className="mb-3 text-[10px] font-black uppercase tracking-[.18em] text-zinc-400">Product</div>
              <ul className="space-y-2 text-[13px]">
                {([["Market", { section: "market", marketTab: "ALL" }],
                   ["Verified", { section: "market", marketTab: "VERIFIED" }],
                   ["Rankings", { section: "market", marketTab: "TRENDING" }],
                   ["Signals", { section: "signals" }],
                   ["Watchlist", { section: "watchlist" }],
                   ["EasyA Indexes", { section: "indexes" }]] as [string, TerminalTarget][]).map(([label, t]) => (
                  <li key={label}>
                    <button onClick={() => onOpenApp(t)} className="text-zinc-600 transition hover:text-indigo-700">{label}</button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <div className="mb-3 text-[10px] font-black uppercase tracking-[.18em] text-zinc-400">Resources</div>
              <ul className="space-y-2 text-[13px]">
                <li><button onClick={() => nav("directory")} className="text-zinc-600 transition hover:text-indigo-700">Directory</button></li>
                <li><button onClick={() => nav("upcoming")} className="text-zinc-600 transition hover:text-indigo-700">Upcoming launches</button></li>
                <li><button onClick={() => nav("roadmap")} className="text-zinc-600 transition hover:text-indigo-700">Feature Board</button></li>
                <li><a href="https://kickstart.easya.io/guide" target="_blank" rel="noopener noreferrer" className="text-zinc-600 transition hover:text-indigo-700">Launch guide ↗</a></li>
                <li><a href="https://docs.dexscreener.com/api/reference" target="_blank" rel="noopener noreferrer" className="text-zinc-600 transition hover:text-indigo-700">Data sources ↗</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <div className="mb-3 text-[10px] font-black uppercase tracking-[.18em] text-zinc-400">Company</div>
              <ul className="space-y-2 text-[13px]">
                <li><button onClick={() => nav("about")} className="text-zinc-600 transition hover:text-indigo-700">About</button></li>
                <li><button onClick={() => nav("roadmap")} className="text-zinc-600 transition hover:text-indigo-700">Feature Board</button></li>
                <li><a href={`mailto:${CONTACT}`} className="text-zinc-600 transition hover:text-indigo-700">Contact</a></li>
                <li><a href={`mailto:${CONTACT}?subject=%5BPress%5D`} className="text-zinc-600 transition hover:text-indigo-700">Press</a></li>
                <li><a href={`mailto:${CONTACT}?subject=%5BPartnerships%5D`} className="text-zinc-600 transition hover:text-indigo-700">Partnerships</a></li>
              </ul>
            </div>

            {/* Legal + Social */}
            <div>
              <div className="mb-3 text-[10px] font-black uppercase tracking-[.18em] text-zinc-400">Legal</div>
              <ul className="space-y-2 text-[13px]">
                <li><button onClick={() => nav("terms")} className="text-zinc-600 transition hover:text-indigo-700">Terms of Service</button></li>
                <li><button onClick={() => nav("privacy")} className="text-zinc-600 transition hover:text-indigo-700">Privacy Policy</button></li>
                <li><button onClick={() => nav("disclaimer")} className="text-zinc-600 transition hover:text-indigo-700">Disclaimer</button></li>
                <li><button onClick={() => nav("cookies")} className="text-zinc-600 transition hover:text-indigo-700">Cookie Policy</button></li>
                <li><a href="https://kickstart.easya.io/terms" target="_blank" rel="noopener noreferrer" className="text-zinc-600 transition hover:text-indigo-700">Kickstart terms ↗</a></li>
              </ul>
              <div className="mb-3 mt-6 text-[10px] font-black uppercase tracking-[.18em] text-zinc-400">Social</div>
              <div className="flex gap-2">
                <a href={X_URL} target="_blank" rel="noopener noreferrer" title={`X — ${X_HANDLE}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white transition hover:border-indigo-300">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-zinc-500"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="https://t.me/+dye5SyxtRx1kYTll" target="_blank" rel="noopener noreferrer" title="Telegram — community"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-[13px] text-zinc-500 transition hover:border-indigo-300 hover:text-indigo-600">✈️</a>
                <a href="https://kickstart.easya.io" target="_blank" rel="noopener noreferrer" title="EasyA Kickstart"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-[11px] font-black text-zinc-500 transition hover:border-indigo-300 hover:text-indigo-600">K</a>
              </div>
            </div>
          </div>

          {/* disclaimer strip — the trust builder */}
          <div className="border-t border-zinc-100 py-5">
            <p className="max-w-4xl text-[11px] leading-relaxed text-zinc-400">
              ezpulse is an independent analytics platform and is not affiliated with, endorsed by, or operated by EasyA. Market data is provided by the DexScreener
              public API and may be delayed or incomplete. Nothing on this site is investment advice, an offer, or a solicitation — idea-coins launched on permissionless
              launchpads are highly speculative, are not equity, and may lose all value. Signals and AI reads are automated interpretations of public data, not recommendations.
              Always verify contract addresses (Kickstart contracts end in <span className="font-mono font-semibold text-zinc-500">EASY</span>) and do your own research.
            </p>
          </div>

          {/* bottom bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 py-5 text-[12px] text-zinc-400">
            <span>© 2026 ezpulse · ezpulse.xyz. All rights reserved.</span>
            <span className="font-medium text-zinc-500">Momentum is measurable.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

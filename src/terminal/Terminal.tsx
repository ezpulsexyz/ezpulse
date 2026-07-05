import { useEffect, useMemo, useRef, useState } from "react";
import { fmtUsd } from "./data";
import { BLUE, Card, Delta, Stat } from "./components";
import { Logo } from "./brand";
import { syncWatchlist, pullWalletWatchlist } from "./backend";

/* ─── Watchlist notifications ─── */
interface Notif { key: string; icon: string; strength: "BULLISH" | "BEARISH" | "NEUTRAL"; title: string; detail: string; token: LiveLaunch }

function loadSeenNotifs(): string[] {
  try { return JSON.parse(localStorage.getItem("ezpulse:notifs-seen") || "[]"); } catch { return []; }
}
function saveSeenNotifs(keys: string[]) {
  try { localStorage.setItem("ezpulse:notifs-seen", JSON.stringify(keys.slice(-200))); } catch { /* noop */ }
}

/* ─── Boot screen: shown until the live feed arrives ─── */
const BOOT_STEPS = [
  "Connecting to Jupiter…",
  "Scanning for …EASY contracts…",
  "Reading bonding-curve state…",
  "Pricing via DexScreener…",
  "Ranking by market cap…",
];

function BootScreen({ slow, onSkip }: { slow: boolean; onSkip: () => void }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, BOOT_STEPS.length - 1)), 900);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="boot-fade flex min-h-screen flex-col items-center justify-center bg-[#fbfbfd] px-6 font-sans" style={{ colorScheme: "light" }}>
      {/* logo + animated pulse line */}
      <div className="flex flex-col items-center">
        <Logo size={44} textClass="text-[22px]" />
        <svg viewBox="0 0 300 40" className="mt-6 w-64" fill="none">
          <path d="M0 20 h70 l10 -12 l14 24 l12 -18 l8 6 h60 l10 -12 l14 24 l12 -18 l8 6 H300"
            stroke="#e4e4e7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M0 20 h70 l10 -12 l14 24 l12 -18 l8 6 h60 l10 -12 l14 24 l12 -18 l8 6 H300"
            stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="pulse-sweep" />
        </svg>
        {/* staged status */}
        <div className="mt-6 flex h-5 items-center gap-2 text-[13px] text-zinc-500">
          <span className="term-blink h-1.5 w-1.5 rounded-full" style={{ background: BLUE }} />
          <span key={step} className="animate-fade-up">{BOOT_STEPS[step]}</span>
        </div>

      </div>
      {/* slow-connection escape hatch */}
      <div className={`mt-10 text-center transition-opacity duration-500 ${slow ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <p className="text-[12px] text-zinc-400">Feeds are taking longer than usual.</p>
        <button onClick={onSkip} className="mt-2 rounded-full border border-zinc-200 bg-white px-5 py-2 text-[11px] font-bold uppercase tracking-wide text-zinc-600 transition hover:border-indigo-300 hover:text-indigo-700">
          Enter anyway →
        </button>
      </div>
      <p className="absolute bottom-6 text-[10px] text-zinc-300">100% live on-chain data · nothing simulated</p>
    </div>
  );
}
import {
  ALUMNI, fetchLiveFeed, fmtPrice, isVerified, isGraduated, verifiedOf, bondedOf, trendingOf, tokenNote,
  tokenSignals, ecosystemSignals, INDEXES, indexStats, loadWatchlist, saveWatchlist, loadAlertPrefs, saveAlertPrefs,
  fetchPortfolio, connectPhantomReadOnly, isValidSolAddress, kickstartUrl,
  type LiveLaunch, type AlertPrefs, type Holding,
} from "./kickstart";

/** Lifecycle badge: real bonding-curve state from Jupiter. */
function CurveBadge({ c }: { c: LiveLaunch }) {
  if (isGraduated(c)) {
    return <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[8px] font-black tracking-widest text-emerald-600">🔗 BONDED</span>;
  }
  const pct = typeof c.bondingCurve === "number" ? Math.min(c.bondingCurve, 100) : null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[8px] font-black tracking-widest text-amber-600">
      ⏳ BONDING{pct !== null && <span className="tabular-nums">{pct.toFixed(0)}%</span>}
      {pct !== null && (
        <span className="ml-0.5 inline-block h-1 w-8 overflow-hidden rounded-full bg-amber-200/60">
          <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
        </span>
      )}
    </span>
  );
}

type Section = "market" | "projects" | "signals" | "watchlist" | "portfolio" | "smart" | "indexes" | "thesis";
type MarketTab = "ALL" | "TRENDING" | "VERIFIED" | "BONDED" | "BONDING" | "UPCOMING";

/* Navigation mirrors the investment workflow: Discover → Research → Track → Invest */
const NAV_GROUPS: { workflow: string; items: { id: Section; icon: string; label: string; soon?: boolean }[] }[] = [
  { workflow: "Discover", items: [{ id: "market", icon: "◉", label: "Market" }] },
  { workflow: "Research", items: [
    { id: "projects", icon: "📟", label: "Projects" },
    { id: "thesis", icon: "🧠", label: "Investor Thesis", soon: true },
  ]},
  { workflow: "Track", items: [
    { id: "signals", icon: "⚡", label: "Signals" },
    { id: "watchlist", icon: "★", label: "Watchlist" },
  ]},
  { workflow: "Invest", items: [
    { id: "indexes", icon: "🧺", label: "EasyA Indexes" },
    { id: "portfolio", icon: "💼", label: "Portfolio" },
    { id: "smart", icon: "🤖", label: "Smart Investing", soon: true },
  ]},
];

/* ─── coin row ─── */
function CoinRow({ c, i, onOpen, copiedCa, copyCa, metric, watched, onWatch }: {
  c: LiveLaunch; i: number; onOpen: (c: LiveLaunch) => void; copiedCa: string | null; copyCa: (ca: string) => void; metric?: React.ReactNode;
  watched?: boolean; onWatch?: (ca: string) => void;
}) {
  return (
    <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 border-b border-zinc-50 px-5 py-3 text-left transition last:border-0 hover:bg-indigo-50/30">
      <span className={`w-5 text-[12px] font-semibold tabular-nums ${i < 3 ? "text-indigo-600" : "text-zinc-300"}`}>{i + 1}</span>
      <button onClick={() => onOpen(c)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        {c.icon && <img src={c.icon} alt="" className="h-7 w-7 rounded-full border border-zinc-100" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[14px] font-semibold text-zinc-900">{c.name}</span>
            <span className="text-[11px] font-semibold text-zinc-400">${c.symbol}</span>
            {isVerified(c) && <span className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black text-white" style={{ background: BLUE }} title="Verified — X account authorized (address-in-bio). Confirms the link only, not the project — DYOR.">✓</span>}
            <CurveBadge c={c} />
            {c.pairCreatedAt && Date.now() - c.pairCreatedAt < 3 * 86400000 && (
              <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[8px] font-black tracking-widest text-red-500">NEW</span>
            )}
            {typeof c.holderCount === "number" && c.holderCount > 0 && (
              <span className="hidden text-[10px] text-zinc-400 xl:inline" title="Holders · via Jupiter">👥 {c.holderCount}</span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span onClick={(e) => { e.stopPropagation(); copyCa(c.ca); }} title={c.ca}
              className="flex cursor-pointer items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-700">
              {copiedCa === c.ca ? "✓ copied" : (
                <>{c.ca.slice(0, 4)}…{/easy$/i.test(c.ca)
                  ? <><span>{c.ca.slice(-8, -4)}</span><span className="font-black text-indigo-600">{c.ca.slice(-4)}</span></>
                  : c.ca.slice(-4)} ⧉</>
              )}
            </span>
            <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">SOL</span>
            {/* mobile-only inline metrics (columns hidden below lg) */}
            <span className="text-[11px] font-semibold tabular-nums text-zinc-700 lg:hidden">{c.mcap ? fmtUsd(c.mcap) : "—"}</span>
            <span className={`text-[11px] font-semibold tabular-nums lg:hidden ${c.change24h >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {c.change24h >= 0 ? "▲" : "▼"}{Math.abs(c.change24h).toFixed(1)}%
            </span>
          </div>
        </div>
      </button>
      {metric ?? (
        <>
          <span className="hidden w-20 text-right text-[13px] font-semibold tabular-nums text-zinc-800 lg:block">{c.priceUsd ? fmtPrice(c.priceUsd) : "—"}</span>
          <span className="hidden w-16 text-right lg:block"><Delta v={c.change24h} suffix="%" /></span>
          <span className="hidden w-20 text-right text-[13px] font-semibold tabular-nums text-zinc-800 lg:block">{c.mcap ? fmtUsd(c.mcap) : "—"}</span>
          <span className="hidden w-20 text-right text-[12px] tabular-nums text-zinc-500 lg:block">{c.volume24h ? fmtUsd(c.volume24h) : "—"}</span>
        </>
      )}
      {onWatch && (
        <button onClick={() => onWatch(c.ca)} title={watched ? "Remove from watchlist" : "Add to watchlist"}
          className={`text-[16px] transition hover:scale-110 ${watched ? "text-amber-500" : "text-zinc-300 hover:text-amber-400"}`}>
          {watched ? "★" : "☆"}
        </button>
      )}
      <a href={kickstartUrl(c.ca)} target="_blank" rel="noopener noreferrer" title="Open on Kickstart"
        onClick={(e) => e.stopPropagation()}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50/50 text-[12px] transition hover:-translate-y-px hover:border-indigo-300">
        🚀
      </a>
      <button onClick={() => onOpen(c)} className="rounded-lg bg-zinc-900 px-2.5 py-1.5 text-[10px] font-bold text-white transition hover:-translate-y-px">
        📟 Terminal
      </button>
    </div>
  );
}

function ColumnHead() {
  return (
    <div className="hidden items-center gap-3 border-b border-zinc-100 px-5 py-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 lg:flex">
      <span className="w-5">#</span>
      <span className="flex-1">Token</span>
      <span className="w-20 text-right">Price</span>
      <span className="w-16 text-right">24h</span>
      <span className="w-20 text-right">MCap</span>
      <span className="w-20 text-right">Vol 24h</span>
      <span className="w-20 text-right" />
    </div>
  );
}

function PageHead({ title, sub, right }: { title: string; sub: string; right?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-900">{title}</h1>
        <p className="mt-0.5 text-[13px] text-zinc-500">{sub}</p>
      </div>
      {right}
    </div>
  );
}

function LoadingRows() {
  return (
    <div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-3 border-b border-zinc-50 px-5 py-4 last:border-0">
          <div className="h-7 w-7 rounded-full bg-zinc-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-40 rounded bg-zinc-100" />
            <div className="h-2 w-64 rounded bg-zinc-50" />
          </div>
          <div className="h-3 w-16 rounded bg-zinc-100" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon, title, body, cta }: { icon: string; title: string; body: string; cta?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
      <div className="mb-2 text-3xl">{icon}</div>
      <h2 className="font-display text-lg font-semibold text-zinc-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-zinc-500">{body}</p>
      {cta && <div className="mt-5 flex flex-wrap justify-center gap-3">{cta}</div>}
    </div>
  );
}

const LaunchCta = () => (
  <>
    <a href="https://kickstart.easya.io" target="_blank" rel="noopener noreferrer"
      className="rounded-full px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white" style={{ background: BLUE }}>
      Launch on Kickstart →
    </a>
    <a href="https://t.me/+PYEPxw-L9n81NDA0" target="_blank" rel="noopener noreferrer"
      className="rounded-full border border-zinc-200 bg-white px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-zinc-600 transition hover:border-indigo-300 hover:text-indigo-700">
      ✈️ Join the chat
    </a>
  </>
);

export type TerminalTarget = { section?: Section; marketTab?: MarketTab };

/* ═══════════ main ═══════════ */
export default function Terminal({ target }: { target?: TerminalTarget }) {
  const [section, setSection] = useState<Section>(target?.section ?? "market");
  const [marketTab, setMarketTab] = useState<MarketTab>(target?.marketTab ?? "ALL");
  const [selected, setSelected] = useState<LiveLaunch | null>(null);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [liveFeed, setLiveFeed] = useState<LiveLaunch[] | null | "loading">("loading");
  const [copiedCa, setCopiedCa] = useState<string | null>(null);
  const [watchlist, setWatchlist] = useState<string[]>(() => loadWatchlist());
  const [alerts, setAlerts] = useState<AlertPrefs>(() => loadAlertPrefs());
  const [wallet, setWallet] = useState<string | null>(null);
  const [addrInput, setAddrInput] = useState("");
  const [walletErr, setWalletErr] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<{ holdings: Holding[]; totalUsd: number; scanned: number } | null | "loading">(null);
  const [phantom, setPhantom] = useState<string | null>(() => { try { return localStorage.getItem("ezpulse:phantom"); } catch { return null; } });
  const [notifOpen, setNotifOpen] = useState(false);
  const [seenNotifs, setSeenNotifs] = useState<string[]>(() => loadSeenNotifs());
  const [projTab, setProjTab] = useState<"overview" | "signals">("overview");
  const searchRef = useRef<HTMLInputElement>(null);

  const [signinNudge, setSigninNudge] = useState(false);

  const toggleWatch = (ca: string) => {
    if (!phantom) {
      // watchlist requires sign-in — show nudge instead of silently failing
      setSigninNudge(true);
      setTimeout(() => setSigninNudge(false), 3500);
      return;
    }
    setWatchlist((wl) => {
      const next = wl.includes(ca) ? wl.filter((x) => x !== ca) : [...wl, ca];
      saveWatchlist(next);
      syncWatchlist(next, phantom); // wallet-keyed sync
      return next;
    });
  };

  /* Phantom sign-in: read-only connect, restores wallet-keyed watchlist, powers Portfolio */
  const signInPhantom = async () => {
    const addr = await connectPhantomReadOnly();
    if (!addr) {
      setWalletErr("Phantom not detected or connection declined.");
      return;
    }
    setPhantom(addr);
    try { localStorage.setItem("ezpulse:phantom", addr); } catch { /* noop */ }
    // restore cross-device watchlist if one exists under this wallet
    const remote = await pullWalletWatchlist(addr);
    if (remote?.length) {
      const merged = [...new Set([...watchlist, ...remote])];
      setWatchlist(merged);
      saveWatchlist(merged);
      syncWatchlist(merged, addr);
    } else if (watchlist.length) {
      syncWatchlist(watchlist, addr);
    }
    // auto-load portfolio for the signed-in wallet
    await watchWallet(addr);
  };

  const signOutPhantom = () => {
    setPhantom(null);
    try { localStorage.removeItem("ezpulse:phantom"); } catch { /* noop */ }
  };


  const setAlert = (k: keyof AlertPrefs) => {
    setAlerts((a) => {
      const next = { ...a, [k]: !a[k] };
      saveAlertPrefs(next);
      return next;
    });
  };

  const watchWallet = async (addr: string) => {
    const a = addr.trim();
    if (!isValidSolAddress(a)) { setWalletErr("That doesn't look like a valid Solana address."); return; }
    setWalletErr(null);
    setWallet(a);
    setPortfolio("loading");
    // Wait for the live feed if it's still loading — otherwise holdings can never match.
    let fd = Array.isArray(liveFeed) ? liveFeed : [];
    if (liveFeed === "loading") {
      const fresh = await fetchLiveFeed();
      fd = fresh ? fresh.launches : [];
      if (fresh) setLiveFeed(fresh.launches);
    }
    const p = await fetchPortfolio(a, fd);
    setPortfolio(p);
    if (p === null) setWalletErr("Couldn't reach a Solana RPC — try again in a moment.");
  };

  // Re-match holdings when the live feed arrives after a wallet was already watched.
  useEffect(() => {
    if (!wallet || !Array.isArray(liveFeed) || liveFeed.length === 0) return;
    if (portfolio && portfolio !== "loading" && portfolio.holdings.length === 0 && portfolio.scanned > 0) {
      fetchPortfolio(wallet, liveFeed).then((p) => { if (p) setPortfolio(p); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveFeed]);

  const connectPhantom = async () => {
    setWalletErr(null);
    await signInPhantom(); // full sign-in: watchlist restore + portfolio load
  };

  const disconnectWallet = () => { setWallet(null); setPortfolio(null); setAddrInput(""); setWalletErr(null); };

  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [booted, setBooted] = useState(false);
  const [bootSlow, setBootSlow] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () => fetchLiveFeed().then((feed) => {
      if (!alive) return;
      if (feed) { setLiveFeed(feed.launches); setLastUpdated(Date.now()); }
      else setLiveFeed((prev) => (Array.isArray(prev) ? prev : null));
      setBooted(true); // fetch settled (success or not) — enter the terminal
    });
    load();
    const slowTimer = setTimeout(() => setBootSlow(true), 6000);   // offer escape hatch
    const failTimer = setTimeout(() => setBooted(true), 15000);    // never trap the user
    const timer = setInterval(load, 60_000); // auto-refresh every 60s
    return () => { alive = false; clearInterval(timer); clearTimeout(slowTimer); clearTimeout(failTimer); };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchRef.current) { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape") { setSelected(null); setQuery(""); searchRef.current?.blur(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const copyCa = async (ca: string) => {
    try { await navigator.clipboard.writeText(ca); } catch { /* noop */ }
    setCopiedCa(ca);
    setTimeout(() => setCopiedCa(null), 1500);
  };

  const feed = Array.isArray(liveFeed) ? liveFeed : [];
  const loading = liveFeed === "loading";
  const verified = verifiedOf(feed);
  const bonded = bondedOf(feed);
  const bonding = feed.filter((c) => !isGraduated(c));
  const trending = trendingOf(feed);
  const totalMcap = feed.reduce((s, c) => s + c.mcap, 0);
  const totalVol = feed.reduce((s, c) => s + c.volume24h, 0);

  /* Notifications: live signals firing on watched tokens */
  const notifs: Notif[] = useMemo(() => {
    if (!feed.length || !watchlist.length) return [];
    const out: Notif[] = [];
    const day = new Date().toISOString().slice(0, 10); // re-notify daily per signal type
    for (const c of feed.filter((x) => watchlist.includes(x.ca))) {
      for (const s of tokenSignals(c, feed)) {
        if (s.strength === "NEUTRAL") continue;
        if (s.kind === "MOMENTUM" && Math.abs(c.change24h) < 10) continue; // alert prefs: ±10%
        if (s.kind === "MOMENTUM" && !alerts.priceMove) continue;
        if (s.kind === "VOLUME" && !alerts.volumeSpike) continue;
        if (s.kind === "VERIFY" && !alerts.verification) continue;
        out.push({
          key: `${c.ca}:${s.kind}:${s.strength}:${day}`,
          icon: s.kind === "WHALE" ? "🐋" : s.kind === "MOMENTUM" ? (s.strength === "BULLISH" ? "📈" : "📉") : s.kind === "VOLUME" ? "🔊" : s.kind === "LIQUIDITY" ? "💧" : s.kind === "RANK" ? "👑" : "✓",
          strength: s.strength, title: s.title, detail: s.detail, token: c,
        });
      }
    }
    return out;
  }, [feed, watchlist, alerts]);
  const unseenCount = notifs.filter((n) => !seenNotifs.includes(n.key)).length;

  const openNotifs = () => {
    setNotifOpen((v) => !v);
    if (!notifOpen && unseenCount > 0) {
      const next = [...new Set([...seenNotifs, ...notifs.map((n) => n.key)])];
      setSeenNotifs(next);
      saveSeenNotifs(next);
    }
  };
  const topMover = feed.length ? feed.reduce((a, b) => (b.change24h > a.change24h ? b : a)) : null;

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q) return null;
    return feed.filter((c) => (c.name + c.symbol + c.ca).toLowerCase().includes(q));
  }, [q, feed]);

  const goto = (s: Section) => { setSection(s); setSelected(null); setMenuOpen(false); setQuery(""); setNotifOpen(false); window.scrollTo({ top: 0 }); };
  const openToken = (c: LiveLaunch) => { setSelected(c); setSection("projects"); setMenuOpen(false); setQuery(""); window.scrollTo({ top: 0 }); };

  const note = selected ? tokenNote(selected, feed) : null;

  const CoinTable = ({ coins, title, right }: { coins: LiveLaunch[]; title: string; right?: React.ReactNode }) => (
    <Card title={title} right={right}>
      {loading && <LoadingRows />}
      {!loading && coins.length === 0 && (
        <div className="px-5 py-10 text-center text-[13px] text-zinc-400">Nothing here yet — new launches index automatically.</div>
      )}
      {!loading && coins.length > 0 && (
        <>
          <ColumnHead />
          {coins.map((c, i) => (
            <CoinRow key={c.ca} c={c} i={i} onOpen={openToken} copiedCa={copiedCa} copyCa={copyCa}
              watched={watchlist.includes(c.ca)} onWatch={toggleWatch} />
          ))}
        </>
      )}
    </Card>
  );

  /* boot gate: hold on the loading screen until the coin list has been fetched */
  if (!booted) {
    return <BootScreen slow={bootSlow} onSkip={() => setBooted(true)} />;
  }

  return (
    <div className="boot-fade flex min-h-screen bg-[#fbfbfd] font-sans text-zinc-900" style={{ colorScheme: "light" }}>
      {/* sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col overflow-y-auto border-r border-zinc-200 bg-white transition-transform lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="px-5 py-5">
          <Logo />
        </div>
        <nav className="px-3">
          {NAV_GROUPS.map((g) => (
            <div key={g.workflow} className="mb-3">
              <div className="mb-1 px-3 text-[9px] font-black uppercase tracking-[.2em] text-zinc-400">{g.workflow}</div>
              <div className="space-y-0.5">
                {g.items.map((n) => (
                  <button key={n.id} onClick={() => goto(n.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13.5px] transition ${
                      section === n.id ? "bg-indigo-50 font-semibold text-indigo-700" : "text-zinc-600 hover:bg-zinc-50"
                    }`}>
                    <span className="w-4 text-center text-[12px]">{n.icon}</span> {n.label}
                    {n.soon && <span className="ml-auto rounded bg-zinc-100 px-1.5 py-px text-[8px] font-black tracking-widest text-zinc-400">SOON</span>}
                    {n.id === "signals" && feed.length > 0 && <span className="ml-auto flex items-center gap-1 text-[9px] font-bold text-red-500"><span className="term-blink h-1.5 w-1.5 rounded-full bg-red-500" />LIVE</span>}
                    {n.id === "watchlist" && watchlist.length > 0 && <span className="ml-auto rounded-full bg-amber-50 px-1.5 text-[9px] font-bold text-amber-500">{watchlist.length}</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="mx-3 mt-4 rounded-xl bg-zinc-50 p-3.5 text-[11px] leading-relaxed text-zinc-500">
          <span className="font-bold text-zinc-700">100% live data.</span> Only contracts ending in <span className="font-mono font-bold text-indigo-600">EASY</span> — the Kickstart on-chain fingerprint — are listed.
        </div>
        <div className="mt-auto border-t border-zinc-100 px-5 py-4 text-[11px] text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${feed.length ? "bg-emerald-500" : "bg-amber-400"}`} />
            {loading ? "Connecting…" : feed.length ? `Live · ${feed.length} tokens · Jupiter + DexScreener` : "Awaiting new launches"}
          </span>
        </div>
      </aside>
      {menuOpen && <div className="fixed inset-0 z-30 bg-zinc-900/30 lg:hidden" onClick={() => setMenuOpen(false)} />}

      {/* main */}
      <div className="min-w-0 flex-1 lg:ml-60">
        <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 lg:px-8">
            <button onClick={() => setMenuOpen(true)} className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-zinc-500 lg:hidden">☰</button>
            <div className="relative min-w-0 max-w-xl flex-1">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">⌕</span>
              <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder='Search live Kickstart tokens…  ( / )'
                className="w-full rounded-full border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-8 text-[13px] outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100" />
              {query && <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">✕</button>}
              {results && <div className="fixed inset-0 z-30" onClick={() => setQuery("")} />}
              {results && (
                <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-xl animate-fade-up">
                  {results.length === 0 && <div className="px-4 py-6 text-center text-[13px] text-zinc-400">No matches for “{query}”</div>}
                  {results.map((c) => (
                    <button key={c.ca} onClick={() => openToken(c)} className="flex w-full items-center gap-3 px-4 py-2 text-left text-[13px] hover:bg-indigo-50/50">
                      <span className="font-semibold text-zinc-900">{c.name}</span>
                      <span className="text-[11px] text-zinc-400">${c.symbol}</span>
                      <span className="ml-auto font-semibold tabular-nums text-zinc-700">{c.mcap ? fmtUsd(c.mcap) : "—"}</span>
                      <Delta v={c.change24h} suffix="%" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className={`hidden items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold sm:flex ${feed.length ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}
              title={lastUpdated ? `Last updated ${new Date(lastUpdated).toLocaleTimeString()} · auto-refreshes every 60s` : undefined}>
              <span className={`term-blink h-1.5 w-1.5 rounded-full ${feed.length ? "bg-emerald-500" : "bg-zinc-400"}`} />
              {loading ? "Scanning…" : "Live"}
              {lastUpdated && !loading && <span className="hidden font-normal text-emerald-600/60 lg:inline">· {new Date(lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
            </span>

            {/* 🔔 watchlist notifications */}
            <div className="relative">
              <button onClick={openNotifs} title="Watchlist notifications"
                className={`relative flex h-9 w-9 items-center justify-center rounded-full border transition ${notifOpen ? "border-indigo-300 bg-indigo-50" : "border-zinc-200 bg-white hover:border-indigo-300"}`}>
                <span className="text-[15px]">🔔</span>
                {unseenCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">
                    {unseenCount > 9 ? "9+" : unseenCount}
                  </span>
                )}
              </button>
              {notifOpen && <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />}
              {notifOpen && (
                <div className="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl animate-fade-up sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80">
                  <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Watchlist alerts</span>
                    <button onClick={() => { setNotifOpen(false); goto("watchlist"); }} className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800">Preferences →</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {!phantom && (
                      <div className="px-4 py-6 text-center text-[12px] text-zinc-400">
                        <button onClick={() => { setNotifOpen(false); signInPhantom(); }} className="font-semibold text-indigo-600 hover:text-indigo-800">👻 Sign in with Phantom</button> to star tokens and get alerts.
                      </div>
                    )}
                    {phantom && watchlist.length === 0 && (
                      <div className="px-4 py-6 text-center text-[12px] text-zinc-400">Star tokens (☆) to get alerts when their signals fire.</div>
                    )}
                    {watchlist.length > 0 && notifs.length === 0 && (
                      <div className="px-4 py-6 text-center text-[12px] text-zinc-400">All quiet on your {watchlist.length} watched token{watchlist.length !== 1 ? "s" : ""} — no signals firing.</div>
                    )}
                    {notifs.map((n) => (
                      <button key={n.key} onClick={() => { setNotifOpen(false); openToken(n.token); }}
                        className="flex w-full items-start gap-2.5 border-b border-zinc-50 px-4 py-3 text-left last:border-0 hover:bg-indigo-50/40">
                        <span className="mt-0.5 text-[14px]">{n.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-[12.5px] font-bold text-zinc-900">{n.title}</span>
                            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[7px] font-black tracking-widest text-white ${n.strength === "BULLISH" ? "bg-emerald-600" : "bg-red-500"}`}>{n.strength}</span>
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-zinc-500">{n.token.name} ${n.token.symbol}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-zinc-100 bg-zinc-50/60 px-4 py-2 text-[10px] text-zinc-400">
                    Live · recomputed every 60s · email delivery coming soon
                  </div>
                </div>
              )}
            </div>

            {/* 👻 Phantom sign-in */}
            {phantom ? (
              <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white py-1 pl-3 pr-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="hidden font-mono text-[11px] text-zinc-600 sm:inline">{phantom.slice(0, 4)}…{phantom.slice(-4)}</span>
                <span className="font-mono text-[11px] text-zinc-600 sm:hidden">{phantom.slice(0, 3)}…</span>
                <button onClick={signOutPhantom} title="Sign out" className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700">✕</button>
              </div>
            ) : (
              <button onClick={signInPhantom}
                className="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-bold uppercase tracking-wide text-white transition hover:-translate-y-px sm:px-4" style={{ background: BLUE }}>
                👻 <span className="hidden sm:inline">Sign in</span>
              </button>
            )}
          </div>
        </header>

        {/* sign-in nudge toast */}
        {signinNudge && (
          <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 animate-fade-up">
            <button onClick={() => { setSigninNudge(false); signInPhantom(); }}
              className="flex items-center gap-2.5 rounded-full border border-indigo-200 bg-white px-5 py-3 text-[13px] font-semibold text-zinc-800 shadow-xl">
              👻 <span>Sign in with Phantom to use your watchlist</span>
              <span className="rounded-full px-3 py-1 text-[11px] font-bold text-white" style={{ background: BLUE }}>Sign in</span>
            </button>
          </div>
        )}

        <main key={section} className="animate-fade-up px-4 py-6 lg:px-8">
          {/* ═══ DISCOVER · MARKET ═══ */}
          {section === "market" && (
            <>
              <PageHead title="Market" sub="Discover opportunities — the EasyA Kickstart token market, live and on-chain." />

              {/* stat cards drive the filter */}
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <div className="rounded-2xl px-5 py-4 text-white shadow-lg shadow-indigo-600/20" style={{ background: `linear-gradient(135deg, ${BLUE}, #4f2ff0)` }}>
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-white/60">Market Cap</div>
                  <div className="mt-1 font-display text-3xl font-semibold tabular-nums">{loading ? "…" : fmtUsd(totalMcap)}</div>
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
              <div className="mt-4 flex gap-1 overflow-x-auto rounded-full border border-zinc-200 bg-white p-1" style={{ width: "fit-content", maxWidth: "100%" }}>
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
                  <CoinTable coins={[...feed].sort((a, b) => b.mcap - a.mcap)} title="🏆 All live Kickstart tokens · by market cap"
                    right={<span className="text-[11px] text-zinc-400">{feed.length} tokens · {fmtUsd(totalMcap)} combined · {fmtUsd(totalVol)} vol 24h</span>} />
                )}
                {marketTab === "TRENDING" && (
                  <CoinTable coins={trending} title="🔥 Trending Today · ranked by 24h move"
                    right={<span className="text-[11px] text-zinc-400">recomputed on every load</span>} />
                )}
                {marketTab === "VERIFIED" && (
                  !loading && verified.length === 0
                    ? <EmptyState icon="✓" title="No verified tokens right now"
                        body="A token is verified when its X account is authorized — the project links its X this way, following Kickstart's address-in-bio model. It confirms the link only, not the project. Bonded tokens upgrade automatically once their X is indexed."
                        cta={<LaunchCta />} />
                    : <CoinTable coins={verified} title="✓ Verified Kickstart tokens · by market cap" />
                )}
                {marketTab === "BONDED" && (
                  !loading && bonded.length === 0
                    ? <EmptyState icon="🔗" title="No graduated tokens yet"
                        body="A token is Bonded once it completes its bonding curve and graduates to an AMM pool — real state read live from Jupiter."
                        cta={<LaunchCta />} />
                    : <CoinTable coins={[...bonded].sort((a, b) => b.mcap - a.mcap)} title="🔗 Bonded · curve completed (graduated) · by market cap" />
                )}
                {marketTab === "BONDING" && (
                  !loading && bonding.length === 0
                    ? <EmptyState icon="⏳" title="Nothing on the curve right now"
                        body="Fresh launches appear here with their live bonding-curve progress the moment Jupiter indexes them — and move to Bonded when the curve completes."
                        cta={<LaunchCta />} />
                    : <CoinTable coins={[...bonding].sort((a, b) => (b.bondingCurve ?? 0) - (a.bondingCurve ?? 0))} title="⏳ Bonding · live curve progress via Jupiter" />
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
          )}

          {/* ═══ TRACK · SIGNALS ═══ */}
          {section === "signals" && (
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
          )}

          {/* ═══ RESEARCH · PROJECTS ═══ */}
          {section === "projects" && (
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
                            <Delta v={c.change24h} suffix="%" />
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
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {selected.icon && <img src={selected.icon} alt="" className="h-12 w-12 rounded-full border border-zinc-100" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-900">{selected.name}</h1>
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
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => toggleWatch(selected.ca)}
                        className={`rounded-full px-5 py-2.5 text-[12px] font-bold uppercase tracking-wide transition ${
                          watchlist.includes(selected.ca)
                            ? "text-white shadow-lg" : "border border-zinc-200 bg-white text-zinc-600 hover:border-amber-300 hover:text-amber-600"
                        }`}
                        style={watchlist.includes(selected.ca) ? { background: "#f59e0b" } : undefined}>
                        {watchlist.includes(selected.ca) ? "★ Watching" : "☆ Watch"}
                      </button>
                      {isGraduated(selected) ? (
                        <a href={selected.links.dexscreener} target="_blank" rel="noopener noreferrer"
                          className="rounded-full px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white shadow-lg transition hover:-translate-y-px" style={{ background: "#0b0e13" }}>
                          📊 Trade →
                        </a>
                      ) : (
                        <a href={kickstartUrl(selected.ca)} target="_blank" rel="noopener noreferrer"
                          className="rounded-full px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white shadow-lg shadow-indigo-600/25 transition hover:-translate-y-px" style={{ background: BLUE }}>
                          🚀 Buy on Kickstart →
                        </a>
                      )}
                      <a href={kickstartUrl(selected.ca)} target="_blank" rel="noopener noreferrer"
                        className="rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-[12px] font-bold uppercase tracking-wide text-zinc-600 transition hover:border-indigo-300 hover:text-indigo-700">
                        Kickstart page ↗
                      </a>
                    </div>
                  </div>

                  {/* tabs */}
                  <div className="mt-5 flex gap-1 rounded-full border border-zinc-200 bg-white p-1" style={{ width: "fit-content" }}>
                    {([["overview", "Overview"], ["signals", "⚡ Signals"]] as const).map(([id, label]) => (
                      <button key={id} onClick={() => setProjTab(id)}
                        className={`rounded-full px-5 py-2 text-[12px] font-bold transition ${projTab === id ? "text-white" : "text-zinc-500 hover:text-zinc-800"}`}
                        style={projTab === id ? { background: BLUE } : undefined}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* stat band */}
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                    <div className="rounded-2xl px-4 py-3.5 text-white" style={{ background: `linear-gradient(135deg, ${BLUE}, #4f2ff0)` }}>
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-white/60">Market Cap</div>
                      <div className="mt-0.5 font-display text-xl font-semibold tabular-nums">{selected.mcap ? fmtUsd(selected.mcap) : "—"}</div>
                    </div>
                    <Stat label="Price" value={selected.priceUsd ? fmtPrice(selected.priceUsd) : "—"} sub={<Delta v={selected.change24h} suffix="% 24h" />} />
                    <Stat label="Volume 24h" value={selected.volume24h ? fmtUsd(selected.volume24h) : "—"} sub={selected.mcap ? `${((selected.volume24h / selected.mcap) * 100).toFixed(0)}% turnover` : ""} />
                    <Stat label="Liquidity" value={selected.liquidity ? fmtUsd(selected.liquidity) : "—"} sub={selected.mcap ? `${((selected.liquidity / selected.mcap) * 100).toFixed(0)}% of cap` : ""} />
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

                  {projTab === "signals" ? (
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
                          className="h-[420px] w-full border-0"
                          loading="lazy"
                        />
                      </Card>

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
                            <button key={x.ca} onClick={() => openToken(x)} className="flex w-full items-center gap-3 border-b border-zinc-50 px-5 py-3 text-left last:border-0 hover:bg-indigo-50/40">
                              <span className="text-[13px] font-semibold text-zinc-900">{x.name}</span>
                              <span className="text-[11px] text-zinc-400">${x.symbol}</span>
                              <span className="ml-auto text-[12px] font-semibold tabular-nums text-zinc-700">{x.mcap ? fmtUsd(x.mcap) : "—"}</span>
                              <Delta v={x.change24h} suffix="%" />
                            </button>
                          ))}
                        </Card>
                      )}
                    </div>
                  </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ═══ INVESTOR THESIS (coming soon) ═══ */}
          {section === "thesis" && (
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
          )}

          {/* ═══ WATCHLIST ═══ */}
          {section === "watchlist" && (
            <>
              <PageHead title="Watchlist" sub="Your tracked tokens — with alerts so the market comes to you. Synced to your wallet across devices."
                right={phantom
                  ? <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700">★ {watchlist.length} watched</span>
                  : <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-zinc-500">Sign in required</span>} />

              {!phantom ? (
                <EmptyState icon="👻" title="Sign in to use your watchlist"
                  body="Your watchlist is keyed to your wallet — sign in with Phantom (read-only, no signatures) to star tokens, get 🔔 alerts when their signals fire, and carry your list across devices."
                  cta={<button onClick={signInPhantom} className="rounded-full px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white" style={{ background: BLUE }}>👻 Sign in with Phantom</button>} />
              ) : watchlist.length === 0 ? (
                <EmptyState icon="★" title="Nothing watched yet"
                  body="Open any token's terminal page and hit ☆ Watch. Watched tokens appear here with live data, and alerts fire on the events you choose below."
                  cta={<button onClick={() => goto("projects")} className="rounded-full px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white" style={{ background: BLUE }}>Browse projects →</button>} />
              ) : (
                <CoinTable coins={feed.filter((c) => watchlist.includes(c.ca))} title="★ Watched tokens · live" />
              )}

              <Card title="🔔 Alert preferences" className="mt-4" pad>
                <div className="grid gap-3 sm:grid-cols-2">
                  {([
                    ["priceMove", "Price moves", "Alert when a watched token moves ±10% in 24h"],
                    ["volumeSpike", "Volume spikes", "Alert when turnover exceeds 2× its average"],
                    ["verification", "Verification changes", "Alert when a bonded token becomes ✓ Verified"],
                    ["newLaunch", "New launches", "Alert the moment any new …EASY pair is indexed"],
                  ] as [keyof AlertPrefs, string, string][]).map(([k, label, hint]) => (
                    <button key={k} onClick={() => setAlert(k)}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${alerts[k] ? "border-indigo-200 bg-indigo-50/50" : "border-zinc-200 bg-white hover:border-zinc-300"}`}>
                      <div>
                        <div className="text-[13px] font-semibold text-zinc-900">{label}</div>
                        <div className="text-[11px] text-zinc-400">{hint}</div>
                      </div>
                      <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${alerts[k] ? "" : "bg-zinc-200"}`} style={alerts[k] ? { background: BLUE } : undefined}>
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${alerts[k] ? "left-[18px]" : "left-0.5"}`} />
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-zinc-400">Preferences saved locally. Email & Telegram delivery ship with accounts — alerts currently surface in-app.</p>
              </Card>
            </>
          )}

          {/* ═══ EASYA INDEXES ═══ */}
          {section === "indexes" && (
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
          )}

          {/* ═══ PORTFOLIO · WATCH-ONLY ═══ */}
          {section === "portfolio" && (
            <>
              <PageHead title="Portfolio" sub="Watch any wallet's Kickstart holdings — read-only, no signatures, valued at live prices."
                right={<span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-emerald-700">👁 Watch-only</span>} />

              {!wallet ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-10 shadow-sm">
                  <div className="mx-auto max-w-md text-center">
                    <div className="mb-3 text-4xl">💼</div>
                    <h2 className="font-display text-xl font-semibold text-zinc-900">Watch a wallet</h2>
                    <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
                      Paste any Solana address — or connect Phantom in read-only mode. We only read public token balances; <strong className="text-zinc-700">no signature is ever requested</strong>, nothing can be moved.
                    </p>
                    <div className="mt-6 flex gap-2">
                      <input
                        value={addrInput}
                        onChange={(e) => { setAddrInput(e.target.value); setWalletErr(null); }}
                        onKeyDown={(e) => e.key === "Enter" && watchWallet(addrInput)}
                        placeholder="Solana wallet address…"
                        className="min-w-0 flex-1 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2.5 font-mono text-[12px] outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                      />
                      <button onClick={() => watchWallet(addrInput)} disabled={!addrInput.trim()}
                        className="rounded-full px-5 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white transition hover:-translate-y-px disabled:opacity-40" style={{ background: BLUE }}>
                        Watch →
                      </button>
                    </div>
                    <div className="my-4 flex items-center gap-3 text-[11px] text-zinc-300">
                      <span className="h-px flex-1 bg-zinc-100" /> or <span className="h-px flex-1 bg-zinc-100" />
                    </div>
                    <button onClick={connectPhantom}
                      className="rounded-full border border-zinc-200 bg-white px-7 py-2.5 text-[12px] font-bold uppercase tracking-wide text-zinc-700 transition hover:border-indigo-300 hover:text-indigo-700">
                      👻 Connect Phantom · read-only
                    </button>
                    {walletErr && (
                      <p className="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-[12px] text-red-600">
                        {walletErr}
                        {walletErr === "Phantom not detected or connection declined." && (
                          <span> <a href="https://phantom.app/download" target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-600 hover:text-indigo-800">Install Phantom</a> or enable it in your browser.</span>
                        )}
                      </p>
                    )}
                    <p className="mt-4 text-[11px] text-zinc-400">Balances are read via public Solana RPC. Only tokens featured on ezpulse (…EASY contracts) are shown.</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* wallet bar */}
                  <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-3.5 shadow-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="font-mono text-[12px] text-zinc-600">{wallet.slice(0, 6)}…{wallet.slice(-6)}</span>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black tracking-widest text-emerald-600">👁 WATCH-ONLY</span>
                    </span>
                    <div className="ml-auto flex gap-2">
                      <button
                        onClick={async () => {
                          const fresh = await fetchLiveFeed();
                          if (fresh) setLiveFeed(fresh.launches);
                          watchWallet(wallet);
                        }}
                        className="rounded-full border border-zinc-200 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-500 transition hover:border-indigo-300 hover:text-indigo-700">
                        ⟳ Refresh
                      </button>
                      <button onClick={disconnectWallet} className="rounded-full border border-zinc-200 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-500 transition hover:border-red-200 hover:text-red-500">
                        ✕ Stop watching
                      </button>
                    </div>
                  </div>

                  {portfolio === "loading" && (
                    <Card pad>
                      <div className="flex items-center gap-3 text-[13px] text-zinc-500">
                        <span className="term-blink h-2 w-2 rounded-full bg-indigo-500" /> Reading token balances from Solana RPC…
                      </div>
                    </Card>
                  )}

                  {portfolio === null && walletErr && (
                    <Card pad><p className="text-[13px] text-red-600">{walletErr}</p></Card>
                  )}

                  {portfolio && portfolio !== "loading" && (
                    <>
                      {/* summary */}
                      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <div className="rounded-2xl px-5 py-4 text-white shadow-lg shadow-indigo-600/20" style={{ background: `linear-gradient(135deg, ${BLUE}, #4f2ff0)` }}>
                          <div className="text-[11px] font-semibold uppercase tracking-widest text-white/60">Kickstart value</div>
                          <div className="mt-1 font-display text-3xl font-semibold tabular-nums">
                            {portfolio.totalUsd >= 0.01 ? `$${portfolio.totalUsd.toFixed(2)}` : portfolio.holdings.length ? "<$0.01" : "$0"}
                          </div>
                          <div className="mt-0.5 text-[11px] text-white/60">at live prices</div>
                        </div>
                        <Stat label="Positions" value={String(portfolio.holdings.length)} sub="in featured tokens" />
                        <Stat label="Tokens scanned" value={String(portfolio.scanned)} sub="total SPL balances in wallet" />
                        <Stat label="24h move" value={(() => {
                          const t = portfolio.totalUsd;
                          if (!t || !portfolio.holdings.length) return "—";
                          const w = portfolio.holdings.reduce((s, h) => s + h.coin.change24h * h.valueUsd, 0) / t;
                          return `${w >= 0 ? "+" : ""}${w.toFixed(1)}%`;
                        })()} sub="value-weighted" />
                      </div>

                      {/* holdings */}
                      {portfolio.holdings.length === 0 ? (
                        <div className="mt-4">
                          <EmptyState icon="🪙" title="No featured Kickstart tokens in this wallet"
                            body={`We scanned ${portfolio.scanned} token balance${portfolio.scanned !== 1 ? "s" : ""} in this wallet — none match the …EASY contracts currently featured on ezpulse. Holdings appear here the moment the wallet holds any listed token.`}
                            cta={<button onClick={() => goto("market")} className="rounded-full px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white" style={{ background: BLUE }}>Browse the market →</button>} />
                        </div>
                      ) : (
                        <Card className="mt-4" title="Holdings · featured Kickstart tokens" right={<span className="text-[11px] text-zinc-400">valued live · DexScreener</span>}>
                          <div className="hidden items-center gap-3 border-b border-zinc-100 px-5 py-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 lg:flex">
                            <span className="flex-1">Token</span>
                            <span className="w-24 text-right">Balance</span>
                            <span className="w-20 text-right">Price</span>
                            <span className="w-16 text-right">24h</span>
                            <span className="w-20 text-right">Value</span>
                            <span className="w-20 text-right" />
                          </div>
                          {portfolio.holdings.map((h) => (
                            <div key={h.coin.ca} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-zinc-50 px-5 py-3 last:border-0 hover:bg-indigo-50/30">
                              <button onClick={() => openToken(h.coin)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                                {h.coin.icon && <img src={h.coin.icon} alt="" className="h-7 w-7 rounded-full border border-zinc-100" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[14px] font-semibold text-zinc-900">{h.coin.name}</span>
                                    <span className="text-[11px] text-zinc-400">${h.coin.symbol}</span>
                                    {isVerified(h.coin) && <span className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black text-white" style={{ background: BLUE }}>✓</span>}
                                  </div>
                                  <div className="font-mono text-[10px] text-zinc-400">{h.coin.ca.slice(0, 4)}…{h.coin.ca.slice(-4)}</div>
                                </div>
                              </button>
                              <span className="hidden w-24 text-right text-[13px] font-semibold tabular-nums text-zinc-800 lg:block">
                                {h.amount >= 1_000_000 ? `${(h.amount / 1_000_000).toFixed(2)}M` : h.amount >= 1000 ? `${(h.amount / 1000).toFixed(1)}K` : h.amount.toFixed(2)}
                              </span>
                              <span className="hidden w-20 text-right text-[12px] tabular-nums text-zinc-500 lg:block">{h.coin.priceUsd ? fmtPrice(h.coin.priceUsd) : "—"}</span>
                              <span className="hidden w-16 text-right lg:block"><Delta v={h.coin.change24h} suffix="%" /></span>
                              <span className="w-20 text-right text-[13px] font-bold tabular-nums text-zinc-900">
                                {h.valueUsd >= 0.01 ? `$${h.valueUsd.toFixed(2)}` : "<$0.01"}
                              </span>
                              <button onClick={() => openToken(h.coin)} className="rounded-lg bg-zinc-900 px-2.5 py-1.5 text-[10px] font-bold text-white transition hover:-translate-y-px">
                                📟 Terminal
                              </button>
                            </div>
                          ))}
                        </Card>
                      )}
                      <p className="mt-3 text-[11px] leading-relaxed text-zinc-400">
                        Watch-only: balances are read from public Solana RPC ({portfolio.scanned} SPL balances scanned) and matched against tokens featured on ezpulse. No signature was requested; this connection cannot move funds. Values use live DexScreener prices and exclude tokens not listed here.
                      </p>
                    </>
                  )}
                </>
              )}
            </>
          )}

          {/* ═══ SMART INVESTING (coming soon) ═══ */}
          {section === "smart" && (
            <>
              <PageHead title="Smart Investing" sub="Rules-based allocation over the Kickstart market — set the strategy, let the signals execute."
                right={<span className="rounded-full bg-zinc-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-zinc-500">Coming soon</span>} />
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  ["🧺", "Index investing", "One-click exposure to any EasyA Index — Composite, Verified, Momentum 5 or Liquid — auto-rebalanced as constituents change."],
                  ["⚡", "Signal strategies", "Automate on live signals: 'buy verified tokens on volume spikes', 'trim anything after +50% in 48h'. You set the rules."],
                  ["🛡️", "Guardrails", "Position caps, liquidity floors and verified-only filters baked in — the platform enforces the discipline."],
                ].map(([icon, t, b]) => (
                  <div key={t as string} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <div className="text-2xl">{icon}</div>
                    <h3 className="mt-3 text-[15px] font-bold text-zinc-900">{t}</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">{b}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl px-8 py-10 text-center text-white" style={{ background: `linear-gradient(135deg, ${BLUE}, #4f2ff0)` }}>
                <h2 className="font-display text-2xl font-semibold">Watch your holdings today</h2>
                <p className="mx-auto mt-2 max-w-md text-[13px] text-white/70">Portfolio already works in watch-only mode — see your Kickstart positions at live prices. Smart Investing adds execution on top.</p>
                <button onClick={() => goto("portfolio")} className="mt-5 rounded-full bg-white px-7 py-3 text-[12px] font-bold uppercase tracking-wide text-indigo-700 transition hover:-translate-y-0.5">
                  Open Portfolio →
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

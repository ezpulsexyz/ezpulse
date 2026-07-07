import { useEffect, useMemo, useRef, useState } from "react";
import { syncWatchlist, pullWalletWatchlist } from "../../backend";
import {
  fetchLiveFeed, isGraduated, verifiedOf, bondedOf, trendingOf, tokenNote, tokenSignals,
  loadWatchlist, saveWatchlist, loadAlertPrefs, saveAlertPrefs,
  fetchPortfolio, connectPhantomReadOnly, isValidSolAddress, isPhantomAvailable,
  type LiveLaunch, type AlertPrefs, type PortfolioResult,
} from "../../kickstart";
import { loadSeenNotifs, saveSeenNotifs } from "../notifs";
import type { Notif, Section, MarketTab, TerminalTarget } from "../types";

export function useTerminal(target?: TerminalTarget) {
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
  const [portfolio, setPortfolio] = useState<PortfolioResult | null | "loading">(null);
  const [phantom, setPhantom] = useState<string | null>(() => { try { return localStorage.getItem("ezpulse:phantom"); } catch { return null; } });
  const [notifOpen, setNotifOpen] = useState(false);
  const [seenNotifs, setSeenNotifs] = useState<string[]>(() => loadSeenNotifs());
  const [shareToken, setShareToken] = useState<LiveLaunch | null>(null);
  const [projTab, setProjTab] = useState<"overview" | "signals" | "founder">("overview");
  const searchRef = useRef<HTMLInputElement>(null);

  const [signinNudge, setSigninNudge] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const toggleWatch = (ca: string) => {
    setWatchlist((wl) => {
      const next = wl.includes(ca) ? wl.filter((x) => x !== ca) : [...wl, ca];
      saveWatchlist(next);
      if (phantom) syncWatchlist(next, phantom);
      return next;
    });
  };

  const [phantomMissing, setPhantomMissing] = useState(false);

  /* Phantom sign-in: read-only connect, restores wallet-keyed watchlist, powers Portfolio */
  const signInPhantom = async () => {
    if (!isPhantomAvailable()) {
      setPhantomMissing(true);
      setTimeout(() => setPhantomMissing(false), 6000);
      return;
    }
    const addr = await connectPhantomReadOnly();
    if (!addr) { setWalletErr("Connection declined in Phantom — try again."); return; }
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
    watchWallet(addr);
  };

  const signOutPhantom = () => {
    // clear portfolio too if it was showing the signed-in wallet
    setWallet((w) => (w === phantom ? null : w));
    setPortfolio((p) => (wallet === phantom ? null : p));
    setPhantom(null);
    setNotifOpen(false);
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

  // Restored Phantom session (page reload): re-pull wallet-keyed watchlist and auto-load portfolio.
  useEffect(() => {
    if (!phantom) return;
    let alive = true;
    pullWalletWatchlist(phantom).then((remote) => {
      if (!alive || !remote?.length) return;
      setWatchlist((wl) => {
        const merged = [...new Set([...wl, ...remote])];
        saveWatchlist(merged);
        return merged;
      });
    });
    if (!wallet) watchWallet(phantom); // portfolio follows the session
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phantom]);

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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (e.key === "/" && !paletteOpen && document.activeElement !== searchRef.current) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        if (paletteOpen) { setPaletteOpen(false); return; }
        setSelected(null);
        setQuery("");
        setNotifOpen(false);
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen]);

  const copyCa = async (ca: string) => {
    try { await navigator.clipboard.writeText(ca); } catch { /* noop */ }
    setCopiedCa(ca);
    setTimeout(() => setCopiedCa(null), 1500);
  };

  const feed = Array.isArray(liveFeed) ? liveFeed : [];
  const loading = liveFeed === "loading";
  const watchedCoins = useMemo(
    () => (watchlist.length ? feed.filter((c) => watchlist.includes(c.ca)) : []),
    [feed, watchlist],
  );
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
        if (s.kind === "WHALE" && !alerts.whaleTx) continue;
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
  return {
    section, setSection, marketTab, setMarketTab, selected, setSelected,
    query, setQuery, menuOpen, setMenuOpen, liveFeed, setLiveFeed,
    copiedCa, watchlist, alerts, wallet, addrInput, setAddrInput, walletErr,
    portfolio, setPortfolio, phantom, notifOpen, setNotifOpen, seenNotifs,
    shareToken, setShareToken, projTab, setProjTab, searchRef,
    signinNudge, setSigninNudge, phantomMissing, paletteOpen, setPaletteOpen, lastUpdated,
    booted, setBooted, bootSlow,
    toggleWatch, signInPhantom, signOutPhantom, setAlert, watchWallet,
    connectPhantom, disconnectWallet, copyCa, openNotifs,
    feed, watchedCoins, loading, verified, bonded, bonding, trending, totalMcap, totalVol,
    notifs, unseenCount, topMover, results, note,
    goto, openToken,
  };
}

export type TerminalState = ReturnType<typeof useTerminal>;

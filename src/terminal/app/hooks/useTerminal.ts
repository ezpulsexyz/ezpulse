import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { syncWatchlist, pullWalletWatchlist } from "../../backend";
import {
  fetchLiveFeed, isGraduated, verifiedOf, bondedOf, trendingOf, tokenNote, tokenSignals,
  loadWatchlist, saveWatchlist, loadAlertPrefs, saveAlertPrefs,
  fetchConnectedWalletPortfolio, revaluePortfolioFromFeed, fetchSolPrice, isPhantomAvailable,
  type LiveLaunch, type AlertPrefs, type PortfolioResult,
} from "../../kickstart";
import { useWallet } from "../../hooks/useWallet";
import { loadSeenNotifs, saveSeenNotifs } from "../notifs";
import type { Notif, Section, MarketTab, TerminalTarget } from "../types";

export function useTerminal(target?: TerminalTarget) {
  const { wallet: connectedWallet, connecting, connect, disconnect } = useWallet();
  const phantom = connectedWallet;

  const [section, setSection] = useState<Section>(target?.section ?? "market");
  const [marketTab, setMarketTab] = useState<MarketTab>(target?.marketTab ?? "ALL");
  const [selected, setSelected] = useState<LiveLaunch | null>(null);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [liveFeed, setLiveFeed] = useState<LiveLaunch[] | null | "loading">("loading");
  const [copiedCa, setCopiedCa] = useState<string | null>(null);
  const [watchlist, setWatchlist] = useState<string[]>(() => loadWatchlist());
  const [alerts, setAlerts] = useState<AlertPrefs>(() => loadAlertPrefs());
  const [walletErr, setWalletErr] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioResult | null | "loading">(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [seenNotifs, setSeenNotifs] = useState<string[]>(() => loadSeenNotifs());
  const [shareToken, setShareToken] = useState<LiveLaunch | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const walletRef = useRef<string | null>(null);
  const balanceRefreshTick = useRef(0);

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

  const loadPortfolio = useCallback(async (addr: string, feedOverride?: LiveLaunch[]) => {
    setWalletErr(null);
    setPortfolio("loading");
    let fd = feedOverride ?? (Array.isArray(liveFeed) ? liveFeed : []);
    if (!feedOverride && liveFeed === "loading") {
      const fresh = await fetchLiveFeed();
      fd = fresh ? fresh.launches : [];
      if (fresh) setLiveFeed(fresh.launches);
    }
    const p = await fetchConnectedWalletPortfolio(addr, fd);
    setPortfolio(p);
    if (p === null) setWalletErr("Couldn't read balances — try again in a moment.");
  }, [liveFeed]);

  const signInPhantom = async () => {
    if (!isPhantomAvailable()) {
      setPhantomMissing(true);
      setTimeout(() => setPhantomMissing(false), 6000);
      return;
    }
    const addr = await connect();
    if (!addr) {
      setWalletErr("Connection declined in Phantom — try again.");
      return;
    }
    setWalletErr(null);
    const remote = await pullWalletWatchlist(addr);
    if (remote?.length) {
      const merged = [...new Set([...watchlist, ...remote])];
      setWatchlist(merged);
      saveWatchlist(merged);
      syncWatchlist(merged, addr);
    } else if (watchlist.length) {
      syncWatchlist(watchlist, addr);
    }
    await loadPortfolio(addr);
  };

  const signOutPhantom = () => {
    disconnect();
    setPortfolio(null);
    setWalletErr(null);
    setNotifOpen(false);
  };

  const setAlert = (k: keyof AlertPrefs) => {
    setAlerts((a) => {
      const next = { ...a, [k]: !a[k] };
      saveAlertPrefs(next);
      return next;
    });
  };

  useEffect(() => {
    walletRef.current = connectedWallet;
  }, [connectedWallet]);

  useEffect(() => {
    if (!connectedWallet) {
      setPortfolio(null);
      return;
    }
    let alive = true;
    pullWalletWatchlist(connectedWallet).then((remote) => {
      if (!alive || !remote?.length) return;
      setWatchlist((wl) => {
        const merged = [...new Set([...wl, ...remote])];
        saveWatchlist(merged);
        return merged;
      });
    });
    void loadPortfolio(connectedWallet);
    return () => {
      alive = false;
    };
  }, [connectedWallet, loadPortfolio]);

  useEffect(() => {
    if (!connectedWallet || !Array.isArray(liveFeed) || liveFeed.length === 0) return;
    setPortfolio((current) => {
      if (!current || current === "loading" || !current.balanceSnapshot) return current;
      const next = revaluePortfolioFromFeed(current, liveFeed);
      const changed =
        next.holdings.length !== current.holdings.length
        || Math.abs(next.totalUsd - current.totalUsd) > 0.001
        || next.holdings.some(
          (h, i) =>
            h.coin.ca !== current.holdings[i]?.coin.ca
            || Math.abs(h.valueUsd - (current.holdings[i]?.valueUsd ?? 0)) > 0.001,
        );
      return changed ? next : current;
    });
  }, [liveFeed, connectedWallet]);

  useEffect(() => {
    if (!connectedWallet) return;
    let alive = true;
    const refreshSol = () => {
      fetchSolPrice().then((price) => {
        if (!alive || price === null) return;
        setPortfolio((current) => {
          if (!current || current === "loading" || !current.sol) return current;
          const valueUsd = current.sol.amount * price;
          if (current.sol.priceUsd === price && current.sol.valueUsd === valueUsd) return current;
          return { ...current, sol: { ...current.sol, priceUsd: price, valueUsd } };
        });
      });
    };
    refreshSol();
    const id = setInterval(refreshSol, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [connectedWallet]);

  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [booted, setBooted] = useState(false);
  const [bootSlow, setBootSlow] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetchLiveFeed().then((feed) => {
        if (!alive) return;
        if (feed) {
          setLiveFeed(feed.launches);
          setLastUpdated(Date.now());
          const w = walletRef.current;
          if (w) {
            setPortfolio((current) => {
              if (!current || current === "loading" || !current.balanceSnapshot) return current;
              return revaluePortfolioFromFeed(current, feed.launches);
            });
            balanceRefreshTick.current += 1;
            if (balanceRefreshTick.current % 2 === 0) {
              fetchConnectedWalletPortfolio(w, feed.launches).then((p) => {
                if (alive && p) setPortfolio(p);
              });
            }
          }
        } else {
          setLiveFeed((prev) => (Array.isArray(prev) ? prev : null));
        }
        setBooted(true);
      });
    load();
    const slowTimer = setTimeout(() => setBootSlow(true), 6000);
    const failTimer = setTimeout(() => setBooted(true), 15000);
    const timer = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(timer);
      clearTimeout(slowTimer);
      clearTimeout(failTimer);
    };
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
        if (paletteOpen) {
          setPaletteOpen(false);
          return;
        }
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
    try {
      await navigator.clipboard.writeText(ca);
    } catch {
      /* noop */
    }
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

  const notifs: Notif[] = useMemo(() => {
    if (!feed.length || !watchlist.length) return [];
    const out: Notif[] = [];
    const day = new Date().toISOString().slice(0, 10);
    for (const c of feed.filter((x) => watchlist.includes(x.ca))) {
      for (const s of tokenSignals(c, feed)) {
        if (s.strength === "NEUTRAL") continue;
        if (s.kind === "MOMENTUM" && Math.abs(c.change24h) < 10) continue;
        if (s.kind === "MOMENTUM" && !alerts.priceMove) continue;
        if (s.kind === "VOLUME" && !alerts.volumeSpike) continue;
        if (s.kind === "VERIFY" && !alerts.verification) continue;
        if (s.kind === "WHALE" && !alerts.whaleSignal) continue;
        out.push({
          key: `${c.ca}:${s.kind}:${s.strength}:${day}`,
          icon:
            s.kind === "WHALE"
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
                      : "✓",
          strength: s.strength,
          title: s.title,
          detail: s.detail,
          token: c,
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

  const refreshFeed = useCallback(async () => {
    const fresh = await fetchLiveFeed();
    if (fresh) {
      setLiveFeed(fresh.launches);
      setLastUpdated(Date.now());
      const w = walletRef.current;
      if (w) {
        setPortfolio((current) => {
          if (!current || current === "loading" || !current.balanceSnapshot) return current;
          return revaluePortfolioFromFeed(current, fresh.launches);
        });
      }
    }
  }, []);

  const goto = (s: Section) => {
    setSection(s);
    setSelected(null);
    setMenuOpen(false);
    setQuery("");
    setNotifOpen(false);
    window.scrollTo({ top: 0 });
  };
  const openToken = (c: LiveLaunch) => {
    setSelected(c);
    setSection("projects");
    setMenuOpen(false);
    setQuery("");
    window.scrollTo({ top: 0 });
  };

  const note = selected ? tokenNote(selected, feed) : null;
  return {
    section,
    setSection,
    marketTab,
    setMarketTab,
    selected,
    setSelected,
    query,
    setQuery,
    menuOpen,
    setMenuOpen,
    liveFeed,
    setLiveFeed,
    copiedCa,
    watchlist,
    alerts,
    wallet: connectedWallet,
    walletConnecting: connecting,
    walletErr,
    portfolio,
    setPortfolio,
    phantom,
    notifOpen,
    setNotifOpen,
    seenNotifs,
    shareToken,
    setShareToken,
    searchRef,
    signinNudge,
    setSigninNudge,
    phantomMissing,
    paletteOpen,
    setPaletteOpen,
    lastUpdated,
    booted,
    setBooted,
    bootSlow,
    toggleWatch,
    signInPhantom,
    signOutPhantom,
    setAlert,
    loadPortfolio,
    copyCa,
    openNotifs,
    feed,
    watchedCoins,
    loading,
    verified,
    bonded,
    bonding,
    trending,
    totalMcap,
    totalVol,
    notifs,
    unseenCount,
    topMover,
    results,
    note,
    goto,
    openToken,
    refreshFeed,
  };
}

export type TerminalState = ReturnType<typeof useTerminal>;
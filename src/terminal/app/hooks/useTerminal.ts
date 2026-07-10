import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { navigateToTerminal } from "../../../routes";
import { syncWatchlist, pullWalletWatchlist } from "../../backend";
import {
  fetchLiveFeed, isGraduated, verifiedOf, bondedOf, trendingOf, tokenNote, tokenSignals,
  loadWatchlist, saveWatchlist, loadAlertPrefs, saveAlertPrefs,
  fetchConnectedWalletPortfolio, revaluePortfolioFromFeed, fetchSolPrice,
  type LiveLaunch, type AlertPrefs, type PortfolioResult,
} from "../../kickstart";
import { useWallet } from "../../hooks/useWallet";
import { consumePendingWalletSignIn, processMobileWalletCallback } from "../../mobileWalletConnect";
import {
  getWalletOption,
  isMobileDevice,
  isWalletDetected,
  shouldUseMobileWalletAppConnect,
  type WalletId,
} from "../../wallets";
import { loadSeenNotifs, saveSeenNotifs } from "../notifs";
import { PROJECT_CATEGORIES, type Notif, type ProjectCategory, type Section, type MarketTab, type TerminalTarget } from "../types";
import { initDexScreenerSocket, subscribeToPair, unsubscribeFromPair } from "../../dexScreenerSocket";

// === Price Threshold Alerts ===
export interface PriceAlert {
  id: string;
  ca: string;
  symbol: string;
  targetPrice: number;
  direction: "above" | "below";
  enabled: boolean;
  createdAt: number;
}

const PRICE_ALERTS_KEY = "ezpulse:price-alerts";

function loadPriceAlerts(): PriceAlert[] {
  try {
    const raw = localStorage.getItem(PRICE_ALERTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePriceAlerts(alerts: PriceAlert[]) {
  try {
    localStorage.setItem(PRICE_ALERTS_KEY, JSON.stringify(alerts));
  } catch {
    /* noop */
  }
}

export function useTerminal(target?: TerminalTarget) {
  const {
    wallet: connectedWallet,
    walletProvider,
    connecting,
    connectingId,
    connect,
    disconnect,
  } = useWallet();
  const phantom = connectedWallet;

  const [section, setSection] = useState<Section>(target?.section ?? "market");
  const [marketTab, setMarketTabState] = useState<MarketTab>(target?.marketTab ?? "ALL");
  const [categoryFilter, setCategoryFilter] = useState<ProjectCategory | null>(null);
  const [selected, setSelected] = useState<LiveLaunch | null>(null);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(() => {
    try {
      return localStorage.getItem("ezpulse-sidebar-hidden") === "1";
    } catch {
      return false;
    }
  });
  const [liveFeed, setLiveFeed] = useState<LiveLaunch[] | null | "loading">("loading");
  const [copiedCa, setCopiedCa] = useState<string | null>(null);
  const [watchlist, setWatchlist] = useState<string[]>(() => loadWatchlist());
  const [alerts, setAlerts] = useState<AlertPrefs>(() => loadAlertPrefs());
  const [walletErr, setWalletErr] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioResult | null | "loading">(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [seenNotifs, setSeenNotifs] = useState<string[]>(() => loadSeenNotifs());
  const [shareToken, setShareToken] = useState<LiveLaunch | null>(null);

  // === Price Threshold Alerts State ===
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>(() => loadPriceAlerts());

  const searchRef = useRef<HTMLInputElement>(null);
  const walletRef = useRef<string | null>(null);
  const balanceRefreshTick = useRef(0);
  const triggeredAlerts = useRef<Set<string>>(new Set()); // prevent spam

  const [signinNudge, setSigninNudge] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // === Real-time Price Feed State ===
  const [lastPriceUpdate, setLastPriceUpdate] = useState<number | null>(null);
  const priceUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wsUnsubscribers = useRef<(() => void)[]>([]);

  const persistSidebarHidden = (hidden: boolean) => {
    try {
      localStorage.setItem("ezpulse-sidebar-hidden", hidden ? "1" : "0");
    } catch {
      /* noop */
    }
  };

  const openSidebar = useCallback(() => {
    setSidebarHidden(false);
    setMenuOpen(true);
    persistSidebarHidden(false);
  }, []);

  const hideSidebar = useCallback(() => {
    setSidebarHidden(true);
    setMenuOpen(false);
    persistSidebarHidden(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setMenuOpen(false);
  }, []);

  const toggleWatch = (ca: string) => {
    setWatchlist((wl) => {
      const next = wl.includes(ca) ? wl.filter((x) => x !== ca) : [...wl, ca];
      saveWatchlist(next);
      if (phantom) syncWatchlist(next, phantom);
      return next;
    });
  };

  const [walletPickerOpen, setWalletPickerOpen] = useState(false);
  const [walletMissing, setWalletMissing] = useState(false);

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

  const completeWalletSignIn = useCallback(async (addr: string) => {
    setWalletErr(null);
    const remote = await pullWalletWatchlist(addr);
    if (remote?.length) {
      const merged = [...new Set([...wl, ...remote])];
      setWatchlist(merged);
      saveWatchlist(merged);
      syncWatchlist(merged, addr);
    } else if (watchlist.length) {
      syncWatchlist(watchlist, addr);
    }
    await loadPortfolio(addr);
  }, [watchlist, loadPortfolio]);

  const signInWallet = useCallback(async (providerId: WalletId) => {
    const option = getWalletOption(providerId);
    if (shouldUseMobileWalletAppConnect(providerId)) {
      setWalletPickerOpen(false);
      setWalletErr(`Opening ${option.name}… approve connect, then you’ll return here in your browser.`);
      await connect(providerId);
      return;
    }

    if (!isWalletDetected(providerId)) {
      setWalletMissing(true);
      setTimeout(() => setWalletMissing(false), 6000);
      await connect(providerId);
      return;
    }

    const addr = await connect(providerId);
    if (!addr) {
      setWalletErr(`Connection declined in ${option.name} — try again.`);
      return;
    }
    setWalletPickerOpen(false);
    await completeWalletSignIn(addr);
  }, [connect, completeWalletSignIn]);

  useEffect(() => {
    const finishSignIn = (addr: string) => {
      setWalletPickerOpen(false);
      setWalletErr(null);
      void completeWalletSignIn(addr);
    };

    const result = processMobileWalletCallback();
    if (result) {
      if ("error" in result) {
        setWalletErr(result.error);
        return;
      }
      finishSignIn(result.address);
      return;
    }

    const pendingAddr = consumePendingWalletSignIn();
    if (pendingAddr) finishSignIn(pendingAddr);
  }, [completeWalletSignIn]);

  const openWalletPicker = useCallback(() => {
    setWalletPickerOpen(true);
    setWalletErr(null);
  }, []);

  const signInPhantom = openWalletPicker;

  const signOutPhantom = () => {
    disconnect();
    setPortfolio(null);
    setWalletErr(null);
    setNotifOpen(false);
    setWalletPickerOpen(false);
  };

  const setAlert = (k: keyof AlertPrefs) => {
    setAlerts((a) => {
      const next = { ...a, [k]: !a[k] };
      saveAlertPrefs(next);
      return next;
    });
  };

  // === Price Alert Functions ===
  const addPriceAlert = useCallback((ca: string, symbol: string, targetPrice: number, direction: "above" | "below") => {
    const newAlert: PriceAlert = {
      id: `${ca}-${direction}-${targetPrice}-${Date.now()}`,
      ca,
      symbol,
      targetPrice,
      direction,
      enabled: true,
      createdAt: Date.now(),
    };

    setPriceAlerts((prev) => {
      const next = [...prev, newAlert];
      savePriceAlerts(next);
      return next;
    });

    // Clear triggered state for this alert
    triggeredAlerts.current.delete(newAlert.id);
  }, []);

  const removePriceAlert = useCallback((id: string) => {
    setPriceAlerts((prev) => {
      const next = prev.filter((a) => a.id !== id);
      savePriceAlerts(next);
      return next;
    });
    triggeredAlerts.current.delete(id);
  }, []);

  const togglePriceAlert = useCallback((id: string) => {
    setPriceAlerts((prev) => {
      const next = prev.map((a) =>
        a.id === id ? { ...a, enabled: !a.enabled } : a
      );
      savePriceAlerts(next);
      return next;
    });
  }, []);

  // Check price thresholds and create notifications
  const checkPriceAlerts = useCallback((updatedTokens: LiveLaunch[]) => {
    if (!priceAlerts.length) return;

    const newNotifs: Notif[] = [];
    const day = new Date().toISOString().slice(0, 10);

    updatedTokens.forEach((token) => {
      const relevantAlerts = priceAlerts.filter(
        (a) => a.ca.toLowerCase() === token.ca.toLowerCase() && a.enabled
      );

      relevantAlerts.forEach((alert) => {
        const currentPrice = token.priceUsd;
        const crossed =
          (alert.direction === "above" && currentPrice >= alert.targetPrice) ||
          (alert.direction === "below" && currentPrice <= alert.targetPrice);

        if (crossed && !triggeredAlerts.current.has(alert.id)) {
          triggeredAlerts.current.add(alert.id);

          newNotifs.push({
            key: `price-alert-${alert.id}-${Date.now()}`,
            icon: alert.direction === "above" ? "📈" : "📉",
            strength: alert.direction === "above" ? "BULLISH" : "BEARISH",
            title: `${token.symbol} hit $${alert.targetPrice}`,
            detail: `Price ${alert.direction} $${alert.targetPrice} (now $${currentPrice.toFixed(6)})`,
            token,
          });
        }
      });
    });

    if (newNotifs.length > 0) {
      // We can't easily push into notifs since it's a useMemo.
      // For now, we'll log it. In next step we'll integrate properly.
      console.log("[Price Alert] Triggered:", newNotifs);
    }
  }, [priceAlerts]);

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

  // === Core Live Feed Loader (every 60s) ===
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetchLiveFeed().then((feed) => {
        if (!alive) return;
        if (feed) {
          setLiveFeed(feed.launches);
          setLastUpdated(Date.now());
          setLastPriceUpdate(Date.now());
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

  // === Real-time Price Updates via DexScreener WebSocket ===
  const activeCas = useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(liveFeed)) {
      liveFeed.forEach(c => set.add(c.ca));
    }
    watchlist.forEach(ca => set.add(ca));
    if (selected) set.add(selected.ca);
    if (portfolio && portfolio !== "loading") {
      portfolio.holdings.forEach(h => set.add(h.coin.ca));
    }
    return Array.from(set);
  }, [liveFeed, watchlist, selected, portfolio]);

  // Initialize DexScreener WebSocket and subscribe to active tokens
  useEffect(() => {
    initDexScreenerSocket();

    // Clean up previous subscriptions
    wsUnsubscribers.current.forEach(unsub => unsub());
    wsUnsubscribers.current = [];

    // Subscribe to each active token via WebSocket
    activeCas.forEach((ca) => {
      const unsub = subscribeToPair(ca, (update) => {
        if (!update.priceUsd) return;

        setLiveFeed(currentFeed => {
          if (!Array.isArray(currentFeed)) return currentFeed;

          const updated = currentFeed.map(coin => {
            if (coin.ca.toLowerCase() !== update.ca.toLowerCase()) return coin;
            return {
              ...coin,
              priceUsd: update.priceUsd ?? coin.priceUsd,
              change24h: update.change24h ?? coin.change24h,
              change1h: update.change1h ?? coin.change1h,
              volume24h: update.volume24h ?? coin.volume24h,
              volume1h: update.volume1h ?? coin.volume1h,
              liquidity: update.liquidity ?? coin.liquidity,
            };
          });

          // Check price alerts on update
          checkPriceAlerts(updated.filter(c => activeCas.includes(c.ca)));

          // Revalue portfolio with new live prices
          if (connectedWallet) {
            setPortfolio(current => {
              if (!current || current === "loading" || !current.balanceSnapshot) return current;
              return revaluePortfolioFromFeed(current, updated);
            });
          }

          setLastPriceUpdate(Date.now());
          return updated;
        });
      });

      wsUnsubscribers.current.push(unsub);
    });

    return () => {
      wsUnsubscribers.current.forEach(unsub => unsub());
      wsUnsubscribers.current = [];
    };
  }, [activeCas, connectedWallet, checkPriceAlerts]);

  // Fallback polling every 30s (in case WebSocket misses updates)
  const refreshPrices = useCallback(async () => {
    if (activeCas.length === 0) return;

    try {
      const batchSize = 30;
      const updates = new Map<string, Partial<LiveLaunch>>();

      for (let i = 0; i < activeCas.length; i += batchSize) {
        const batch = activeCas.slice(i, i + batchSize);
        try {
          const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${batch.join(",")}`, {
            headers: { accept: "application/json" }
          });
          if (!res.ok) continue;

          const data = await res.json();
          const pairs = Array.isArray(data.pairs) ? data.pairs : [];

          for (const pair of pairs) {
            const base = pair.baseToken;
            if (!base?.address) continue;
            const ca = base.address.toLowerCase();
            const price = Number(pair.priceUsd);
            const change24h = Number(pair.priceChange?.h24);

            if (isFinite(price) && price > 0) {
              updates.set(ca, {
                priceUsd: price,
                change24h: isFinite(change24h) ? change24h : undefined,
              });
            }
          }
        } catch { /* continue */ }
      }

      if (updates.size > 0 && Array.isArray(liveFeed)) {
        const updatedFeed = liveFeed.map(coin => {
          const update = updates.get(coin.ca.toLowerCase());
          if (!update) return coin;
          return {
            ...coin,
            priceUsd: update.priceUsd ?? coin.priceUsd,
            change24h: update.change24h ?? coin.change24h,
          };
        });

        setLiveFeed(updatedFeed);
        setLastPriceUpdate(Date.now());

        // Check price alerts
        checkPriceAlerts(updatedFeed);

        if (connectedWallet) {
          setPortfolio(current => {
            if (!current || current === "loading" || !current.balanceSnapshot) return current;
            return revaluePortfolioFromFeed(current, updatedFeed);
          });
        }
      }
    } catch (err) {
      console.warn("Fallback price refresh failed:", err);
    }
  }, [activeCas, liveFeed, connectedWallet, checkPriceAlerts]);

  // Fallback polling every 30 seconds
  useEffect(() => {
    if (priceUpdateIntervalRef.current) clearInterval(priceUpdateIntervalRef.current);

    if (activeCas.length > 0) {
      priceUpdateIntervalRef.current = setInterval(() => {
        void refreshPrices();
      }, 30000);
    }

    return () => {
      if (priceUpdateIntervalRef.current) clearInterval(priceUpdateIntervalRef.current);
    };
  }, [activeCas.length, refreshPrices]);

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
        if (target?.projectCa) {
          navigateToTerminal({ section: "projects" });
        } else {
          setSelected(null);
        }
        setQuery("");
        setNotifOpen(false);
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen, target?.projectCa]);

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

  useEffect(() => {
    const nextSection = target?.section ?? "market";
    const nextTab = target?.marketTab ?? "ALL";
    setSection(nextSection);
    setMarketTabState(nextTab);

    if (target?.projectCa) {
      if (loading) return;
      const token = feed.find((c) => c.ca === target.projectCa);
      setSelected(token ?? null);
      if (token) setSection("projects");
      return;
    }

    setSelected(null);
  }, [target?.section, target?.marketTab, target?.projectCa, feed, loading]);

  useEffect(() => {
    const sectionTitles: Record<Section, string> = {
      market: "Market",
      projects: "Projects",
      signals: "Signals",
      record: "Track Record",
      watchlist: "Watchlist",
      portfolio: "Portfolio",
      smart: "Smart Investing",
      indexes: "EasyA Indexes",
      thesis: "Investor Thesis",
    };
    const token = target?.projectCa ? feed.find((c) => c.ca === target.projectCa) : null;
    const page = token ? `${token.name} ($${token.symbol})` : sectionTitles[target?.section ?? section];
    document.title = `${page} · ezpulse`;
  }, [target?.section, target?.projectCa, section, feed]);

  const watchedCoins = useMemo(
    () => (watchlist.length ? feed.filter((c) => watchlist.includes(x => x.ca)) : []),
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
      setLastPriceUpdate(Date.now());
      const w = walletRef.current;
      if (w) {
        setPortfolio((current) => {
          if (!current || current === "loading" || !current.balanceSnapshot) return current;
          return revaluePortfolioFromFeed(current, fresh.launches);
        });
      }
    }
  }, []);

  const setMarketTab = useCallback((tab: MarketTab) => {
    navigateToTerminal({ section: "market", marketTab: tab });
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  }, []);

  const goto = useCallback((s: Section) => {
    navigateToTerminal({
      section: s,
      marketTab: s === "market" ? marketTab : undefined,
    });
    setMenuOpen(false);
    setQuery("");
    setNotifOpen(false);
    window.scrollTo({ top: 0 });
  }, [marketTab]);

  const openToken = useCallback((c: LiveLaunch) => {
    navigateToTerminal({ section: "projects", projectCa: c.ca });
    setMenuOpen(false);
    setQuery("");
    window.scrollTo({ top: 0 });
  }, []);

  const closeProject = useCallback(() => {
    navigateToTerminal({ section: "projects" });
    window.scrollTo({ top: 0 });
  }, []);

  const note = selected ? tokenNote(selected, feed) : null;

  return {
    section,
    setSection,
    marketTab,
    setMarketTab,
    categoryFilter,
    setCategoryFilter,
    categories: PROJECT_CATEGORIES,
    selected,
    setSelected,
    query,
    setQuery,
    menuOpen,
    setMenuOpen,
    sidebarHidden,
    openSidebar,
    hideSidebar,
    closeSidebar,
    liveFeed,
    setLiveFeed,
    copiedCa,
    watchlist,
    alerts,
    priceAlerts,
    addPriceAlert,
    removePriceAlert,
    togglePriceAlert,
    wallet: connectedWallet,
    walletProvider,
    walletConnecting: connecting,
    walletConnectingId: connectingId,
    walletPickerOpen,
    setWalletPickerOpen,
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
    walletMissing,
    phantomMissing: walletMissing,
    paletteOpen,
    setPaletteOpen,
    lastUpdated,
    lastPriceUpdate,
    booted,
    setBooted,
    bootSlow,
    toggleWatch,
    openWalletPicker,
    signInWallet,
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
    closeProject,
    routeProjectCa: target?.projectCa,
    refreshFeed,
    refreshPrices,
  };
}

export type TerminalState = ReturnType<typeof useTerminal>;

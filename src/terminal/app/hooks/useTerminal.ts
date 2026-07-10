  // Check price thresholds and create notifications
  const checkPriceAlerts = useCallback((updatedTokens: LiveLaunch[]) => {
    if (!priceAlerts.length) return;

    const newPriceNotifs: Notif[] = [];
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

          newPriceNotifs.push({
            key: `price-alert-${alert.id}-${Date.now()}`,
            icon: alert.direction === "above" ? "📈" : "📉",
            strength: alert.direction === "above" ? "BULLISH" : "BEARISH",
            title: `${token.symbol} hit $${alert.targetPrice}`,
            detail: `Price went ${alert.direction} $${alert.targetPrice} (now $${currentPrice.toFixed(6)})`,
            token,
          });
        }
      });
    });

    if (newPriceNotifs.length > 0) {
      // Add to a dedicated price notification state so panel can show them
      setPriceTriggeredNotifs((prev) => [...prev, ...newPriceNotifs]);
    }
  }, [priceAlerts]);

  // Dedicated state for price-triggered notifications
  const [priceTriggeredNotifs, setPriceTriggeredNotifs] = useState<Notif[]>([]);

  // Combined notifications (signal + price alerts)
  const allNotifs = useMemo(() => {
    return [...notifs, ...priceTriggeredNotifs];
  }, [notifs, priceTriggeredNotifs]);

  const unseenCount = allNotifs.filter((n) => !seenNotifs.includes(n.key)).length;

  const openNotifs = () => {
    setNotifOpen((v) => !v);
    if (!notifOpen && unseenCount > 0) {
      const next = [...new Set([...seenNotifs, ...allNotifs.map((n) => n.key)])];
      setSeenNotifs(next);
      saveSeenNotifs(next);
    }
  };

  // Expose combined notifs for the panel
  const combinedNotifs = allNotifs;

  const topMover = feed.length ? feed.reduce((a, b) => (b.change24h > a.change24h ? b : a)) : null;
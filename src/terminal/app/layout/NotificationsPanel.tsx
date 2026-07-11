import { useMemo } from "react";
import { useTerminalContext } from "../TerminalContext";
import { saveSeenNotifs } from "../notifs";

export function NotificationsPanel() {
  const {
    notifOpen,
    setNotifOpen,
    allNotifs,
    seenNotifs,
    setSeenNotifs,
    openToken,
    goto,
    watchlist,
    priceAlerts,
  } = useTerminalContext();

  const unreadCount = allNotifs.filter((n) => !seenNotifs.includes(n.key)).length;

  const sorted = useMemo(
    () => [...allNotifs].reverse(),
    [allNotifs],
  );

  if (!notifOpen) return null;

  const markAllAsRead = () => {
    const allKeys = allNotifs.map((n) => n.key);
    const next = [...new Set([...seenNotifs, ...allKeys])];
    setSeenNotifs(next);
    saveSeenNotifs(next);
  };

  const markAsRead = (key: string) => {
    if (!seenNotifs.includes(key)) {
      const next = [...seenNotifs, key];
      setSeenNotifs(next);
      saveSeenNotifs(next);
    }
  };

  const isThreshold = (key: string) => key.startsWith("price-alert-");

  return (
    <>
      <div className="fixed inset-0 z-[110]" onClick={() => setNotifOpen(false)} aria-hidden />
      <div className="term-panel term-notif-panel fixed right-2 z-[120] w-[calc(100%-1rem)] max-w-sm overflow-hidden rounded-xl sm:right-4">
        <div
          className="flex items-center justify-between border-b px-4 py-3"
          style={{ borderColor: "var(--term-border-subtle)", background: "var(--term-surface-2)" }}
        >
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-semibold" style={{ color: "var(--term-text)" }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-red-600 px-2 py-px font-mono text-[9px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="font-mono text-[10px] font-medium"
                style={{ color: "var(--term-text-muted)" }}
              >
                Mark read
              </button>
            )}
            <button
              type="button"
              onClick={() => setNotifOpen(false)}
              className="term-icon-btn h-6 w-6 border-0 bg-transparent text-base"
              style={{ color: "var(--term-text-muted)" }}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        <div className="max-h-[min(24rem,55vh)] overflow-y-auto scrollbar-thin sm:max-h-[28rem]">
          {sorted.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <div className="text-3xl">🔔</div>
              <p className="mt-2 text-[13px] font-medium" style={{ color: "var(--term-text-secondary)" }}>
                No alerts yet
              </p>
              <p className="mt-1 text-[11px] leading-relaxed" style={{ color: "var(--term-text-muted)" }}>
                {watchlist.length > 0
                  ? "Signal alerts appear when watched tokens move. Set custom thresholds from any token page."
                  : "Star tokens on your watchlist or set threshold alerts on any project."}
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--term-border-subtle)" }}>
              {sorted.map((notif) => {
                const isRead = seenNotifs.includes(notif.key);
                const threshold = isThreshold(notif.key);
                return (
                  <button
                    key={notif.key}
                    type="button"
                    onClick={() => {
                      markAsRead(notif.key);
                      setNotifOpen(false);
                      openToken(notif.token);
                    }}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${isRead ? "opacity-55" : ""}`}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--term-hover)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <span className="mt-0.5 text-lg">{notif.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[12px] font-semibold" style={{ color: "var(--term-text)" }}>
                          {notif.title}
                        </span>
                        {!isRead && <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-red-500" />}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded px-1 py-px font-mono text-[7px] font-semibold uppercase tracking-wide text-white ${
                            notif.strength === "BULLISH" ? "bg-emerald-700" : "bg-red-600"
                          }`}
                        >
                          {notif.strength}
                        </span>
                        <span
                          className="rounded px-1 py-px font-mono text-[7px] font-semibold uppercase tracking-wide"
                          style={{ background: "var(--term-surface-3)", color: "var(--term-text-subtle)" }}
                        >
                          {threshold ? "Threshold" : "Signal"}
                        </span>
                      </span>
                      <span className="mt-1 block line-clamp-2 text-[11px]" style={{ color: "var(--term-text-muted)" }}>
                        {notif.detail}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div
          className="flex items-center justify-between gap-2 border-t px-4 py-2"
          style={{ borderColor: "var(--term-border-subtle)", background: "var(--term-surface-2)" }}
        >
          <button
            type="button"
            onClick={() => { setNotifOpen(false); goto("watchlist"); }}
            className="font-mono text-[10px] font-medium"
            style={{ color: "var(--term-text-muted)" }}
          >
            Alert preferences
          </button>
          {priceAlerts.length > 0 && (
            <span className="font-mono text-[9px] tabular-nums" style={{ color: "var(--term-text-subtle)" }}>
              {priceAlerts.filter((a) => a.enabled).length} threshold{priceAlerts.filter((a) => a.enabled).length !== 1 ? "s" : ""} active
            </span>
          )}
        </div>
      </div>
    </>
  );
}
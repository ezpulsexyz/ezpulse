import { useTerminalContext } from "../TerminalContext";
import type { Notif } from "../types";

function timeAgo(ts?: number): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationsPanel() {
  const {
    notifOpen,
    setNotifOpen,
    notifs,
    seenNotifs,
    setSeenNotifs,
  } = useTerminalContext();

  if (!notifOpen) return null;

  // Sort newest first
  const sortedNotifs = [...notifs].sort((a, b) => b.key.localeCompare(a.key));

  const unreadCount = sortedNotifs.filter(n => !seenNotifs.includes(n.key)).length;

  const markAllAsRead = () => {
    const allKeys = sortedNotifs.map(n => n.key);
    const next = [...new Set([...seenNotifs, ...allKeys])];
    setSeenNotifs(next);
  };

  const markAsRead = (key: string) => {
    if (!seenNotifs.includes(key)) {
      setSeenNotifs([...seenNotifs, key]);
    }
  };

  // Group by token
  const grouped = sortedNotifs.reduce((acc, notif) => {
    const ca = notif.token.ca;
    if (!acc[ca]) acc[ca] = [];
    acc[ca].push(notif);
    return acc;
  }, {} as Record<string, Notif[]>);

  const tokenCas = Object.keys(grouped);

  return (
    <div className="fixed right-4 top-[72px] z-[120] w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          <span className="font-semibold tracking-tight">Notifications</span>
          {unreadCount > 0 && (
            <span className="rounded-full bg-red-500 px-2 py-px text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-[11px] font-medium text-zinc-500 hover:text-zinc-700 active:text-zinc-900"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={() => setNotifOpen(false)}
            className="text-2xl leading-none text-zinc-400 hover:text-zinc-600"
          >
            ×
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-[440px] overflow-y-auto p-2">
        {sortedNotifs.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <div className="text-4xl">🔔</div>
            <p className="mt-3 text-[13px] font-medium text-zinc-700">No alerts right now</p>
            <p className="mt-1 text-[11px] text-zinc-400">
              Add tokens to Watchlist to get live signals
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tokenCas.map((ca) => {
              const tokenNotifs = grouped[ca];
              const token = tokenNotifs[0].token;

              return (
                <div
                  key={ca}
                  className="overflow-hidden rounded-xl border border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-950"
                >
                  {/* Token header */}
                  <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[13px] font-semibold text-zinc-900 dark:text-white">
                        ${token.symbol}
                      </span>
                      <span className="truncate text-[11px] text-zinc-500">{token.name}</span>
                    </div>
                    <span className="font-mono text-[10px] text-zinc-400">
                      {tokenNotifs.length} alert{tokenNotifs.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Alerts for this token */}
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {tokenNotifs.map((notif) => {
                      const isRead = seenNotifs.includes(notif.key);
                      return (
                        <button
                          key={notif.key}
                          onClick={() => markAsRead(notif.key)}
                          className={`group flex w-full items-start gap-3 px-3 py-3 text-left transition hover:bg-zinc-50 active:bg-zinc-100 dark:hover:bg-zinc-900 ${isRead ? "opacity-70" : ""}`}
                        >
                          <div className="mt-0.5 text-xl opacity-90">{notif.icon}</div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[12.5px] font-semibold tracking-[-0.1px] ${notif.strength === "BULLISH" ? "text-emerald-600" : notif.strength === "BEARISH" ? "text-red-600" : "text-zinc-700"}`}
                              >
                                {notif.title}
                              </span>
                              {!isRead && (
                                <span className="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-500" />
                              )}
                            </div>

                            <p className="mt-1 line-clamp-2 pr-2 text-[11px] leading-snug text-zinc-500">
                              {notif.detail}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-2 text-center text-[10px] text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
          Live on-chain signals · Updates automatically
        </div>
      </div>
    );
  }
}

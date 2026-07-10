import { useTerminalContext } from "../TerminalContext";
import type { Notif } from "../types";

export function NotificationsPanel() {
  const {
    notifOpen,
    setNotifOpen,
    notifs,
    seenNotifs,
    setSeenNotifs,
    openNotifs,
  } = useTerminalContext();

  if (!notifOpen) return null;

  const unreadCount = notifs.filter(n => !seenNotifs.includes(n.key)).length;

  const markAllAsRead = () => {
    const allKeys = notifs.map(n => n.key);
    const next = [...new Set([...seenNotifs, ...allKeys])];
    setSeenNotifs(next);
  };

  const markAsRead = (key: string) => {
    if (!seenNotifs.includes(key)) {
      setSeenNotifs([...seenNotifs, key]);
    }
  };

  // Group notifications by token
  const grouped = notifs.reduce((acc, notif) => {
    const ca = notif.token.ca;
    if (!acc[ca]) acc[ca] = [];
    acc[ca].push(notif);
    return acc;
  }, {} as Record<string, Notif[]>);

  const tokens = Object.keys(grouped);

  return (
    <div className="fixed right-4 top-[72px] z-[120] w-full max-w-sm rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-[11px] font-medium text-zinc-500 hover:text-zinc-700"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={() => setNotifOpen(false)}
            className="text-xl leading-none text-zinc-400 hover:text-zinc-600"
          >
            ×
          </button>
        </div>
      </div>

      <div className="max-h-[420px] overflow-y-auto p-2">
        {notifs.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <div className="text-3xl">🔔</div>
            <p className="mt-2 text-[13px] font-medium text-zinc-600">No alerts yet</p>
            <p className="mt-1 text-[11px] text-zinc-400">
              Add tokens to your watchlist to receive signals
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tokens.map((ca) => {
              const tokenNotifs = grouped[ca];
              const token = tokenNotifs[0].token;

              return (
                <div key={ca} className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="mb-2 flex items-center gap-2 px-1">
                    <span className="font-mono text-[12px] font-semibold text-zinc-900 dark:text-white">
                      ${token.symbol}
                    </span>
                    <span className="text-[11px] text-zinc-500">{token.name}</span>
                  </div>

                  <div className="space-y-1">
                    {tokenNotifs.map((notif) => {
                      const isRead = seenNotifs.includes(notif.key);
                      return (
                        <button
                          key={notif.key}
                          onClick={() => markAsRead(notif.key)}
                          className={`w-full rounded-lg px-3 py-2 text-left transition ${isRead ? "opacity-60" : "hover:bg-white dark:hover:bg-zinc-800"}`}
                        >
                          <div className="flex items-start gap-2">
                            <span className="mt-0.5 text-lg">{notif.icon}</span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-[12px] font-semibold ${notif.strength === "BULLISH" ? "text-emerald-600" : notif.strength === "BEARISH" ? "text-red-600" : "text-zinc-600"}`}>
                                  {notif.title}
                                </span>
                                {!isRead && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                )}
                              </div>
                              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-zinc-500">
                                {notif.detail}
                              </p>
                            </div>
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

        <div className="border-t border-zinc-100 px-4 py-2.5 text-center text-[11px] text-zinc-400 dark:border-zinc-800">
          Signals update live from on-chain data
        </div>
      </div>
    );
  }
}

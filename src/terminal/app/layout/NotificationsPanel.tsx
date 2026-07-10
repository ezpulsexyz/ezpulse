import { useTerminalContext } from "../TerminalContext";

export function NotificationsPanel() {
  const {
    notifOpen,
    setNotifOpen,
    notifs,
    priceTriggeredNotifs = [],
    seenNotifs,
    setSeenNotifs,
  } = useTerminalContext();

  if (!notifOpen) return null;

  // Combine signal notifs + price alerts
  const allNotifs = [...notifs, ...(priceTriggeredNotifs || [])];

  const unreadCount = allNotifs.filter((n: any) => !seenNotifs.includes(n.key)).length;

  const markAllAsRead = () => {
    const allKeys = allNotifs.map((n: any) => n.key);
    setSeenNotifs([...new Set([...seenNotifs, ...allKeys])]);
  };

  const markAsRead = (key: string) => {
    if (!seenNotifs.includes(key)) {
      setSeenNotifs([...seenNotifs, key]);
    }
  };

  // Group by token
  const grouped = allNotifs.reduce((acc: any, notif: any) => {
    const ca = notif.token.ca;
    if (!acc[ca]) acc[ca] = [];
    acc[ca].push(notif);
    return acc;
  }, {});

  const tokenCas = Object.keys(grouped);

  return (
    <div className="fixed right-2 top-[68px] z-[120] w-[calc(100%-1rem)] max-w-sm overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl sm:right-4 sm:w-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-zinc-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold tracking-tight">Notifications</span>
          {unreadCount > 0 && (
            <span className="rounded-full bg-red-500 px-2 py-px text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm">
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="text-[11px] font-medium text-zinc-500 hover:text-zinc-700">
              Mark all read
            </button>
          )}
          <button onClick={() => setNotifOpen(false)} className="text-2xl leading-none text-zinc-400">
            ×
          </button>
        </div>
      </div>

      <div className="max-h-[70vh] overflow-y-auto p-2 sm:max-h-[440px]">
        {allNotifs.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <div className="text-4xl">🔔</div>
            <p className="mt-2 text-[13px] font-medium text-zinc-600">No alerts yet</p>
            <p className="mt-1 text-[11px] text-zinc-400">Add tokens to watchlist or set price alerts</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tokenCas.map((ca) => {
              const tokenNotifs = grouped[ca];
              const token = tokenNotifs[0].token;

              return (
                <div key={ca} className="overflow-hidden rounded-xl border border-zinc-100 bg-white">
                  <div className="flex items-center justify-between border-b bg-zinc-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[13px] font-semibold">${token.symbol}</span>
                      <span className="text-[11px] text-zinc-500 truncate">{token.name}</span>
                    </div>
                    <span className="text-[10px] text-zinc-400">{tokenNotifs.length}</span>
                  </div>

                  <div className="divide-y text-sm">
                    {tokenNotifs.map((notif: any) => {
                      const isRead = seenNotifs.includes(notif.key);
                      return (
                        <div
                          key={notif.key}
                          onClick={() => markAsRead(notif.key)}
                          className={`flex cursor-pointer items-start gap-3 px-3 py-3 hover:bg-zinc-50 ${isRead ? "opacity-60" : ""}`}
                        >
                          <div className="mt-0.5 text-lg">{notif.icon}</div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 font-medium">
                              <span>{notif.title}</span>
                              {!isRead && <span className="ml-auto h-2 w-2 rounded-full bg-red-500" />}
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{notif.detail}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t bg-zinc-50 px-4 py-2 text-center text-[10px] text-zinc-400">
        Live signals + price alerts
      </div>
    </div>
  );
}

import { useTerminalContext } from "../TerminalContext";

export function NotificationsPanel() {
  const { notifOpen, setNotifOpen, notifs, seenNotifs, setSeenNotifs } = useTerminalContext();

  if (!notifOpen) return null;

  const unreadCount = notifs.filter((n) => !seenNotifs.includes(n.key)).length;

  const markAllAsRead = () => {
    const allKeys = notifs.map((n) => n.key);
    setSeenNotifs([...new Set([...seenNotifs, ...allKeys])];
  };

  const markAsRead = (key: string) => {
    if (!seenNotifs.includes(key)) {
      setSeenNotifs([...seenNotifs, key]);
    }
  };

  return (
    <div className="fixed right-4 top-[72px] z-[120] w-full max-w-sm rounded-2xl border border-zinc-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
              {unreadCount} new
            </span>
          )}
        </div>
        <button onClick={() => setNotifOpen(false)} className="text-2xl leading-none text-zinc-400">
          ×
        </button>
      </div>

      <div className="max-h-[400px] overflow-y-auto p-3">
        {notifs.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-500">
            No alerts yet. Add tokens to your watchlist.
          </div>
        ) : (
          <div className="space-y-2">
            {notifs.map((notif) => {
              const isRead = seenNotifs.includes(notif.key);
              return (
                <div
                  key={notif.key}
                  onClick={() => markAsRead(notif.key)}
                  className={`rounded-lg border p-3 text-sm ${isRead ? "opacity-60" : "cursor-pointer hover:bg-zinc-50"}`}
                >
                  <div className="flex items-center gap-2 font-medium">
                    <span>{notif.icon}</span>
                    <span>{notif.title}</span>
                    {!isRead && <span className="ml-auto h-2 w-2 rounded-full bg-red-500" />}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{notif.detail}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {unreadCount > 0 && (
        <div className="border-t p-2 text-center">
          <button onClick={markAllAsRead} className="text-xs text-zinc-500 hover:text-zinc-700">
            Mark all as read
          </button>
        </div>
      )}
    </div>
  );
}

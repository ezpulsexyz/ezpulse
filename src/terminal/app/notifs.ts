export function loadSeenNotifs(): string[] {
  try { return JSON.parse(localStorage.getItem("ezpulse:notifs-seen") || "[]"); } catch { return []; }
}

export function saveSeenNotifs(keys: string[]) {
  try { localStorage.setItem("ezpulse:notifs-seen", JSON.stringify(keys.slice(-200))); } catch { /* noop */ }
}

/** Pulsing live indicator with optional last-updated timestamp. */
export function LiveBadge({
  label = "Live",
  ts,
  tone = "emerald",
  size = "sm",
}: {
  label?: string;
  ts?: number | null;
  tone?: "emerald" | "red" | "amber" | "zinc";
  size?: "sm" | "md";
}) {
  const dot: Record<typeof tone, string> = {
    emerald: "bg-emerald-500",
    red: "bg-red-500",
    amber: "bg-amber-400",
    zinc: "bg-zinc-400",
  };
  const ping: Record<typeof tone, string> = {
    emerald: "bg-emerald-400",
    red: "bg-red-400",
    amber: "bg-amber-300",
    zinc: "bg-zinc-300",
  };
  const text: Record<typeof tone, string> = {
    emerald: "text-emerald-700",
    red: "text-red-600",
    amber: "text-amber-700",
    zinc: "text-zinc-500",
  };
  const bg: Record<typeof tone, string> = {
    emerald: "bg-emerald-50",
    red: "bg-red-50",
    amber: "bg-amber-50",
    zinc: "bg-zinc-100",
  };

  const time = ts
    ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${bg[tone]} ${text[tone]} ${
        size === "md" ? "px-3 py-1.5 text-[11px]" : "px-2.5 py-1 text-[10px]"
      }`}
      title={ts ? `Last updated ${new Date(ts).toLocaleString()}` : undefined}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${ping[tone]}`} />
        <span className={`relative inline-flex h-2 w-2 rounded-full ${dot[tone]}`} />
      </span>
      <span>{label}</span>
      {time && <span className="font-mono text-[9px] font-normal tabular-nums opacity-70">· {time}</span>}
    </span>
  );
}
/** Compact live indicator with optional last-updated timestamp. */
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
    emerald: "bg-emerald-600",
    red: "bg-red-600",
    amber: "bg-amber-500",
    zinc: "bg-zinc-400",
  };
  const text: Record<typeof tone, string> = {
    emerald: "text-emerald-800",
    red: "text-red-700",
    amber: "text-amber-800",
    zinc: "text-zinc-500",
  };
  const bg: Record<typeof tone, string> = {
    emerald: "bg-emerald-50/80",
    red: "bg-red-50/80",
    amber: "bg-amber-50/80",
    zinc: "bg-zinc-100",
  };

  const time = ts
    ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border border-zinc-200/80 font-mono ${bg[tone]} ${text[tone]} ${
        size === "md" ? "px-2 py-1 text-[10px]" : "px-1.5 py-0.5 text-[9px]"
      }`}
      title={ts ? `Last updated ${new Date(ts).toLocaleString()}` : undefined}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot[tone]}`} />
      <span className="font-medium uppercase tracking-wide">{label}</span>
      {time && <span className="font-normal tabular-nums opacity-60">{time}</span>}
    </span>
  );
}
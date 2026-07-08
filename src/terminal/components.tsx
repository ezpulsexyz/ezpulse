import type { ReactNode } from "react";

export const BLUE = "#2743f0";

/** Monospace numeric display — prices, mcap, %, balances. */
export function Num({ children, className = "", bold = false, size = "md" }: {
  children: ReactNode; className?: string; bold?: boolean; size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizes = { sm: "text-[10px]", md: "text-[11px]", lg: "text-base", xl: "text-lg sm:text-xl" };
  return (
    <span className={`font-mono tabular-nums tracking-tight ${sizes[size]} ${bold ? "font-semibold" : "font-medium"} ${className}`}>
      {children}
    </span>
  );
}

export function Card({ title, right, children, className = "", pad = false }: {
  title?: string; right?: ReactNode; children: ReactNode; className?: string; pad?: boolean;
}) {
  return (
    <section className={`overflow-hidden rounded-md border border-zinc-200 bg-white ${className}`}>
      {title && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-3 py-2 sm:px-4">
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-400">{title}</span>
          {right}
        </header>
      )}
      <div className={pad ? "p-4" : ""}>{children}</div>
    </section>
  );
}

export function Delta({ v, suffix = "" }: { v: number; suffix?: string }) {
  const up = v >= 0;
  return (
    <span className={`font-mono text-[11px] font-medium tabular-nums tracking-tight ${up ? "text-emerald-700" : "text-red-600"}`}>
      {up ? "▲" : "▼"}{Math.abs(v).toFixed(1)}{suffix}
    </span>
  );
}

export function Stat({ label, value, sub, accent = false }: { label: ReactNode; value: string; sub?: ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-400">{label}</div>
      <div className={`mt-0.5 font-mono text-base font-semibold tabular-nums tracking-tight sm:text-lg ${accent ? "" : "text-zinc-900"}`} style={accent ? { color: BLUE } : undefined}>{value}</div>
      {sub && <div className="mt-0.5 text-[10px] text-zinc-400">{sub}</div>}
    </div>
  );
}

export function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <span
        role="button"
        tabIndex={0}
        aria-label={text}
        className="cursor-help rounded-full border border-zinc-200 bg-zinc-100 px-1.5 text-[10px] font-semibold text-zinc-500 transition hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
      >
        ?
      </span>
      <span className="pointer-events-none absolute left-0 top-full z-10 mt-2 max-w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-zinc-800 bg-zinc-950/95 px-3 py-2 text-[11px] leading-relaxed text-white opacity-0 shadow-lg transition duration-150 group-hover:opacity-100 group-focus-within:opacity-100 sm:left-1/2 sm:w-72 sm:max-w-none sm:-translate-x-1/2">
        {text}
      </span>
    </span>
  );
}

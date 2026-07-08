import type { ReactNode } from "react";

export const BLUE = "#2743f0";

/** Monospace numeric display — prices, mcap, %, balances. */
export function Num({ children, className = "", bold = false, size = "md" }: {
  children: ReactNode; className?: string; bold?: boolean; size?: "sm" | "md" | "lg" | "xl" | "2xl";
}) {
  const sizes = { sm: "text-[10px]", md: "text-[11px]", lg: "text-base", xl: "text-lg sm:text-xl", "2xl": "text-xl sm:text-2xl" };
  return (
    <span className={`font-mono tabular-nums tracking-tight ${sizes[size]} ${bold ? "font-semibold" : "font-medium"} ${className}`} style={{ color: "var(--term-text, #18181b)" }}>
      {children}
    </span>
  );
}

export function Card({ title, right, children, className = "", pad = false }: {
  title?: string; right?: ReactNode; children: ReactNode; className?: string; pad?: boolean;
}) {
  return (
    <section className={`term-card ${className}`}>
      {title && (
        <header className="term-card__head">
          <span className="term-card__title">{title}</span>
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
    <span className={`font-mono text-[11px] font-medium tabular-nums tracking-tight ${up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
      {up ? "▲" : "▼"}{Math.abs(v).toFixed(1)}{suffix}
    </span>
  );
}

export function Stat({ label, value, sub, accent = false }: { label: ReactNode; value: string; sub?: ReactNode; accent?: boolean }) {
  return (
    <div className="term-market-stat">
      <div className="term-market-stat__label">{label}</div>
      <div className="term-market-stat__value" style={accent ? { color: "var(--term-accent)" } : undefined}>{value}</div>
      {sub && <div className="term-market-stat__sub">{sub}</div>}
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
        className="term-chip-btn cursor-help px-1.5 text-[10px] font-semibold"
      >
        ?
      </span>
      <span className="term-panel pointer-events-none absolute left-0 top-full z-10 mt-2 max-w-[min(18rem,calc(100vw-2rem))] px-3 py-2 text-[11px] leading-relaxed opacity-0 transition duration-150 group-hover:opacity-100 group-focus-within:opacity-100 sm:left-1/2 sm:w-72 sm:max-w-none sm:-translate-x-1/2" style={{ color: "var(--term-text-secondary)" }}>
        {text}
      </span>
    </span>
  );
}
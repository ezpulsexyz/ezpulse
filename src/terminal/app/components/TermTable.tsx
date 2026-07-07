import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

const GRID_BASE = "items-center gap-x-3";

export const COIN_COLS = "lg:grid-cols-[2rem_minmax(0,1fr)_5.5rem_4.5rem_5.5rem_5.5rem_8.75rem]";
export const COIN_GRID = `lg:grid ${COIN_COLS} ${GRID_BASE}`;

export const PORTFOLIO_COLS = "lg:grid-cols-[minmax(0,1fr)_6rem_5.5rem_4.5rem_5.5rem_8.75rem]";
export const PORTFOLIO_GRID = `lg:grid ${PORTFOLIO_COLS} ${GRID_BASE}`;

export const STATS_COLS = "sm:grid-cols-[minmax(0,1fr)_5rem_5rem_6rem_8rem]";
export const STATS_GRID = `sm:grid ${STATS_COLS} ${GRID_BASE}`;

export const DIRECTORY_COLS = "sm:grid-cols-[2rem_minmax(0,1fr)_5.5rem_4.5rem_2.5rem]";
export const DIRECTORY_GRID = `sm:grid ${DIRECTORY_COLS} ${GRID_BASE}`;

export const PEER_COLS = "grid-cols-[minmax(0,1fr)_5.5rem_4.5rem]";
export const PEER_GRID = `grid ${PEER_COLS} ${GRID_BASE}`;

const ROW =
  "group relative w-full border-b border-zinc-100/90 px-3 py-2.5 font-mono text-[12px] transition-colors last:border-0 hover:bg-zinc-50/90 sm:px-5";

const ACCENT =
  "before:pointer-events-none before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-r-sm before:bg-indigo-600 before:opacity-0 before:transition-opacity before:duration-150 group-hover:before:opacity-100";

export function TermRow({
  children,
  grid,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & { grid?: string }) {
  return (
    <div className={`${ROW} ${ACCENT} flex flex-wrap items-center gap-x-3 gap-y-2 ${grid ?? ""} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function TermRowButton({
  children,
  grid,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { grid?: string }) {
  return (
    <button type="button" className={`${ROW} ${ACCENT} flex flex-wrap items-center gap-x-3 gap-y-2 text-left ${grid ?? ""} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function TermHead({ children, cols, breakpoint = "lg", className = "" }: { children: ReactNode; cols: string; breakpoint?: "sm" | "lg"; className?: string }) {
  const show = breakpoint === "sm" ? "hidden sm:grid" : "hidden lg:grid";
  return (
    <div
      className={`${show} ${cols} ${GRID_BASE} border-b border-zinc-200 bg-zinc-50/70 px-5 py-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-zinc-400 ${className}`}
    >
      {children}
    </div>
  );
}

export function TermHeadCell({ children, align = "left", className = "" }: { children: ReactNode; align?: "left" | "right"; className?: string }) {
  return <span className={`block ${align === "right" ? "text-right" : ""} ${className}`}>{children}</span>;
}

/** Monospace numeric cell — right-aligned, tabular. */
export function TermNum({ children, className = "", bold = false }: { children: ReactNode; className?: string; bold?: boolean }) {
  return (
    <span className={`block text-right font-mono text-[12px] tabular-nums tracking-tight ${bold ? "font-bold text-zinc-900" : "text-zinc-700"} ${className}`}>
      {children}
    </span>
  );
}

export function TermActions({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-end gap-1.5">{children}</div>;
}
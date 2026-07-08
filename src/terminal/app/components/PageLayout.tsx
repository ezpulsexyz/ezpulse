import type { ReactNode } from "react";
import { BLUE } from "../../components";
import { COIN_GRID, TermRow } from "./TermTable";

export function PageHead({ title, sub, right }: { title: string; sub: string; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-2 sm:mb-4 sm:items-end">
      <div className="min-w-0 flex-1">
        <h1 className="text-sm font-semibold tracking-tight text-zinc-900 sm:text-[15px]">{title}</h1>
        <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">{sub}</p>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

export function LoadingRows() {
  return (
    <div>
      {[...Array(4)].map((_, i) => (
        <TermRow key={i} grid={COIN_GRID}>
          <div className="term-shimmer h-3 w-4 rounded" />
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="term-shimmer h-7 w-7 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="term-shimmer h-3 w-36 rounded" />
              <div className="term-shimmer h-2 w-48 rounded" />
            </div>
          </div>
          <div className="term-shimmer hidden h-3 w-14 rounded lg:block" />
          <div className="term-shimmer hidden h-3 w-12 rounded lg:block" />
          <div className="term-shimmer hidden h-3 w-14 rounded lg:block" />
          <div className="term-shimmer hidden h-3 w-14 rounded lg:block" />
          <div className="term-shimmer hidden h-7 w-20 rounded lg:block" />
        </TermRow>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, body, cta }: { icon: string; title: string; body: string; cta?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-zinc-300 bg-white p-5 text-center sm:p-8">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-400">{icon}</div>
      <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-md text-[11px] leading-relaxed text-zinc-500">{body}</p>
      {cta && <div className="mt-4 flex flex-wrap justify-center gap-2">{cta}</div>}
    </div>
  );
}

export const LaunchCta = () => (
  <>
    <a href="https://kickstart.easya.io" target="_blank" rel="noopener noreferrer"
      className="rounded px-4 py-1.5 font-mono text-[10px] font-medium text-white transition hover:opacity-90" style={{ background: BLUE }}>
      Launch on Kickstart
    </a>
    <a href="https://t.me/+PYEPxw-L9n81NDA0" target="_blank" rel="noopener noreferrer"
      className="rounded border border-zinc-200 bg-white px-4 py-1.5 font-mono text-[10px] text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-800">
      Join Telegram
    </a>
  </>
);

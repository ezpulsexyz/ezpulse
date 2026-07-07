import type { ReactNode } from "react";
import { BLUE } from "../../components";

export function PageHead({ title, sub, right }: { title: string; sub: string; right?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-900">{title}</h1>
        <p className="mt-0.5 text-[13px] text-zinc-500">{sub}</p>
      </div>
      {right}
    </div>
  );
}

export function LoadingRows() {
  return (
    <div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-3 border-b border-zinc-50 px-5 py-4 last:border-0">
          <div className="h-7 w-7 rounded-full bg-zinc-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-40 rounded bg-zinc-100" />
            <div className="h-2 w-64 rounded bg-zinc-50" />
          </div>
          <div className="h-3 w-16 rounded bg-zinc-100" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, body, cta }: { icon: string; title: string; body: string; cta?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
      <div className="mb-2 text-3xl">{icon}</div>
      <h2 className="font-display text-lg font-semibold text-zinc-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-zinc-500">{body}</p>
      {cta && <div className="mt-5 flex flex-wrap justify-center gap-3">{cta}</div>}
    </div>
  );
}

export const LaunchCta = () => (
  <>
    <a href="https://kickstart.easya.io" target="_blank" rel="noopener noreferrer"
      className="rounded-full px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white" style={{ background: BLUE }}>
      Launch on Kickstart →
    </a>
    <a href="https://t.me/+PYEPxw-L9n81NDA0" target="_blank" rel="noopener noreferrer"
      className="rounded-full border border-zinc-200 bg-white px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-zinc-600 transition hover:border-indigo-300 hover:text-indigo-700">
      ✈️ Join the chat
    </a>
  </>
);

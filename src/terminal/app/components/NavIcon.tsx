import type { ReactNode } from "react";
import type { Section } from "../types";

const paths: Record<Section, ReactNode> = {
  market: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M3 14V10M7 14V6M11 14V9M15 14V4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  ),
  projects: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
      <rect x="3" y="3" width="6" height="6" rx="1.25" stroke="currentColor" strokeWidth="1.75" />
      <rect x="11" y="3" width="6" height="6" rx="1.25" stroke="currentColor" strokeWidth="1.75" />
      <rect x="3" y="11" width="6" height="6" rx="1.25" stroke="currentColor" strokeWidth="1.75" />
      <rect x="11" y="11" width="6" height="6" rx="1.25" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  ),
  thesis: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M5 4h10v12H5z" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 8h4M8 11h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  ),
  signals: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M10 3v3M10 14v3M3 10h3M14 10h3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="10" cy="10" r="3.25" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  ),
  record: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
      <circle cx="10" cy="10" r="6.25" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="10" cy="10" r="2.25" fill="currentColor" />
    </svg>
  ),
  watchlist: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M10 4.5l1.35 2.74 3.02.44-2.18 2.13.52 3.01L10 11.77l-2.71 1.05.52-3.01-2.18-2.13 3.02-.44L10 4.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
  indexes: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M4 6h12M4 10h12M4 14h8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  ),
  portfolio: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M4 6.5A2.5 2.5 0 016.5 4h7A2.5 2.5 0 0116 6.5v9A1.5 1.5 0 0114.5 17h-9A1.5 1.5 0 014 15.5v-9z" stroke="currentColor" strokeWidth="1.75" />
      <path d="M4 8h12" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  ),
  smart: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M10 3l1.2 3.6H15l-3 2.2 1.1 3.6L10 12.2 6.9 12.4 8 8.8 5 7.6h3.8L10 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
};

export function NavIcon({ id }: { id: Section }) {
  return <span className="term-nav-glyph">{paths[id]}</span>;
}
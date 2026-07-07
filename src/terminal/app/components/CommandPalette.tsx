import { useEffect, useMemo, useRef, useState } from "react";
import { fmtUsd } from "../../data";
import { Delta } from "../../components";
import { NAV_GROUPS } from "../types";
import type { Section } from "../types";
import { useTerminalContext } from "../TerminalContext";

type Cmd = {
  id: string;
  label: string;
  hint?: string;
  icon: string;
  group: string;
  run: () => void;
  keywords: string;
};

export function CommandPalette() {
  const ctx = useTerminalContext();
  const {
    paletteOpen, setPaletteOpen, feed, goto, openToken, signInPhantom,
    section, setMarketTab, searchRef,
  } = ctx;

  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo<Cmd[]>(() => {
    const nav: Cmd[] = NAV_GROUPS.flatMap((g) =>
      g.items.filter((i) => !i.soon).map((i) => ({
        id: `nav-${i.id}`,
        label: i.label,
        hint: g.workflow,
        icon: i.icon,
        group: "Navigate",
        run: () => { goto(i.id as Section); setPaletteOpen(false); },
        keywords: `${i.label} ${g.workflow} ${i.id} go section`,
      })),
    );

    const tabs: Cmd[] = [
      { id: "tab-all", label: "Market · All tokens", icon: "🏆", group: "Market filter", run: () => { goto("market"); setMarketTab("ALL"); setPaletteOpen(false); }, keywords: "market all mcap" },
      { id: "tab-trend", label: "Market · Trending", icon: "🔥", group: "Market filter", run: () => { goto("market"); setMarketTab("TRENDING"); setPaletteOpen(false); }, keywords: "trending movers" },
      { id: "tab-ver", label: "Market · Verified", icon: "✓", group: "Market filter", run: () => { goto("market"); setMarketTab("VERIFIED"); setPaletteOpen(false); }, keywords: "verified" },
    ];

    const tokens: Cmd[] = [...feed]
      .sort((a, b) => b.mcap - a.mcap)
      .slice(0, 40)
      .map((c) => ({
        id: `tok-${c.ca}`,
        label: `${c.name} · $${c.symbol}`,
        hint: c.mcap ? fmtUsd(c.mcap) : undefined,
        icon: "📟",
        group: "Open token",
        run: () => { openToken(c); setPaletteOpen(false); },
        keywords: `${c.name} ${c.symbol} ${c.ca} token terminal project`,
      }));

    const actions: Cmd[] = [
      { id: "search", label: "Focus search bar", icon: "⌕", group: "Actions", run: () => { setPaletteOpen(false); searchRef.current?.focus(); }, keywords: "search find slash" },
      { id: "phantom", label: "Sign in with Phantom", icon: "👻", group: "Actions", run: () => { signInPhantom(); setPaletteOpen(false); }, keywords: "phantom wallet sign connect" },
      { id: "portfolio", label: "Watch a wallet", icon: "💼", group: "Actions", run: () => { goto("portfolio"); setPaletteOpen(false); }, keywords: "portfolio wallet holdings" },
      { id: "signals", label: "Signals feed", icon: "⚡", group: "Actions", run: () => { goto("signals"); setPaletteOpen(false); }, keywords: "signals whale momentum" },
    ];

    return [...nav, ...tabs, ...tokens, ...actions];
  }, [feed, goto, openToken, setMarketTab, setPaletteOpen, signInPhantom, searchRef]);

  const query = q.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!query) return commands.slice(0, 16);
    return commands.filter((c) => c.keywords.toLowerCase().includes(query) || c.label.toLowerCase().includes(query)).slice(0, 20);
  }, [commands, query]);

  useEffect(() => {
    if (paletteOpen) {
      setQ("");
      setIdx(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [paletteOpen]);

  useEffect(() => { setIdx(0); }, [query]);

  useEffect(() => {
    if (!paletteOpen) return;
    const el = listRef.current?.children[idx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [idx, paletteOpen, filtered.length]);

  if (!paletteOpen) return null;

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && filtered[idx]) { e.preventDefault(); filtered[idx].run(); }
    if (e.key === "Escape") { e.preventDefault(); setPaletteOpen(false); }
  };

  const groups = [...new Set(filtered.map((c) => c.group))];

  let cursor = 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-zinc-900/40 p-4 pt-[12vh] backdrop-blur-sm" onClick={() => setPaletteOpen(false)}>
      <div
        className="term-palette w-full max-w-xl animate-fade-up overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKey}
      >
        <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3">
          <span className="font-mono text-[13px] text-zinc-400">⌘K</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Jump to section, token, or action…"
            className="min-w-0 flex-1 bg-transparent font-mono text-[14px] outline-none placeholder:text-zinc-400"
          />
          <kbd className="hidden rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 sm:inline">esc</kbd>
        </div>
        <div ref={listRef} className="max-h-[min(24rem,50vh)] overflow-y-auto scrollbar-thin py-1">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center font-mono text-[12px] text-zinc-400">No matches</div>
          )}
          {groups.map((group) => {
            const items = filtered.filter((c) => c.group === group);
            return (
              <div key={group}>
                <div className="px-4 py-1.5 font-mono text-[9px] font-bold uppercase tracking-widest text-zinc-400">{group}</div>
                {items.map((cmd) => {
                  const i = cursor++;
                  const active = i === idx;
                  const token = feed.find((c) => cmd.id === `tok-${c.ca}`);
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => cmd.run()}
                      onMouseEnter={() => setIdx(i)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${active ? "bg-indigo-50" : "hover:bg-zinc-50"}`}
                    >
                      <span className="w-5 shrink-0 text-center text-[13px]">{cmd.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-mono text-[13px] font-semibold text-zinc-900">{cmd.label}</span>
                        {cmd.hint && <span className="block truncate font-mono text-[10px] text-zinc-400">{cmd.hint}</span>}
                      </span>
                      {token && <Delta v={token.change24h} suffix="%" />}
                      {active && <span className="shrink-0 font-mono text-[10px] text-indigo-500">↵</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/80 px-4 py-2 font-mono text-[10px] text-zinc-400">
          <span>↑↓ navigate · ↵ run · esc close</span>
          <span className="hidden sm:inline">section: {section}</span>
        </div>
      </div>
    </div>
  );
}
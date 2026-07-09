import { useEffect, useMemo, useRef, useState } from "react";
import { navigateToLanding } from "../../../routes";
import { fmtUsd } from "../../data";
import { BLUE, Delta } from "../../components";
import { kickstartUrl } from "../../kickstart";
import { NAV_GROUPS } from "../types";
import type { Section } from "../types";
import { useTerminalContext } from "../TerminalContext";

type Cmd = {
  id: string;
  label: string;
  hint?: string;
  icon: string;
  group: string;
  badge?: string;
  chipLabel?: string;
  pinned?: boolean;
  run: () => void;
  keywords: string;
};

function scoreCommand(cmd: Cmd, terms: string[]): number {
  if (!terms.length) return cmd.pinned ? 100 : 0;
  const label = cmd.label.toLowerCase();
  const keys = cmd.keywords.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (!term) continue;
    if (label === term) score += 120;
    else if (label.startsWith(term)) score += 80;
    else if (label.includes(term)) score += 40;
    else if (keys.includes(term)) score += 25;
    else return -1;
  }
  return score + (cmd.pinned ? 5 : 0);
}

function filterCommands(commands: Cmd[], raw: string, limit: number): Cmd[] {
  const terms = raw.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) {
    const pinned = commands.filter((c) => c.pinned);
    const rest = commands.filter((c) => !c.pinned).slice(0, Math.max(0, limit - pinned.length));
    return [...pinned, ...rest];
  }
  return commands
    .map((c) => ({ c, score: scoreCommand(c, terms) }))
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.c);
}

export function CommandPalette() {
  const ctx = useTerminalContext();
  const {
    paletteOpen, setPaletteOpen, feed, goto, openToken, openWalletPicker, signOutPhantom,
    section, setMarketTab, searchRef, refreshFeed, topMover, trending, selected,
    toggleWatch, watchlist, copyCa, openNotifs, unseenCount, phantom, loading,
    setShareToken,
  } = ctx;

  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo<Cmd[]>(() => {
    const close = () => setPaletteOpen(false);

    const quick: Cmd[] = [
      {
        id: "qa-refresh",
        label: "Refresh market feed",
        hint: loading ? "Scanning…" : "Pull latest Kickstart prices",
        icon: "↻",
        group: "Quick actions",
        badge: "live",
        chipLabel: "Refresh",
        pinned: true,
        run: () => { void refreshFeed(); close(); },
        keywords: "refresh reload sync update feed market live prices",
      },
      ...(topMover ? [{
        id: "qa-mover",
        label: `Top mover · $${topMover.symbol}`,
        hint: `${topMover.change24h >= 0 ? "+" : ""}${topMover.change24h.toFixed(1)}% · ${topMover.mcap ? fmtUsd(topMover.mcap) : "—"}`,
        icon: "🔥",
        chipLabel: `$${topMover.symbol}`,
        group: "Quick actions",
        pinned: true,
        run: () => { openToken(topMover); close(); },
        keywords: `top mover trending ${topMover.name} ${topMover.symbol} ${topMover.ca}`,
      }] : []),
      ...(trending[0] && trending[0].ca !== topMover?.ca ? [{
        id: "qa-trending",
        label: `Trending · $${trending[0].symbol}`,
        hint: trending[0].mcap ? fmtUsd(trending[0].mcap) : undefined,
        icon: "📈",
        chipLabel: "Trending",
        group: "Quick actions",
        pinned: true,
        run: () => { openToken(trending[0]); close(); },
        keywords: `trending hot ${trending[0].name} ${trending[0].symbol}`,
      }] : []),
      {
        id: "qa-notifs",
        label: unseenCount > 0 ? `Notifications · ${unseenCount} new` : "Notifications",
        hint: watchlist.length ? `${watchlist.length} watched` : "Star tokens for alerts",
        icon: "🔔",
        chipLabel: unseenCount > 0 ? `${unseenCount} alerts` : "Alerts",
        group: "Quick actions",
        pinned: true,
        run: () => { openNotifs(); close(); },
        keywords: "notifications alerts bell watchlist signals",
      },
      {
        id: "qa-search",
        label: "Focus search bar",
        hint: "Shortcut · /",
        icon: "⌕",
        chipLabel: "Search",
        group: "Quick actions",
        pinned: true,
        run: () => { close(); searchRef.current?.focus(); },
        keywords: "search find slash filter",
      },
      {
        id: "qa-portfolio",
        label: "Open portfolio",
        hint: "Connect wallet · your holdings",
        icon: "💼",
        group: "Quick actions",
        run: () => { goto("portfolio"); close(); },
        keywords: "portfolio wallet holdings phantom solflare backpack jupiter balance connect",
      },
      phantom
        ? {
            id: "qa-signout",
            label: "Disconnect wallet",
            hint: `${phantom.slice(0, 4)}…${phantom.slice(-4)}`,
            icon: "🔌",
            group: "Quick actions",
            run: () => { signOutPhantom(); close(); },
            keywords: "wallet sign out disconnect logout phantom solflare backpack jupiter",
          }
        : {
            id: "qa-wallet",
            label: "Connect wallet",
            hint: "Phantom · Solflare · Backpack · Jupiter",
            icon: "💼",
            group: "Quick actions",
            run: () => { openWalletPicker(); close(); },
            keywords: "wallet sign connect login phantom solflare backpack jupiter",
          },
      {
        id: "qa-kickstart",
        label: "Launch on Kickstart",
        hint: "kickstart.easya.io",
        icon: "🚀",
        group: "Quick actions",
        run: () => { window.open("https://kickstart.easya.io", "_blank", "noopener,noreferrer"); close(); },
        keywords: "launch kickstart easya create token",
      },
      {
        id: "qa-home",
        label: "Back to ezpulse.xyz",
        hint: "Marketing site",
        icon: "⌂",
        group: "Quick actions",
        run: () => { navigateToLanding(); close(); },
        keywords: "home landing site marketing back",
      },
    ];

    const nav: Cmd[] = NAV_GROUPS.flatMap((g) =>
      g.items.filter((i) => !i.soon).map((i) => ({
        id: `nav-${i.id}`,
        label: i.label,
        hint: g.workflow,
        icon: i.id.slice(0, 3).toUpperCase(),
        group: "Navigate",
        run: () => { goto(i.id as Section); close(); },
        keywords: `${i.label} ${g.workflow} ${i.id} go section navigate`,
      })),
    );

    const tabs: Cmd[] = [
      { id: "tab-all", label: "Market · All tokens", icon: "🏆", group: "Market views", run: () => { goto("market"); setMarketTab("ALL"); close(); }, keywords: "market all mcap leaderboard" },
      { id: "tab-trend", label: "Market · Trending", icon: "🔥", group: "Market views", run: () => { goto("market"); setMarketTab("TRENDING"); close(); }, keywords: "market trending movers hot" },
      { id: "tab-ver", label: "Market · Verified", icon: "✓", group: "Market views", run: () => { goto("market"); setMarketTab("VERIFIED"); close(); }, keywords: "market verified x authorized" },
      { id: "tab-bonded", label: "Market · Bonded", icon: "🔗", group: "Market views", run: () => { goto("market"); setMarketTab("BONDED"); close(); }, keywords: "market bonded graduated amm" },
      { id: "tab-bonding", label: "Market · Bonding", icon: "⏳", group: "Market views", run: () => { goto("market"); setMarketTab("BONDING"); close(); }, keywords: "market bonding curve progress" },
      { id: "tab-up", label: "Market · Upcoming", icon: "🗓", group: "Market views", run: () => { goto("market"); setMarketTab("UPCOMING"); close(); }, keywords: "market upcoming soon" },
    ];

    const tokenCtx: Cmd[] = selected ? [
      {
        id: "ctx-copy",
        label: `Copy $${selected.symbol} contract`,
        hint: `${selected.ca.slice(0, 6)}…${selected.ca.slice(-4)}`,
        icon: "⧉",
        group: "Current token",
        run: () => { void copyCa(selected.ca); close(); },
        keywords: `copy contract address ca ${selected.symbol} ${selected.ca}`,
      },
      {
        id: "ctx-watch",
        label: watchlist.includes(selected.ca) ? `Unwatch $${selected.symbol}` : `Watch $${selected.symbol}`,
        hint: "Watchlist alerts",
        icon: watchlist.includes(selected.ca) ? "★" : "☆",
        group: "Current token",
        run: () => { toggleWatch(selected.ca); close(); },
        keywords: `watch star unwatch ${selected.symbol} watchlist`,
      },
      {
        id: "ctx-share",
        label: `Share $${selected.symbol} card`,
        hint: "X-ready image",
        icon: "↗",
        group: "Current token",
        run: () => { setShareToken(selected); close(); },
        keywords: `share card twitter x ${selected.symbol}`,
      },
      {
        id: "ctx-dex",
        label: `DexScreener · $${selected.symbol}`,
        hint: "Live chart",
        icon: "📊",
        group: "Current token",
        run: () => { window.open(selected.links.dexscreener, "_blank", "noopener,noreferrer"); close(); },
        keywords: `dexscreener chart ${selected.symbol}`,
      },
      {
        id: "ctx-kick",
        label: `Kickstart page · $${selected.symbol}`,
        hint: "Founder page",
        icon: "🌐",
        group: "Current token",
        run: () => { window.open(kickstartUrl(selected.ca), "_blank", "noopener,noreferrer"); close(); },
        keywords: `kickstart page ${selected.symbol}`,
      },
    ] : [];

    const tokens: Cmd[] = [...feed]
      .sort((a, b) => b.mcap - a.mcap)
      .slice(0, 36)
      .map((c) => ({
        id: `tok-${c.ca}`,
        label: `${c.name} · $${c.symbol}`,
        hint: c.mcap ? fmtUsd(c.mcap) : undefined,
        icon: "📟",
        group: "Open token",
        run: () => { openToken(c); close(); },
        keywords: `${c.name} ${c.symbol} ${c.ca} token terminal project open`,
      }));

    return [...quick, ...tokenCtx, ...nav, ...tabs, ...tokens];
  }, [
    feed, goto, openToken, setMarketTab, setPaletteOpen, openWalletPicker, signOutPhantom,
    searchRef, refreshFeed, topMover, trending, selected, toggleWatch, watchlist,
    copyCa, openNotifs, unseenCount, phantom, loading, setShareToken,
  ]);

  const query = q.trim();
  const filtered = useMemo(
    () => filterCommands(commands, query, query ? 24 : 18),
    [commands, query],
  );

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
  const active = filtered[idx];
  let cursor = 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-zinc-900/45 p-3 pt-[10vh] backdrop-blur-[3px] sm:p-4 sm:pt-[12vh]"
      onClick={() => setPaletteOpen(false)}
      role="presentation"
    >
      <div
        className="term-palette flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKey}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-bold text-white"
            style={{ background: BLUE }}
          >
            ⌘
          </span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search sections, tokens, actions…"
            className="min-w-0 flex-1 bg-transparent text-[14px] font-medium tracking-tight outline-none placeholder:text-zinc-400"
            aria-label="Command search"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 sm:inline">esc</kbd>
        </div>

        {!query && (
          <div className="flex flex-wrap gap-1.5 border-b border-zinc-50 bg-zinc-50/60 px-4 py-2.5">
            {commands.filter((c) => c.pinned).slice(0, 5).map((cmd) => (
              <button
                key={cmd.id}
                type="button"
                onClick={() => cmd.run()}
                className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-zinc-600 transition hover:border-indigo-300 hover:text-indigo-700"
              >
                <span>{cmd.icon}</span>
                <span className="max-w-[8rem] truncate">{cmd.chipLabel ?? cmd.label}</span>
              </button>
            ))}
          </div>
        )}

        <div ref={listRef} className="max-h-[min(26rem,52vh)] overflow-y-auto scrollbar-thin py-1">
          {filtered.length === 0 && (
            <div className="px-4 py-10 text-center">
              <div className="text-2xl">⌕</div>
              <p className="mt-2 text-[13px] font-medium text-zinc-700">No matches for “{q}”</p>
              <p className="mt-1 text-[11px] text-zinc-400">Try a token symbol, section name, or “refresh”</p>
            </div>
          )}
          {groups.map((group) => {
            const items = filtered.filter((c) => c.group === group);
            return (
              <div key={group}>
                <div className="sticky top-0 z-[1] flex items-center justify-between bg-white/95 px-4 py-1.5 backdrop-blur-sm">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-zinc-400">{group}</span>
                  <span className="font-mono text-[9px] text-zinc-300">{items.length}</span>
                </div>
                {items.map((cmd) => {
                  const i = cursor++;
                  const isActive = i === idx;
                  const token = feed.find((c) => cmd.id === `tok-${c.ca}`);
                  return (
                    <button
                      key={cmd.id}
                      type="button"
                      onClick={() => cmd.run()}
                      onMouseEnter={() => setIdx(i)}
                      className={`relative flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${isActive ? "bg-indigo-50" : "hover:bg-zinc-50"}`}
                    >
                      {isActive && (
                        <span className="absolute inset-y-1 left-0 w-0.5 rounded-r-full" style={{ background: BLUE }} />
                      )}
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-[13px]">{cmd.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[13px] font-semibold text-zinc-900">{cmd.label}</span>
                          {cmd.badge && (
                            <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider text-emerald-600">
                              {cmd.badge}
                            </span>
                          )}
                        </span>
                        {cmd.hint && <span className="block truncate font-mono text-[10px] text-zinc-400">{cmd.hint}</span>}
                      </span>
                      {token && <Delta v={token.change24h} suffix="%" />}
                      {isActive && (
                        <kbd className="shrink-0 rounded border border-indigo-200 bg-white px-1.5 py-0.5 font-mono text-[9px] text-indigo-500">↵</kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-zinc-100 bg-zinc-50/90 px-4 py-2.5">
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[10px] text-zinc-400">
            <span>↑↓ navigate</span>
            <span>↵ run</span>
            <span>/ search</span>
          </div>
          <span className="hidden truncate font-mono text-[10px] text-zinc-400 sm:inline max-w-[45%]">
            {active ? active.hint ?? active.label : `section · ${section}`}
          </span>
        </div>
      </div>
    </div>
  );
}
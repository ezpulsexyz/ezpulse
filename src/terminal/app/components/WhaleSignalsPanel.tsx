import { useMemo } from "react";
import type { EcoEvent } from "../../kickstart";
import { BLUE, Card } from "../../components";
import { KindBadge, StrengthBadge } from "./SignalBadges";

export function WhaleSignalsPanel({
  events,
  loading,
  onOpen,
}: {
  events: EcoEvent[];
  loading?: boolean;
  onOpen: (e: EcoEvent) => void;
}) {
  const whales = useMemo(() => {
    return events
      .filter((e) => e.kind === "WHALE")
      .sort((a, b) => {
        const aDir = a.strength !== "NEUTRAL" ? 1 : 0;
        const bDir = b.strength !== "NEUTRAL" ? 1 : 0;
        if (bDir !== aDir) return bDir - aDir;
        return b.weight - a.weight;
      })
      .slice(0, 10);
  }, [events]);

  const directional = whales.filter((w) => w.strength !== "NEUTRAL").length;

  return (
    <Card
      className="mb-4"
      title="🐋 Whale signals"
      right={
        <span className="text-[10px] text-zinc-400">
          {loading ? "scanning…" : `${directional} directional · ${whales.length} total · live flow`}
        </span>
      }
    >
      {loading && (
        <div className="space-y-2 px-5 py-4">
          {[1, 2, 3].map((i) => <div key={i} className="term-shimmer h-10 rounded-lg" />)}
        </div>
      )}
      {!loading && whales.length === 0 && (
        <div className="px-5 py-6 text-center text-[12px] text-zinc-400">
          No whale-scale flow right now — signals fire on large clips, one-sided flow, or hourly volume bursts.
        </div>
      )}
      {!loading && whales.length > 0 && (
        <div className="divide-y divide-zinc-50">
          {whales.map((e, i) => (
            <button
              key={`${e.token.ca}-${i}`}
              onClick={() => onOpen(e)}
              className="flex w-full items-start gap-3 px-5 py-3.5 text-left transition hover:bg-indigo-50/50"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-[15px]">🐋</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-bold text-zinc-900">{e.title}</span>
                  <StrengthBadge strength={e.strength} />
                  <KindBadge kind="WHALE" />
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">{e.detail}</p>
                <div className="mt-1.5 flex items-center gap-2 text-[11px] text-zinc-400">
                  {e.token.icon && (
                    <img src={e.token.icon} alt="" className="h-4 w-4 rounded-full" onError={(ev) => { (ev.target as HTMLImageElement).style.display = "none"; }} />
                  )}
                  <span className="font-semibold text-zinc-600">{e.token.name}</span>
                  <span className="font-mono">${e.token.symbol}</span>
                  <span className="ml-auto font-semibold" style={{ color: BLUE }}>Open →</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
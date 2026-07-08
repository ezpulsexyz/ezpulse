import { useMemo } from "react";
import { formatRelativeTime } from "../../../lib/utils";
import type { EcoEvent } from "../../kickstart";
import { Card } from "../../components";
import { KindBadge, StrengthBadge } from "./SignalBadges";
import { TokenAvatar } from "./TokenAvatar";

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
      title="Whale signals"
      right={
        <span className="text-[10px]" style={{ color: "var(--term-text-subtle)" }}>
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
        <div className="px-5 py-6 text-center text-[12px]" style={{ color: "var(--term-text-muted)" }}>
          No whale-scale flow right now — signals fire on large clips, one-sided flow, or hourly volume bursts.
        </div>
      )}
      {!loading && whales.length > 0 && (
        <div className="divide-y" style={{ borderColor: "var(--term-border-subtle)" }}>
          {whales.map((e, i) => (
            <button
              key={`${e.token.ca}-${i}`}
              onClick={() => onOpen(e)}
              className="term-whale-row flex w-full items-start gap-3 px-5 py-3.5 text-left"
            >
              <span className="term-signal-row__icon term-signal-row__icon--whale mt-0.5 text-[15px]">🐋</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-bold" style={{ color: "var(--term-text)" }}>{e.title}</span>
                  <StrengthBadge strength={e.strength} />
                  <KindBadge kind="WHALE" />
                </div>
                <p className="mt-1 text-[12px] leading-relaxed" style={{ color: "var(--term-text-muted)" }}>{e.detail}</p>
                <div className="mt-1.5 flex items-center gap-2 text-[11px]" style={{ color: "var(--term-text-subtle)" }}>
                  <TokenAvatar
                    token={e.token}
                    className="h-4 w-4 rounded-full object-cover"
                    fallbackClassName="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-200 text-[8px] font-bold text-zinc-500"
                  />
                  <span className="font-semibold" style={{ color: "var(--term-text-secondary)" }}>{e.token.name}</span>
                  <span className="font-mono">${e.token.symbol}</span>
                  <span className="term-signal-time" title={new Date(e.occurredAt).toLocaleString()}>
                    {formatRelativeTime(e.occurredAt)}
                  </span>
                  <span className="ml-auto font-semibold" style={{ color: "var(--term-accent)" }}>Open →</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
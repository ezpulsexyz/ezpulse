import { BLUE, Card } from "../../../components";
import { KIND_ICON } from "../../../kickstart";
import { SOURCE_ICON } from "../../../founders";
import type { LiveLaunch } from "../../../kickstart";
import type { FounderProfile } from "../../types";
import { KindBadge } from "../SignalBadges";
import { EmptyState } from "../PageLayout";
import { TermNum, TermRowButton } from "../TermTable";

/** Recent signals + build-in-public feed. */
export function FounderActivity({
  founder,
  onOpenToken,
}: {
  founder: FounderProfile;
  onOpenToken: (c: LiveLaunch) => void;
}) {
  const { signals, launches, publicFeed } = founder;

  return (
    <div className="space-y-4">
      {signals && signals.length > 0 ? (
        <Card title="Founder signals" right={<span className="text-[11px] text-zinc-400">resolved · +24h</span>}>
          {signals.slice(0, 12).map((r, i) => (
            <TermRowButton
              key={i}
              onClick={() => { const c = launches.find((x) => x.ca === r.ca); if (c) onOpenToken(c); }}
              className="w-full flex-wrap gap-2.5"
            >
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] ${r.hit ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                {r.hit ? "✓" : "✗"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[12px]">{KIND_ICON[r.kind as keyof typeof KIND_ICON] ?? "•"}</span>
                  <span className="truncate font-mono text-[12px] font-semibold text-zinc-900">{r.title}</span>
                  <KindBadge kind={r.kind as import("../../../../../shared/signals-core").SignalKind} />
                </span>
                <span className="font-mono text-[10px] text-zinc-400">${r.symbol} · {new Date(r.ts).toLocaleDateString()}</span>
              </span>
              <TermNum className={r.change_24h >= 0 ? "text-emerald-600" : "text-red-500"} bold>
                {r.change_24h >= 0 ? "+" : ""}{r.change_24h.toFixed(1)}%
              </TermNum>
            </TermRowButton>
          ))}
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon="⚡"
            title="Signal record building"
            body="Founder-scoped signals appear as the snapshot pipeline archives directional calls on this founder's tokens."
            cta={<span className="text-[11px] text-zinc-400">Same engine as Track Record · wallet-filtered</span>}
          />
        </Card>
      )}

      <Card title="Build in public" right={<span className="text-[11px] text-zinc-400">X · GitHub · Kickstart</span>}>
        {publicFeed.length === 0 && (
          <div className="px-5 py-8 text-center text-[13px] text-zinc-400">No posts yet — founder activity syncs here.</div>
        )}
        {publicFeed.slice(0, 8).map((p) => (
          <div key={p.id} className="border-b border-zinc-50 px-5 py-4 last:border-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px]">{SOURCE_ICON[p.source]}</span>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-zinc-500">{p.source}</span>
              <span className="font-mono text-[10px] text-zinc-400">{new Date(p.ts).toLocaleString()}</span>
            </div>
            <div className="mt-1.5 text-[14px] font-semibold text-zinc-900">{p.title}</div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-500">{p.body}</p>
            {p.url && (
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[12px] font-semibold hover:opacity-80" style={{ color: BLUE }}>
                Read more ↗
              </a>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}
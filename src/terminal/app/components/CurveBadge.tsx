import { isGraduated, type LiveLaunch } from "../../kickstart";

export function CurveBadge({ c }: { c: LiveLaunch }) {
  if (isGraduated(c)) {
    return <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[8px] font-black tracking-widest text-emerald-600">🔗 BONDED</span>;
  }
  const pct = typeof c.bondingCurve === "number" ? Math.min(c.bondingCurve, 100) : null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[8px] font-black tracking-widest text-amber-600">
      ⏳ BONDING{pct !== null && <span className="tabular-nums">{pct.toFixed(0)}%</span>}
      {pct !== null && (
        <span className="ml-0.5 inline-block h-1 w-8 overflow-hidden rounded-full bg-amber-200/60">
          <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
        </span>
      )}
    </span>
  );
}

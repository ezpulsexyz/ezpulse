import { useMemo, useState } from "react";
import { fmtUsd } from "../../../data";
import { Card } from "../../../components";
import type { LaunchPerformance } from "../../../founders";
import type { LiveLaunch } from "../../../kickstart";
import { TermHead, TermHeadCell, TermNum, TermRowButton } from "../TermTable";

const LAUNCH_COLS = "sm:grid-cols-[minmax(0,1fr)_4rem_4.5rem_5.5rem_5.5rem_7rem]";
const LAUNCH_GRID = `sm:grid ${LAUNCH_COLS} items-center gap-x-3`;

type SortKey = "date" | "exit" | "mcap" | "age";

export function LaunchHistory({
  performances,
  launches,
  onTokenClick,
}: {
  performances: LaunchPerformance[];
  launches: LiveLaunch[];
  onTokenClick: (c: LiveLaunch) => void;
}) {
  const [sort, setSort] = useState<SortKey>("exit");

  const sorted = useMemo(() => {
    const rows = [...performances];
    rows.sort((a, b) => {
      if (sort === "exit") return b.exitMultiple - a.exitMultiple;
      if (sort === "mcap") return b.currentMcap - a.currentMcap;
      if (sort === "age") return b.ageDays - a.ageDays;
      const la = launches.find((c) => c.ca === a.ca)?.pairCreatedAt ?? 0;
      const lb = launches.find((c) => c.ca === b.ca)?.pairCreatedAt ?? 0;
      return lb - la;
    });
    return rows;
  }, [performances, launches, sort]);

  return (
    <Card
      title="Launch history"
      right={
        <span className="flex gap-1">
          {([["exit", "Exit ×"], ["date", "Date"], ["mcap", "MCap"], ["age", "Age"]] as [SortKey, string][]).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setSort(k)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition ${sort === k ? "bg-indigo-600 text-white" : "bg-zinc-100 text-zinc-500 hover:text-zinc-800"}`}
            >
              {label}
            </button>
          ))}
        </span>
      }
    >
      <TermHead cols={LAUNCH_COLS} breakpoint="sm">
        <TermHeadCell>Token</TermHeadCell>
        <TermHeadCell align="right">Age</TermHeadCell>
        <TermHeadCell align="right">Exit ×</TermHeadCell>
        <TermHeadCell align="right">Peak</TermHeadCell>
        <TermHeadCell align="right">MCap</TermHeadCell>
        <TermHeadCell align="right">Status</TermHeadCell>
      </TermHead>
      {sorted.map((p) => {
        const launch = launches.find((c) => c.ca === p.ca);
        return (
          <TermRowButton key={p.ca} grid={LAUNCH_GRID} onClick={() => launch && onTokenClick(launch)} className="w-full">
            <span className="truncate font-mono text-[12px] font-semibold text-zinc-900">{p.name} <span className="text-zinc-400">${p.symbol}</span></span>
            <TermNum className="text-zinc-500">{p.ageDays}d</TermNum>
            <TermNum className="text-indigo-600" bold>{p.exitMultiple}×</TermNum>
            <TermNum className="hidden text-zinc-500 sm:block">{p.peakMcap ? fmtUsd(p.peakMcap) : "—"}</TermNum>
            <TermNum>{p.currentMcap ? fmtUsd(p.currentMcap) : "—"}</TermNum>
            <span className="flex justify-end gap-1">
              {p.graduated && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">BONDED</span>}
              {p.verified && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-bold text-indigo-700">✓</span>}
              {p.survived7d && !p.graduated && <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] font-bold text-zinc-600">7d+</span>}
            </span>
          </TermRowButton>
        );
      })}
      {sorted.length === 0 && (
        <div className="px-5 py-8 text-center text-[13px] text-zinc-400">No launches indexed yet.</div>
      )}
    </Card>
  );
}
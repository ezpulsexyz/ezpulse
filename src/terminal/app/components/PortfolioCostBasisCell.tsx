import { useState } from "react";
import type { Holding } from "../../kickstart";

export function PortfolioCostBasisCell({
  holding,
  onSave,
}: {
  holding: Holding;
  onSave: (ca: string, avgPriceUsd: number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(holding.costBasisUsd?.toString() ?? "");

  if (editing) {
    return (
      <div className="flex items-center justify-end gap-1">
        <input
          type="number"
          step="any"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="avg $"
          className="w-20 rounded border border-zinc-200 px-1.5 py-1 font-mono text-[10px]"
          autoFocus
        />
        <button
          type="button"
          onClick={() => {
            const n = parseFloat(draft);
            onSave(holding.coin.ca, Number.isFinite(n) && n > 0 ? n : null);
            setEditing(false);
          }}
          className="rounded bg-zinc-900 px-1.5 py-1 font-mono text-[9px] font-bold text-white"
        >
          ✓
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(holding.costBasisUsd?.toString() ?? "");
            setEditing(false);
          }}
          className="font-mono text-[10px] text-zinc-400"
        >
          ×
        </button>
      </div>
    );
  }

  if (holding.unrealizedPnlUsd !== null && holding.costBasisUsd !== null) {
    const up = holding.unrealizedPnlUsd >= 0;
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="block w-full text-right font-mono text-[11px] tabular-nums"
        title="Click to edit avg entry price"
      >
        <span className={up ? "text-emerald-600" : "text-red-500"}>
          {up ? "+" : ""}${Math.abs(holding.unrealizedPnlUsd).toFixed(2)}
        </span>
        {holding.unrealizedPnlPct !== null && (
          <span className={`ml-1 text-[10px] ${up ? "text-emerald-500" : "text-red-400"}`}>
            ({up ? "+" : ""}{holding.unrealizedPnlPct.toFixed(1)}%)
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="font-mono text-[10px] text-indigo-600 hover:text-indigo-800"
      title="Set average buy price to track unrealized P&L"
    >
      + Set entry
    </button>
  );
}
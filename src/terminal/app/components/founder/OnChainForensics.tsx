import { fmtUsd } from "../../../data";
import { Card, Stat } from "../../../components";
import type { FounderProfile } from "../../types";
import { TermNum, TermRow } from "../TermTable";

export function OnChainForensics({ founder }: { founder: FounderProfile }) {
  const { forensics } = founder;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Rug risk" value={forensics.rugRisk} sub={forensics.rugFlags[0] ?? "No flags"} accent={forensics.rugRisk === "LOW"} />
        <Stat label="Team concentration" value={`${forensics.teamConcentrationPct}%`} sub="top holders · estimated" />
        <Stat label="Dev holdings" value={forensics.devHoldingsUsd !== null ? fmtUsd(forensics.devHoldingsUsd) : "—"} sub="founder wallet" />
        <Stat label="Activity" value={forensics.postLaunchActivity} sub="24h txn flow" />
      </div>

      <Card title="On-chain forensics" pad>
        <div className="space-y-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Founder wallet</div>
            <a href={`https://solscan.io/account/${forensics.founderWallet}`} target="_blank" rel="noopener noreferrer"
              className="mt-1 block break-all font-mono text-[12px] text-indigo-600 hover:text-indigo-800">
              {forensics.founderWallet} ↗
            </a>
          </div>
          {forensics.priorLaunchCount > 0 && (
            <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-4 py-3 text-[12px] text-amber-900">
              {forensics.priorLaunchCount} prior launch{forensics.priorLaunchCount !== 1 ? "es" : ""} on this wallet.
            </div>
          )}
          {forensics.rugFlags.length > 0 ? (
            <div className="rounded-xl border border-red-100 bg-red-50/50 px-4 py-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-red-500">Flags</div>
              <ul className="mt-1 space-y-1 text-[12px] text-red-800">
                {forensics.rugFlags.map((f) => <li key={f}>· {f}</li>)}
              </ul>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 text-[12px] text-emerald-800">
              No rug-pattern flags on current data.
            </div>
          )}
        </div>
      </Card>

      <Card title="Team wallets">
        {forensics.teamWallets.map((w) => (
          <TermRow key={w}>
            <a href={`https://solscan.io/account/${w}`} target="_blank" rel="noopener noreferrer"
              className="break-all font-mono text-[12px] text-indigo-600 hover:text-indigo-800">
              {w}
            </a>
            <TermNum className="text-zinc-400">{w === forensics.founderWallet ? "primary" : "team"}</TermNum>
          </TermRow>
        ))}
      </Card>
    </div>
  );
}
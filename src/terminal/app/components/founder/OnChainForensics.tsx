import { fmtUsd } from "../../../data";
import { Card, Stat } from "../../../components";
import type { FounderProfile } from "../../types";
import { TermNum, TermRow } from "../TermTable";

export function OnChainForensics({ founder }: { founder: FounderProfile }) {
  const { forensics, detailedForensics } = founder;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Wallet age" value={`${forensics.walletAge}d`} sub="oldest launch" />
        <Stat label="Rug flags" value={String(forensics.knownRugCount)} sub={detailedForensics.rugRisk} accent={detailedForensics.rugRisk === "LOW"} />
        <Stat label="24h volume" value={fmtUsd(forensics.totalVolumeMoved)} sub="all launches" />
        <Stat
          label="Dev holdings"
          value={detailedForensics.devHoldingsUsd !== null ? fmtUsd(detailedForensics.devHoldingsUsd) : "—"}
          sub="founder wallet"
        />
        <Stat label="Rug risk" value={detailedForensics.rugRisk} sub={detailedForensics.rugFlags[0] ?? "No flags"} />
        <Stat label="Activity" value={detailedForensics.postLaunchActivity} sub="24h txn flow" />
      </div>

      <Card title="On-chain forensics" pad>
        <div className="space-y-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Founder wallet</div>
            <a
              href={`https://solscan.io/account/${detailedForensics.founderWallet}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block break-all font-mono text-[12px] text-indigo-600 hover:text-indigo-800"
            >
              {detailedForensics.founderWallet} ↗
            </a>
          </div>
          {detailedForensics.priorLaunchCount > 0 && (
            <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-4 py-3 text-[12px] text-amber-900">
              {detailedForensics.priorLaunchCount} prior launch{detailedForensics.priorLaunchCount !== 1 ? "es" : ""} on this wallet.
            </div>
          )}
          {detailedForensics.rugFlags.length > 0 ? (
            <div className="rounded-xl border border-red-100 bg-red-50/50 px-4 py-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-red-500">Flags</div>
              <ul className="mt-1 space-y-1 text-[12px] text-red-800">
                {detailedForensics.rugFlags.map((f) => <li key={f}>· {f}</li>)}
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
        {detailedForensics.teamWallets.map((w) => (
          <TermRow key={w}>
            <a
              href={`https://solscan.io/account/${w}`}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all font-mono text-[12px] text-indigo-600 hover:text-indigo-800"
            >
              {w}
            </a>
            <TermNum className="text-zinc-400">{w === detailedForensics.founderWallet ? "primary" : "team"}</TermNum>
          </TermRow>
        ))}
      </Card>
    </div>
  );
}
import { fmtUsd } from "../../../data";
import { Card, Delta, Stat } from "../../../components";
import { fmtPrice, isGraduated, tokenNote, type LiveLaunch } from "../../../kickstart";

export function OverviewTab({
  token,
  feed,
  copyCa,
  copiedCa,
}: {
  token: LiveLaunch;
  feed: LiveLaunch[];
  copyCa: (ca: string) => void;
  copiedCa: string | null;
}) {
  const summary = tokenNote(token, feed);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Stat label="Market Cap" value={token.mcap ? fmtUsd(token.mcap) : "—"} />
          <Stat
            label="Price"
            value={token.priceUsd ? fmtPrice(token.priceUsd) : "—"}
            sub={<Delta v={token.change24h} suffix="%" />}
          />
          <Stat label="24h Volume" value={token.volume24h ? fmtUsd(token.volume24h) : "—"} />
          <Stat label="Liquidity" value={token.liquidity ? fmtUsd(token.liquidity) : "—"} />
        </div>

        <Card title="Token Info">
          <div className="space-y-4 px-5 py-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">Contract</span>
              <button
                type="button"
                onClick={() => copyCa(token.ca)}
                className="font-mono text-blue-600 hover:underline"
              >
                {copiedCa === token.ca
                  ? "✓ copied"
                  : `${token.ca.slice(0, 8)}...${token.ca.slice(-6)}`}
              </button>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Holders</span>
              <span>{token.holderCount ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Curve status</span>
              <span>{isGraduated(token) ? "Bonded" : "Bonding"}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Summary" className="lg:col-span-1">
        <p className="px-5 py-4 leading-relaxed text-zinc-600">
          {summary?.note || "No additional summary available yet."}
        </p>
      </Card>
    </div>
  );
}
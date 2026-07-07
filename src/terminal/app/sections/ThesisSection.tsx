import { useState } from "react";
import { Card } from "../../components";
import { PageHead } from "../components/PageLayout";
import { ThesisGenerator } from "../components/ThesisGenerator";
import { InvestorThesisPanel } from "../components/InvestorThesisPanel";
import WalletGate from "../../components/WalletGate";
import { formatTokenAmount } from "../../investorThesis";
import { useTerminalContext } from "../TerminalContext";

export function ThesisSection() {
  const { feed, openToken } = useTerminalContext();
  const [pickCa, setPickCa] = useState(feed[0]?.ca ?? "");
  const [hasHolding, setHasHolding] = useState(false);
  const [holdingBalance, setHoldingBalance] = useState(0);
  const token = feed.find((c) => c.ca === pickCa) ?? feed[0];

  return (
    <>
      <PageHead
        title="Investor Thesis"
        sub="AI research anyone can read · wallet-connected users can post community theses · verified holders get a ✓ Holding badge."
        right={
          <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-indigo-700">
            Tiered access
          </span>
        }
      />

      <div className="mb-4 grid gap-4 md:grid-cols-3">
        {[
          ["👀", "Open to everyone", "Anyone can view AI-generated and community theses — no wallet required."],
          ["✍️", "Post with any wallet", "Connect a wallet to post and comment. Even a $0.01 position qualifies you to participate."],
          ["✓", "Verified holder badge", "Holders earn a green ✓ Holding badge showing token amount — read-only, privacy-friendly."],
        ].map(([icon, t, b]) => (
          <div key={t as string} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="text-2xl">{icon}</div>
            <h3 className="mt-3 text-[15px] font-bold text-zinc-900">{t}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">{b}</p>
          </div>
        ))}
      </div>

      {feed.length > 0 && token && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="text-[12px] font-semibold text-zinc-600">Token</label>
          <select
            value={pickCa}
            onChange={(e) => setPickCa(e.target.value)}
            className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-[12px] font-semibold outline-none focus:border-indigo-300"
          >
            {feed.map((c) => (
              <option key={c.ca} value={c.ca}>
                {c.name} (${c.symbol})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => openToken(token)}
            className="rounded-full border border-zinc-200 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-zinc-600 transition hover:border-indigo-300 hover:text-indigo-700"
          >
            Open terminal →
          </button>
        </div>
      )}

      {token ? (
        <div className="space-y-4">
          <ThesisGenerator token={token} feed={feed} />
          <InvestorThesisPanel token={token} />
        </div>
      ) : (
        <Card pad>
          <p className="text-[13px] text-zinc-500">No live tokens to analyze yet.</p>
        </Card>
      )}

      {token && (
        <Card
          className="mt-4"
          title="🎫 Your access · live"
          right={<span className="text-[10px] text-zinc-400">on-chain balance check</span>}
        >
          <div className="space-y-4 px-5 py-4">
            <WalletGate
              tokenCa={token.ca}
              onHoldingVerified={(holds, balance) => {
                setHasHolding(holds);
                setHoldingBalance(balance);
              }}
            />
            {hasHolding && holdingBalance > 0 && (
              <p className="text-[13px] text-emerald-700">
                <span className="font-bold">✓ Verified Holder</span> · {formatTokenAmount(holdingBalance)}{" "}
                ${token.symbol} on {token.name}
              </p>
            )}
            {!hasHolding && (
              <p className="text-[13px] text-zinc-500">
                Connect Phantom to post. Hold any amount of ${token.symbol} to earn the verified holder badge.
              </p>
            )}
          </div>
        </Card>
      )}
    </>
  );
}
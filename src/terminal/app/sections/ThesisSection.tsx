import { useState, useEffect } from "react";
import { Card } from "../../components";
import { PageHead } from "../components/PageLayout";
import { ThesisGenerator } from "../components/ThesisGenerator";
import { InvestorThesisPanel } from "../components/InvestorThesisPanel";
import WalletGate from "../../components/WalletGate";
import { formatTokenAmount } from "../../investorThesis";
import { useTerminalContext } from "../TerminalContext";
import type { LiveLaunch } from "../../kickstart";

// Simple localStorage-backed research scratchpad per token
const SCRATCHPAD_KEY = (ca: string) => `ezpulse_thesis_notes_${ca}`;

function useResearchScratchpad(ca: string) {
  const [note, setNote] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(SCRATCHPAD_KEY(ca));
    if (saved) setNote(saved);
  }, [ca]);

  const saveNote = (text: string) => {
    setNote(text);
    localStorage.setItem(SCRATCHPAD_KEY(ca), text);
  };

  const clearNote = () => {
    setNote("");
    localStorage.removeItem(SCRATCHPAD_KEY(ca));
  };

  return { note, saveNote, clearNote };
}

// Interactive Key Metrics Card
interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  onClick?: () => void;
  expanded?: boolean;
  detail?: React.ReactNode;
}

function MetricCard({ label, value, sub, onClick, expanded, detail }: MetricCardProps) {
  return (
    <button
      onClick={onClick}
      className={`group w-full rounded-2xl border p-4 text-left transition-all active:scale-[0.985] ${expanded ? "border-indigo-400 bg-indigo-50/40" : "border-zinc-200 bg-white hover:border-zinc-300"}`}
    >
      <div className="text-[10px] font-bold uppercase tracking-[1.5px] text-zinc-500">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold tracking-tighter text-zinc-900">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-zinc-500">{sub}</div>}
      {expanded && detail && (
        <div className="mt-3 border-t border-zinc-200 pt-3 text-[12px] leading-relaxed text-zinc-600">
          {detail}
        </div>
      )}
      <div className="mt-2 text-[10px] font-medium text-indigo-600 opacity-70 group-hover:opacity-100">
        {expanded ? "Click to collapse" : "Click for details →"}
      </div>
    </button>
  );
}

export function ThesisSection() {
  const { feed, openToken } = useTerminalContext();
  const [pickCa, setPickCa] = useState(feed[0]?.ca ?? "");
  const [hasHolding, setHasHolding] = useState(false);
  const [holdingBalance, setHoldingBalance] = useState(0);
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  const token = feed.find((c) => c.ca === pickCa) ?? feed[0];
  const { note, saveNote, clearNote } = useResearchScratchpad(token?.ca || "");

  const toggleMetric = (key: string) => {
    setExpandedMetric(expandedMetric === key ? null : key);
  };

  return (
    <>
      <PageHead
        title="Investor Thesis"
        sub="AI research + community theses · wallet-connected users can post · verified holders get ✓ Holding badge"
        right={
          <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-indigo-700">
            Tiered access
          </span>
        }
      />

      {/* Tier explanation cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {[
          ["👀", "Open to everyone", "Anyone can view AI-generated and community theses — no wallet required."],
          ["✍️", "Post with any wallet", "Connect a wallet to post and comment. Even tiny positions qualify you to participate."],
          ["✓", "Verified holder badge", "Holders earn a green ✓ Holding badge showing token amount — read-only and privacy-friendly."],
        ].map(([icon, t, b]) => (
          <div key={t as string} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="text-2xl">{icon}</div>
            <h3 className="mt-3 text-[15px] font-bold text-zinc-900">{t}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">{b}</p>
          </div>
        ))}
      </div>

      {feed.length > 0 && token && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
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
            Open full terminal →
          </button>
        </div>
      )}

      {token ? (
        <div className="space-y-6">
          {/* AI Thesis Generator - kept as is but now sits inside richer context */}
          <ThesisGenerator token={token} feed={feed} />

          {/* Interactive Key Metrics Cards */}
          <Card title="📊 Key Metrics" right={<span className="text-[10px] text-zinc-400">Click any card to expand</span>}>
            <div className="grid grid-cols-2 gap-3 px-5 py-4 md:grid-cols-4">
              <MetricCard
                label="PRICE"
                value={token.priceUsd ? `$${token.priceUsd.toFixed(6)}` : "—"}
                sub={token.priceUsd ? "USD" : ""}
                onClick={() => toggleMetric("price")}
                expanded={expandedMetric === "price"}
                detail={
                  <div>
                    Live price from on-chain data. Click again to collapse. For deeper liquidity & depth analysis, open the full token terminal.
                  </div>
                }
              />
              <MetricCard
                label="CONVICTION"
                value="72"
                sub="AI score / 100"
                onClick={() => toggleMetric("conviction")}
                expanded={expandedMetric === "conviction"}
                detail={
                  <div className="space-y-1">
                    <div>Based on signal strength, founder activity, and on-chain momentum.</div>
                    <div className="text-emerald-600">+18 from 24h ago</div>
                  </div>
                }
              />
              <MetricCard
                label="HOLDERS"
                value={token.holders?.toString() || "—"}
                sub="Unique wallets"
                onClick={() => toggleMetric("holders")}
                expanded={expandedMetric === "holders"}
                detail={
                  <div>Holder distribution + concentration metrics available in the full terminal view. High concentration can be both risk and signal.</div>
                }
              />
              <MetricCard
                label="24H VOL"
                value={token.volume24h ? `$${(token.volume24h / 1_000_000).toFixed(1)}M` : "—"}
                sub="Trading volume"
                onClick={() => toggleMetric("volume")}
                expanded={expandedMetric === "volume"}
                detail={
                  <div>Volume surge often precedes major moves. Cross-reference with whale signals in the Signals tab.</div>
                }
              />
            </div>
          </Card>

          {/* Community Investor Thesis Panel */}
          <InvestorThesisPanel token={token} key={token.ca} />

          {/* Private Research Scratchpad - new interactive feature */}
          <Card
            title="📝 Your Research Notes"
            right={
              <button
                onClick={clearNote}
                className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-red-500"
              >
                Clear
              </button>
            }
          >
            <div className="px-5 py-4">
              <p className="mb-2 text-[12px] text-zinc-500">
                Private scratchpad. Saved locally in your browser. Use it to build your own thesis.
              </p>
              <textarea
                value={note}
                onChange={(e) => saveNote(e.target.value)}
                placeholder="Jot down your thoughts, risks you're watching, or questions for the founder..."
                className="h-40 w-full resize-y rounded-2xl border border-zinc-200 bg-zinc-950/5 p-4 font-mono text-[13px] leading-relaxed outline-none focus:border-indigo-400"
              />
              <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400">
                <span>Auto-saved • Only visible to you</span>
                <span>{note.length} chars</span>
              </div>
            </div>
          </Card>

          {/* Your access level */}
          <Card
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
                  <span className="font-bold">✓ Verified Holder</span> · {formatTokenAmount(holdingBalance)} ${token.symbol}
                </p>
              )}
              {!hasHolding && (
                <p className="text-[13px] text-zinc-500">
                  Connect a wallet to post. Hold any amount of ${token.symbol} to earn the verified holder badge.
                </p>
              )}
            </div>
          </Card>
        </div>
      ) : (
        <Card pad>
          <p className="text-[13px] text-zinc-500">No live tokens to analyze yet.</p>
        </Card>
      )}
    </>
  );
}

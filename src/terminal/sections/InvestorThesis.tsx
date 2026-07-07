import { useState } from "react";
import WalletGate from "../components/WalletGate";
import ThesisEditorModal from "../components/ThesisEditorModal";
import ThesesList from "../components/ThesesList";
import { useWallet } from "../hooks/useWallet";
import { persistInvestorThesis } from "../investorThesis";
import type { LiveLaunch } from "../kickstart";

interface InvestorThesisProps {
  token: LiveLaunch;
  feed: LiveLaunch[];
}

export default function InvestorThesis({ token, feed: _feed }: InvestorThesisProps) {
  const { wallet } = useWallet();
  const [showModal, setShowModal] = useState(false);
  const [isVerifiedHolder, setIsVerifiedHolder] = useState(false);
  const [holdingBalance, setHoldingBalance] = useState(0);
  const [thesesRefresh, setThesesRefresh] = useState(0);

  const handlePostThesis = () => {
    if (isVerifiedHolder) {
      setShowModal(true);
    }
  };

  const handleThesisSubmit = async (thesis: {
    verdict: "Bullish" | "Bearish" | "Neutral";
    content: string;
    keyPoints: string[];
  }) => {
    if (!wallet) return;

    const holdingVerified =
      isVerifiedHolder &&
      holdingBalance > 0 &&
      (token.priceUsd <= 0 || holdingBalance * token.priceUsd >= 0.01);

    const result = await persistInvestorThesis({
      tokenCa: token.ca,
      wallet,
      thesis,
      holdingBalance,
      holdingVerified,
    });

    alert(result.message);
    if (result.ok) {
      setShowModal(false);
      setThesesRefresh((k) => k + 1);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Investor Thesis</h2>
        <p className="text-zinc-500 mt-2">
          Share and read structured analysis from the community.
        </p>
      </div>

      <div className="bg-white border border-zinc-200 rounded-3xl p-6">
        <WalletGate
          tokenCa={token.ca}
          showPostButton={true}
          onPostThesis={handlePostThesis}
          onHoldingVerified={(hasHolding, balance) => {
            setIsVerifiedHolder(hasHolding);
            setHoldingBalance(balance);
            if (!hasHolding) setShowModal(false);
          }}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">Community Theses</h3>
        </div>
        <ThesesList tokenCa={token.ca} refreshKey={thesesRefresh} />
      </div>

      <ThesisEditorModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        tokenSymbol={token.symbol}
        isVerifiedHolder={isVerifiedHolder}
        onSubmit={handleThesisSubmit}
      />
    </div>
  );
}
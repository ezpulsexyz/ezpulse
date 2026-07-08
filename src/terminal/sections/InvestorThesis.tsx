import { useEffect, useState } from "react";
import Toast, { type ToastState } from "../components/Toast";
import SuccessToast from "../components/SuccessToast";
import WalletGate from "../components/WalletGate";
import ThesisEditorModal from "../components/ThesisEditorModal";
import ThesesList from "../components/ThesesList";
import { useWallet } from "../hooks/useWallet";
import { persistInvestorThesis, refreshThesesList } from "../investorThesis";
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<ToastState>(null);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorToast) {
      const timer = setTimeout(() => setErrorToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [errorToast]);

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

    setErrorToast(null);
    setSuccessMessage(null);

    const result = await persistInvestorThesis({
      tokenCa: token.ca,
      wallet,
      thesis,
      holdingBalance,
      holdingVerified,
    });

    if (result.ok) {
      setShowModal(false);
      setSuccessMessage(result.message || "Thesis posted successfully!");
      setThesesRefresh((k) => k + 1);
      refreshThesesList();
    } else {
      setErrorToast({ type: "error", message: result.message });
    }
  };

  return (
    <>
      <div className="w-full min-w-0 space-y-6 sm:space-y-8">
        <div className="min-w-0">
          <h2 className="term-page-title text-base sm:text-[0.9375rem]">Investor Thesis</h2>
          <p className="term-page-sub mt-1">
            Share and read structured analysis from the community.
          </p>
        </div>

        <div className="term-surface-panel p-4 sm:p-6">
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

        <div className="min-w-0">
          <h3 className="term-page-title">Community Theses</h3>
          <ThesesList
            tokenCa={token.ca}
            currentWallet={wallet}
            refreshKey={thesesRefresh}
          />
        </div>

        <ThesisEditorModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          tokenSymbol={token.symbol}
          isVerifiedHolder={isVerifiedHolder}
          onSubmit={handleThesisSubmit}
        />
      </div>

      {successMessage && (
        <SuccessToast message={successMessage} onClose={() => setSuccessMessage(null)} />
      )}
      {errorToast && (
        <Toast
          type={errorToast.type}
          message={errorToast.message}
          onClose={() => setErrorToast(null)}
        />
      )}
    </>
  );
}
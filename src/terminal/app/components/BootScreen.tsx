import { useEffect, useState } from "react";
import { BLUE } from "../../components";
import { Logo } from "../../brand";
import { BOOT_STEPS } from "../constants";

export function BootScreen({ slow, onSkip }: { slow: boolean; onSkip: () => void }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, BOOT_STEPS.length - 1)), 900);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="boot-fade flex min-h-screen flex-col items-center justify-center bg-[#fbfbfd] px-6 font-sans" style={{ colorScheme: "light" }}>
      {/* logo + animated pulse line */}
      <div className="flex flex-col items-center">
        <Logo size={44} textClass="text-[22px]" />
        <svg viewBox="0 0 300 40" className="mt-6 w-64" fill="none">
          <path d="M0 20 h70 l10 -12 l14 24 l12 -18 l8 6 h60 l10 -12 l14 24 l12 -18 l8 6 H300"
            stroke="#e4e4e7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M0 20 h70 l10 -12 l14 24 l12 -18 l8 6 h60 l10 -12 l14 24 l12 -18 l8 6 H300"
            stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="pulse-sweep" />
        </svg>
        {/* staged status */}
        <div className="mt-6 flex h-5 items-center gap-2 text-[13px] text-zinc-500">
          <span className="term-blink h-1.5 w-1.5 rounded-full" style={{ background: BLUE }} />
          <span key={step} className="animate-fade-up">{BOOT_STEPS[step]}</span>
        </div>

      </div>
      {/* slow-connection escape hatch */}
      <div className={`mt-10 text-center transition-opacity duration-500 ${slow ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <p className="text-[12px] text-zinc-400">Feeds are taking longer than usual.</p>
        <button onClick={onSkip} className="mt-2 rounded-full border border-zinc-200 bg-white px-5 py-2 text-[11px] font-bold uppercase tracking-wide text-zinc-600 transition hover:border-indigo-300 hover:text-indigo-700">
          Enter anyway →
        </button>
      </div>
      <p className="absolute bottom-6 text-[10px] text-zinc-300">100% live on-chain data · nothing simulated</p>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Logo } from "../../brand";
import { BOOT_STEPS } from "../constants";

export function BootScreen({ slow, onSkip }: { slow: boolean; onSkip: () => void }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, BOOT_STEPS.length - 1)), 900);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="boot-fade flex min-h-screen w-full flex-col items-center justify-center px-6 font-sans">
      <div className="flex flex-col items-center">
        <Logo size={28} textClass="text-[13px]" />
        <div className="mt-5 flex h-4 items-center gap-2 font-mono text-[11px]" style={{ color: "var(--term-text-muted)" }}>
          <span className="term-blink h-1 w-1 rounded-full" style={{ background: "var(--term-accent)" }} />
          <span key={step}>{BOOT_STEPS[step]}</span>
        </div>
      </div>
      <div className={`mt-8 text-center transition-opacity duration-500 ${slow ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <p className="font-mono text-[10px]" style={{ color: "var(--term-text-subtle)" }}>Feeds are taking longer than usual.</p>
        <button onClick={onSkip} className="term-chip-btn mt-2 px-4 py-1.5 font-mono text-[10px]">
          Enter anyway
        </button>
      </div>
      <p className="absolute bottom-6 font-mono text-[9px]" style={{ color: "var(--term-text-subtle)" }}>on-chain data only</p>
    </div>
  );
}
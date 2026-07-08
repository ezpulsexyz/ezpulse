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
    <div className="term-app boot-fade flex min-h-screen flex-col items-center justify-center px-6 font-sans" style={{ colorScheme: "light" }}>
      <div className="flex flex-col items-center">
        <Logo size={28} textClass="text-[13px]" />
        <div className="mt-5 flex h-4 items-center gap-2 font-mono text-[11px] text-zinc-500">
          <span className="term-blink h-1 w-1 rounded-full bg-zinc-400" />
          <span key={step}>{BOOT_STEPS[step]}</span>
        </div>
      </div>
      <div className={`mt-8 text-center transition-opacity duration-500 ${slow ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <p className="font-mono text-[10px] text-zinc-400">Feeds are taking longer than usual.</p>
        <button onClick={onSkip} className="mt-2 rounded border border-zinc-200 bg-white px-4 py-1.5 font-mono text-[10px] text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-800">
          Enter anyway
        </button>
      </div>
      <p className="absolute bottom-6 font-mono text-[9px] text-zinc-400">on-chain data only</p>
    </div>
  );
}

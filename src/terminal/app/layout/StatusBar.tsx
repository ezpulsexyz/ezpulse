import { useEffect, useState } from "react";
import { useTerminalContext } from "../TerminalContext";
import { useWallet } from "../../hooks/useWallet";
import { shortWallet } from "../../investorThesis";

export function StatusBar() {
  const { currentSection } = useTerminalContext();
  const { wallet, isConnected } = useWallet();
  const [time, setTime] = useState(new Date());

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 30000); // update every 30s
    return () => clearInterval(interval);
  }, []);

  const formattedTime = time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <div className="term-status-bar fixed bottom-0 left-0 right-0 z-[60] flex h-8 items-center border-t border-zinc-200 bg-white/95 px-4 text-[11px] font-mono text-zinc-500 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
      <div className="flex w-full items-center justify-between text-xs">
        {/* Left: Current section */}
        <div className="flex items-center gap-2 font-medium text-zinc-600 dark:text-zinc-400">
          <span className="font-mono text-[10px] uppercase tracking-[1px] text-zinc-400">SEC</span>
          <span className="font-semibold text-zinc-700 dark:text-zinc-200">
            {currentSection || "Terminal"}
          </span>
        </div>

        {/* Center: Command hint */}
        <div className="hidden items-center gap-1.5 text-zinc-400 md:flex">
          <span>Press</span>
          <kbd className="rounded bg-zinc-100 px-1.5 py-px font-mono text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">/</kbd>
          <span>or</span>
          <kbd className="rounded bg-zinc-100 px-1.5 py-px font-mono text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">⌘K</kbd>
          <span>for commands</span>
        </div>

        {/* Right: Wallet + Time */}
        <div className="flex items-center gap-4 text-right">
          <div className="flex items-center gap-1.5">
            {isConnected && wallet ? (
              <>
                <span className="text-emerald-600 dark:text-emerald-500">●</span>
                <span className="font-mono text-zinc-600 dark:text-zinc-400">{shortWallet(wallet)}</span>
              </>
            ) : (
              <span className="text-amber-600 dark:text-amber-500">Connect Wallet</span>
            )}
          </div>

          <div className="font-mono text-zinc-400 dark:text-zinc-500">
            {formattedTime}
          </div>
        </div>
      </div>
    </div>
  );
}

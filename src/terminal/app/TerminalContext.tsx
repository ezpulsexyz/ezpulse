import { createContext, useContext, type ReactNode } from "react";
import { useTerminal, type TerminalState } from "./hooks/useTerminal";
import type { TerminalTarget } from "./types";

const Ctx = createContext<TerminalState | null>(null);

export function TerminalProvider({ target, children }: { target?: TerminalTarget; children: ReactNode }) {
  const state = useTerminal(target);
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useTerminalContext(): TerminalState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTerminalContext must be used within TerminalProvider");
  return ctx;
}

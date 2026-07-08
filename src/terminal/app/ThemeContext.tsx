import { createContext, useContext, type ReactNode } from "react";
import { useTheme, type ResolvedTheme, type ThemePreference } from "./hooks/useTheme";

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setTheme: (next: ThemePreference) => void;
  toggle: () => void;
};

const Ctx = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <Ctx.Provider value={theme}>{children}</Ctx.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useThemeContext must be used within ThemeProvider");
  return ctx;
}
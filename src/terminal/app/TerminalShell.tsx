import { BootScreen } from "./components/BootScreen";
import { CommandPalette } from "./components/CommandPalette";
import { Header } from "./layout/Header";
import { Sidebar } from "./layout/Sidebar";
import { Toasts } from "./layout/Toasts";
import { SectionRouter } from "./sections/SectionRouter";
import { ThemeProvider, useThemeContext } from "./ThemeContext";
import { TerminalProvider, useTerminalContext } from "./TerminalContext";
import type { TerminalTarget } from "./types";

function TerminalBody() {
  const { booted, bootSlow, setBooted } = useTerminalContext();
  const { resolved } = useThemeContext();

  if (!booted) {
    return (
      <div className="term-app flex min-h-screen" data-theme={resolved} style={{ colorScheme: resolved }}>
        <BootScreen slow={bootSlow} onSkip={() => setBooted(true)} />
      </div>
    );
  }

  return (
    <div
      className="term-app boot-fade flex min-h-screen overflow-x-hidden font-sans antialiased"
      data-theme={resolved}
      style={{ colorScheme: resolved }}
    >
      <Sidebar />
      <div className="min-w-0 flex-1 lg:ml-[var(--term-sidebar)]">
        <Header />
        <CommandPalette />
        <Toasts />
        <SectionRouter />
      </div>
    </div>
  );
}

export function TerminalShell({ target }: { target?: TerminalTarget }) {
  return (
    <ThemeProvider>
      <TerminalProvider target={target}>
        <TerminalBody />
      </TerminalProvider>
    </ThemeProvider>
  );
}
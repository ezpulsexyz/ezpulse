import { BootScreen } from "./components/BootScreen";
import { CommandPalette } from "./components/CommandPalette";
import { Header } from "./layout/Header";
import { Sidebar } from "./layout/Sidebar";
import { Toasts } from "./layout/Toasts";
import { SectionRouter } from "./sections/SectionRouter";
import { TerminalProvider, useTerminalContext } from "./TerminalContext";
import type { TerminalTarget } from "./types";

function TerminalBody() {
  const { booted, bootSlow, setBooted } = useTerminalContext();

  if (!booted) {
    return <BootScreen slow={bootSlow} onSkip={() => setBooted(true)} />;
  }

  return (
    <div className="term-app boot-fade flex min-h-screen overflow-x-hidden font-sans text-zinc-900 antialiased" style={{ colorScheme: "light" }}>
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
    <TerminalProvider target={target}>
      <TerminalBody />
    </TerminalProvider>
  );
}
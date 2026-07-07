import { BootScreen } from "./components/BootScreen";
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
    <div className="boot-fade flex min-h-screen overflow-x-hidden bg-[#fbfbfd] font-sans text-zinc-900" style={{ colorScheme: "light" }}>
      <Sidebar />
      <div className="min-w-0 flex-1 lg:ml-60">
        <Header />
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
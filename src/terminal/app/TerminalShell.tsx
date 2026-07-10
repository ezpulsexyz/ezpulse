import { BootScreen } from "./components/BootScreen";
import { CommandPalette } from "./components/CommandPalette";
import { Header } from "./layout/Header";
import { Sidebar } from "./layout/Sidebar";
import { Toasts } from "./layout/Toasts";
import { WalletConnectModal } from "./components/WalletConnectModal";
import { SectionRouter } from "./sections/SectionRouter";
import { ThemeProvider, useThemeContext } from "./ThemeContext";
import { TerminalProvider, useTerminalContext } from "./TerminalContext";
import type { TerminalTarget } from "./types";

function TerminalBody() {
  const {
    booted,
    bootSlow,
    setBooted,
    sidebarHidden,
    walletPickerOpen,
    setWalletPickerOpen,
    walletConnecting,
    walletConnectingId,
    signInWallet,
  } = useTerminalContext();
  const { resolved } = useThemeContext();

  if (!booted) {
    return (
      <div className="term-app min-h-screen" data-theme={resolved} style={{ colorScheme: resolved }}>
        <BootScreen slow={bootSlow} onSkip={() => setBooted(true)} />
      </div>
    );
  }

  return (
    <div
      className="term-app boot-fade min-h-screen font-sans antialiased"
      data-theme={resolved}
      style={{ colorScheme: resolved }}
    >
      <Sidebar />
      <div
        className={`term-main min-w-0 ${sidebarHidden ? "term-main--with-sidebar-collapsed" : "term-main--with-sidebar"}`}
      >
        <Header />
        <CommandPalette />
        <Toasts />
        <WalletConnectModal
          open={walletPickerOpen}
          connecting={walletConnecting}
          connectingId={walletConnectingId}
          onClose={() => setWalletPickerOpen(false)}
          onSelect={(id) => void signInWallet(id)}
        />
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

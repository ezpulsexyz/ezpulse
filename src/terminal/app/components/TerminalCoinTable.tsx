import type { ReactNode } from "react";
import type { LiveLaunch } from "../../kickstart";
import { useTerminalContext } from "../TerminalContext";
import { CoinTable } from "./CoinTable";

export function TerminalCoinTable({ coins, title, right }: { coins: LiveLaunch[]; title: string; right?: ReactNode }) {
  const ctx = useTerminalContext();
  return (
    <CoinTable
      coins={coins}
      title={title}
      right={right}
      loading={ctx.loading}
      copiedCa={ctx.copiedCa}
      copyCa={ctx.copyCa}
      watchlist={ctx.watchlist}
      onOpen={ctx.openToken}
      onWatch={ctx.toggleWatch}
      onShare={ctx.setShareToken}
    />
  );
}
import { Card } from "../../components";
import type { LiveLaunch } from "../../kickstart";
import { CoinRow, ColumnHead } from "./CoinRow";
import { LoadingRows } from "./PageLayout";

export function CoinTable({ coins: filteredTokens, title, right, loading, copiedCa, copyCa, watchlist, onOpen, onWatch, onShare }: {
  coins: LiveLaunch[];
  title: string;
  right?: React.ReactNode;
  loading: boolean;
  copiedCa: string | null;
  copyCa: (ca: string) => void;
  watchlist: string[];
  onOpen: (c: LiveLaunch) => void;
  onWatch: (ca: string) => void;
  onShare: (c: LiveLaunch) => void;
}) {
  return (
    <Card title={title} right={right}>
      {loading && <LoadingRows />}
      {!loading && filteredTokens.length === 0 && (
        <div className="px-5 py-10 text-center text-[13px] text-zinc-400">Nothing here yet — new launches index automatically.</div>
      )}
      {!loading && filteredTokens.length > 0 && (
        <>
          <ColumnHead />
          {filteredTokens.map((token, index) => (
            <CoinRow
              key={token.ca}
              c={token}
              i={index}
              onOpen={onOpen}
              copiedCa={copiedCa}
              copyCa={copyCa}
              watched={watchlist.includes(token.ca)}
              onWatch={onWatch}
              onShare={onShare}
            />
          ))}
        </>
      )}
    </Card>
  );
}

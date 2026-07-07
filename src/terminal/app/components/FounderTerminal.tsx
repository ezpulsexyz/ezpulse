import { Card } from "../../components";
import { useFounderData } from "../hooks/useFounderData";
import type { LiveLaunch } from "../../kickstart";
import { LoadingRows } from "./PageLayout";
import { FounderHeader } from "./founder/FounderHeader";
import { FounderStats } from "./founder/FounderStats";
import { LaunchHistory } from "./founder/LaunchHistory";
import { OnChainForensics } from "./founder/OnChainForensics";
import { FounderSignals } from "./founder/FounderSignals";

export function FounderTerminal({
  founderId,
  token,
  feed,
  onOpenToken,
}: {
  /** Wallet address or @xHandle — for /founder/[id] style routing */
  founderId?: string;
  /** Entry token when opened from a project page */
  token?: LiveLaunch;
  feed: LiveLaunch[];
  onOpenToken: (c: LiveLaunch) => void;
}) {
  const founder = useFounderData(feed, { founderId, token });

  if (!founder) return null;

  return (
    <div className="animate-fade-up space-y-6">
      <FounderHeader founder={founder} />

      {founder.loading ? (
        <Card><LoadingRows /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-5">
            <FounderStats founder={founder} />
            <OnChainForensics founder={founder} />
          </div>
          <div className="space-y-6 lg:col-span-7">
            <LaunchHistory
              performances={founder.performances}
              launches={founder.launches}
              onTokenClick={onOpenToken}
            />
            <FounderSignals founder={founder} onTokenClick={onOpenToken} />
          </div>
        </div>
      )}
    </div>
  );
}
import { Card } from "../../components";
import type { LiveLaunch } from "../../kickstart";
import { useFounderData } from "../hooks/useFounderData";
import { LoadingRows } from "../components/PageLayout";
import { FounderHeader } from "../components/founder/FounderHeader";
import { FounderStats } from "../components/founder/FounderStats";
import { LaunchHistory } from "../components/founder/LaunchHistory";
import { OnChainForensics } from "../components/founder/OnChainForensics";
import { FounderActivity } from "../components/founder/FounderActivity";

export default function FounderTerminal({
  founderId,
  token,
  feed,
  onOpenToken,
}: {
  /** Wallet address or @xHandle */
  founderId?: string;
  /** Entry token when opened from a project page */
  token?: LiveLaunch;
  feed: LiveLaunch[];
  onOpenToken: (c: LiveLaunch) => void;
}) {
  const founder = useFounderData(feed, { founderId, token });

  if (!founder) return null;

  if (founder.loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 px-4">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-6 py-12 text-center text-sm text-zinc-500">
          Loading founder profile…
        </div>
        <Card><LoadingRows /></Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl animate-fade-up space-y-8 px-4">
      <FounderHeader founder={founder} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-4">
          <FounderStats founder={founder} />
          <OnChainForensics founder={founder} />
        </div>

        <div className="space-y-6 lg:col-span-8">
          <LaunchHistory
            launches={founder.launches}
            performances={founder.performances}
            onOpenToken={onOpenToken}
          />
          <FounderActivity founder={founder} onOpenToken={onOpenToken} />
        </div>
      </div>
    </div>
  );
}
import { useEffect } from "react";
import { enrichTokenSupply, type LiveLaunch } from "../../kickstart";

/** Backfill circulating / max supply when opening a token terminal. */
export function useTokenSupply(
  token: LiveLaunch | null,
  onUpdate: (next: LiveLaunch) => void,
) {
  useEffect(() => {
    if (!token) return;
    if (token.circulatingSupply !== undefined && (token.maxSupply !== undefined || token.totalSupply !== undefined)) return;

    let alive = true;
    enrichTokenSupply(token).then((enriched) => {
      if (!alive) return;
      if (
        enriched.circulatingSupply !== token.circulatingSupply
        || enriched.maxSupply !== token.maxSupply
        || enriched.totalSupply !== token.totalSupply
      ) {
        onUpdate(enriched);
      }
    });
    return () => { alive = false; };
  }, [token?.ca]);
}
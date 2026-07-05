/**
 * ezpulse backend — Supabase (Postgres), with graceful local-only fallback.
 * Deployed frontend: GitHub Pages (static). Backend: Supabase project.
 *
 * Configure via Vite env vars at build time (GitHub Actions secrets):
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 * Unset → the app runs local-only (localStorage), identical UX.
 * Schema: supabase/ezpulse-schema.sql
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = (import.meta.env?.VITE_SUPABASE_URL as string) || "";
const KEY = (import.meta.env?.VITE_SUPABASE_ANON_KEY as string) || "";

export const supabase: SupabaseClient | null = URL && KEY ? createClient(URL, KEY) : null;
export const backendReady = !!supabase;

/** Anonymous device id — lets watchlists sync without accounts. */
function deviceId(): string {
  const k = "ezpulse:device";
  try {
    let id = localStorage.getItem(k);
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(k, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

/** Fire-and-forget watchlist sync (local storage remains source of truth).
 *  When a Phantom wallet is signed in, the wallet address keys the row —
 *  so the watchlist follows the user across devices. */
export function syncWatchlist(cas: string[], walletAddr?: string | null): void {
  if (!supabase) return;
  const key = walletAddr ? `wallet:${walletAddr}` : deviceId();
  supabase.from("watchlists")
    .upsert({ device_id: key, cas, updated_at: new Date().toISOString() }, { onConflict: "device_id" })
    .then(() => { /* synced */ }, () => { /* offline — local copy stands */ });
}

/** Pull a wallet-keyed watchlist after Phantom sign-in (cross-device restore). */
export async function pullWalletWatchlist(walletAddr: string): Promise<string[] | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.from("watchlists").select("cas").eq("device_id", `wallet:${walletAddr}`).maybeSingle();
    return Array.isArray(data?.cas) ? (data!.cas as string[]) : null;
  } catch {
    return null;
  }
}

/** Pull a previously synced watchlist (e.g. new browser, same device id via URL param later). */
export async function pullWatchlist(): Promise<string[] | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.from("watchlists").select("cas").eq("device_id", deviceId()).maybeSingle();
    return Array.isArray(data?.cas) ? (data!.cas as string[]) : null;
  } catch {
    return null;
  }
}

/** Aggregate feature-board votes (one per device per feature). */
export function syncVote(featureId: string, voted: boolean): void {
  if (!supabase) return;
  if (voted) {
    supabase.from("feature_votes")
      .upsert({ device_id: deviceId(), feature_id: featureId }, { onConflict: "device_id,feature_id" })
      .then(() => {}, () => {});
  } else {
    supabase.from("feature_votes")
      .delete().eq("device_id", deviceId()).eq("feature_id", featureId)
      .then(() => {}, () => {});
  }
}

/** Public vote counts for the feature board. */
export async function fetchVoteCounts(): Promise<Record<string, number> | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.from("feature_vote_counts").select("feature_id, votes");
    if (!Array.isArray(data)) return null;
    return Object.fromEntries(data.map((r) => [String(r.feature_id), Number(r.votes)]));
  } catch {
    return null;
  }
}

/** Optional email capture for alert delivery (Track pillar). */
export async function subscribeAlerts(email: string, cas: string[]): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("alert_subscriptions")
      .upsert({ email: email.trim().toLowerCase(), cas, device_id: deviceId() }, { onConflict: "email" });
    return !error;
  } catch {
    return false;
  }
}

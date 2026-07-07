
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

/* ─── Price history & signal track record (read-only; written by the snapshot cron) ─── */
export interface PricePoint { ts: number; price: number; mcap: number }
export async function fetchPriceHistory(ca: string, hours = 168): Promise<PricePoint[] | null> {
  if (!supabase) return null;
  try {
    const since = new Date(Date.now() - hours * 3600_000).toISOString();
    const { data } = await supabase.from("price_snapshots")
      .select("ts, price_usd, mcap")
      .eq("ca", ca).gte("ts", since)
      .order("ts", { ascending: true }).limit(1000);
    if (!Array.isArray(data) || data.length < 2) return null;
    return data.map((r) => ({ ts: Date.parse(String(r.ts)), price: Number(r.price_usd), mcap: Number(r.mcap) }));
  } catch {
    return null;
  }
}

export interface AccuracyRow { kind: string; strength: string; total: number; hits: number; avg_change_24h: number }
export async function fetchSignalAccuracy(): Promise<AccuracyRow[] | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.from("signal_accuracy").select("*");
    return Array.isArray(data) && data.length ? (data as AccuracyRow[]) : null;
  } catch {
    return null;
  }
}

export interface ResolvedSignal { ca: string; symbol: string; kind: string; strength: string; title: string; ts: string; change_24h: number; hit: boolean; price_at?: number }
export interface PendingSignal { id: number; ca: string; symbol: string; kind: string; strength: string; title: string; ts: string; price_at: number }

export async function fetchResolvedSignals(limit = 30): Promise<ResolvedSignal[] | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.from("signal_events")
      .select("ca, symbol, kind, strength, title, ts, change_24h, hit, price_at")
      .eq("resolved", true)
      .order("ts", { ascending: false }).limit(limit);
    return Array.isArray(data) && data.length ? (data as ResolvedSignal[]) : null;
  } catch {
    return null;
  }
}

/** Resolved signals scoped to a founder's token addresses. */
export async function fetchFounderSignals(cas: string[], limit = 40): Promise<ResolvedSignal[] | null> {
  if (!supabase || !cas.length) return null;
  try {
    const { data } = await supabase.from("signal_events")
      .select("ca, symbol, kind, strength, title, ts, change_24h, hit, price_at")
      .eq("resolved", true)
      .in("ca", cas)
      .order("ts", { ascending: false }).limit(limit);
    return Array.isArray(data) && data.length ? (data as ResolvedSignal[]) : null;
  } catch {
    return null;
  }
}

/** Signals fired but not yet scored — awaiting the +24h checkpoint. */
export async function fetchPendingSignals(limit = 40): Promise<PendingSignal[] | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.from("signal_events")
      .select("id, ca, symbol, kind, strength, title, ts, price_at")
      .eq("resolved", false)
      .order("ts", { ascending: false }).limit(limit);
    return Array.isArray(data) && data.length ? (data as PendingSignal[]) : null;
  } catch {
    return null;
  }
}

/** Hit rate by kind (all strengths combined) for inline badges in the Signals feed. */
export async function fetchAccuracyByKind(): Promise<Record<string, { total: number; hits: number; rate: number }> | null> {
  const rows = await fetchSignalAccuracy();
  if (!rows) return null;
  const map: Record<string, { total: number; hits: number; rate: number }> = {};
  for (const r of rows) {
    const cur = map[r.kind] ?? { total: 0, hits: 0, rate: 0 };
    cur.total += r.total;
    cur.hits += r.hits;
    map[r.kind] = cur;
  }
  for (const k of Object.keys(map)) {
    map[k].rate = map[k].total ? map[k].hits / map[k].total : 0;
  }
  return map;
}

/* ─── Community investor theses ─── */

export interface ThesisPayload {
  token_ca: string;
  wallet_address: string;
  verdict: "Bullish" | "Bearish" | "Neutral";
  content: string;
  key_points: string[];
}

export interface SavedInvestorThesis extends ThesisPayload {
  id: string;
  created_at: string;
}

export type SaveThesisResult =
  | { ok: true; data: SavedInvestorThesis }
  | { ok: false; error: string };

export async function saveInvestorThesis(payload: ThesisPayload): Promise<SaveThesisResult> {
  if (!supabase) {
    return { ok: false, error: "Supabase not configured" };
  }

  try {
    const { data, error } = await supabase
      .from("investor_theses")
      .insert({
        token_ca: payload.token_ca,
        wallet_address: payload.wallet_address,
        verdict: payload.verdict,
        content: payload.content,
        key_points: payload.key_points ?? [],
      })
      .select();

    if (error) {
      console.error("Failed to save thesis:", error);
      return { ok: false, error: error.message };
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      return {
        ok: false,
        error: "Insert succeeded but no row was returned — check investor_theses RLS policies.",
      };
    }

    return { ok: true, data: row as SavedInvestorThesis };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Failed to save thesis:", err);
    return { ok: false, error: message };
  }
}

export async function getThesesForToken(tokenCa: string): Promise<SavedInvestorThesis[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("investor_theses")
      .select("*")
      .eq("token_ca", tokenCa)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch theses:", error);
      return [];
    }

    return (data as SavedInvestorThesis[]) || [];
  } catch (err) {
    console.error("Failed to fetch theses:", err);
    return [];
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

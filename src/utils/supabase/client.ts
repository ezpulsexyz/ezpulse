import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseKey, getSupabaseUrl, isSupabaseConfigured } from "./config";

let browserClient: SupabaseClient | null = null;

/**
 * Browser Supabase client for the Vite SPA.
 * Next.js server/middleware helpers are not used — this app is static + client-side.
 */
export function createClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;

  if (!browserClient) {
    browserClient = createBrowserClient(getSupabaseUrl(), getSupabaseKey());
  }

  return browserClient;
}
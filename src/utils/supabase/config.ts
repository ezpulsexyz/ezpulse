/** Vite env — supports legacy anon JWT or newer publishable key. */
export function getSupabaseUrl(): string {
  return (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? "";
}

export function getSupabaseKey(): string {
  return (
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim()
    || (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()
    || ""
  );
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseKey());
}
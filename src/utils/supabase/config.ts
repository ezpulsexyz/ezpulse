/** Vite env — with project fallbacks so GitHub Pages works without CI secrets. */
const PROJECT_URL = "https://wgqkdonexxltajdmergm.supabase.co";
/** Public anon JWT — safe to embed; same key exposed in every client bundle. */
const PROJECT_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndncWtkb25leHhsdGFqZG1lcmdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNzIyMDYsImV4cCI6MjA5ODg0ODIwNn0.YSLrxrKYjQVP4npcXZFa22dM6owbWqEEN-eV0HQYebg";

export function getSupabaseUrl(): string {
  return (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || PROJECT_URL;
}

export function getSupabaseKey(): string {
  const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
  if (anon) return anon;

  const publishable = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim();
  // sb_publishable_* keys are not JWTs — @supabase/supabase-js needs the anon JWT
  if (publishable?.startsWith("eyJ")) return publishable;

  return PROJECT_ANON_KEY;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseKey());
}
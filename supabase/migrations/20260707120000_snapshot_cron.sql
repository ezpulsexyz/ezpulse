-- Enable the extensions required for scheduled Edge Function calls.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Ensure the existing snapshot schedule is replaced with the desired 15-minute cadence.
select cron.unschedule('ezpulse-snapshot');
select cron.schedule(
  'ezpulse-snapshot',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://wgqkdonexxltajdmergm.supabase.co/functions/v1/snapshot',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndncWtkb25leHhsdGFqZG1lcmdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNzIyMDYsImV4cCI6MjA5ODg0ODIwNn0.YSLrxrKYjQVP4npcXZFa22dM6owbWqEEN-eV0HQYebg"}'::jsonb
  )
  $$
);

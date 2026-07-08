-- Fix misconfigured signal_events webhooks (were pointing at /snapshot).

drop trigger if exists trigger_signal_telegram_notification on public.signal_events;
drop trigger if exists "send-signal-to-telegram" on public.signal_events;
drop trigger if exists "send-new-launch-to-telegram" on public.signal_events;

create trigger "send-signal-to-telegram"
  after insert on public.signal_events
  for each row
  execute function supabase_functions.http_request(
    'https://wgqkdonexxltajdmergm.supabase.co/functions/v1/send-signal-to-telegram',
    'POST',
    '{"Content-Type":"application/json"}',
    '{}',
    '5000'
  );

create trigger "send-new-launch-to-telegram"
  after insert on public.signal_events
  for each row
  execute function supabase_functions.http_request(
    'https://wgqkdonexxltajdmergm.supabase.co/functions/v1/send-new-launch-to-telegram',
    'POST',
    '{"Content-Type":"application/json"}',
    '{}',
    '5000'
  );
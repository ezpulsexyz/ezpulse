-- Notify via snapshot Edge Function after insert (avoids trigger timeouts / missed webhooks).
drop trigger if exists "send-signal-to-telegram" on public.signal_events;
drop trigger if exists "send-new-launch-to-telegram" on public.signal_events;
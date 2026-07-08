// ezpulse · push signal_events to Telegram for monitored tokens
// Deploy: supabase functions deploy send-signal-to-telegram --no-verify-jwt
// Secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
// Webhook: signal_events INSERT → this function URL

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID")!;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

type SignalRecord = {
  ca?: string;
  token_ca?: string;
  symbol?: string;
  token_symbol?: string;
  kind?: string;
  strength?: string;
  change_24h?: number | null;
  conviction_score?: number | null;
};

serve(async (req) => {
  try {
    const payload = await req.json();
    const raw = (payload.record ?? payload) as SignalRecord;

    const tokenCa = raw.token_ca ?? raw.ca;
    if (!tokenCa) {
      return new Response("Missing token ca", { status: 400 });
    }

    const tokenSymbol = raw.token_symbol ?? raw.symbol;
    const strength = String(raw.strength ?? "SIGNAL").toUpperCase();
    const change24h = raw.change_24h;
    const hasChange = typeof change24h === "number" && Number.isFinite(change24h);
    const changeLabel = hasChange
      ? `${change24h >= 0 ? "+" : ""}${change24h.toFixed(1)}%`
      : "N/A";

    // === 1. Check if token is in monitored list ===
    const { data: monitored, error } = await supabase
      .from("monitored_tokens")
      .select("token_ca")
      .eq("token_ca", tokenCa)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !monitored) {
      return new Response("Skipped - token not monitored", { status: 200 });
    }

    // === 2. Build Telegram message ===
    const message = `
🚨 *New ${strength} Signal*

*Token:* ${tokenSymbol || tokenCa.slice(0, 6) + "..."}
*Type:* ${raw.kind ?? "—"}
*24h Change:* ${changeLabel}
*Conviction:* ${raw.conviction_score ?? "N/A"}
    `.trim();

    // === 3. Inline buttons ===
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: "📊 View in ezpulse",
            url: `https://ezpulse.xyz/token/${tokenCa}`,
          },
          {
            text: "🔍 DexScreener",
            url: `https://dexscreener.com/solana/${tokenCa}`,
          },
        ],
        [
          {
            text: "📈 View Chart",
            url: `https://dexscreener.com/solana/${tokenCa}`,
          },
          {
            text: "👤 Founder Terminal",
            url: `https://ezpulse.xyz/token/${tokenCa}?tab=founder`,
          },
        ],
      ],
    };

    // === 4. Send to Telegram ===
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "Markdown",
        reply_markup: keyboard,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Telegram API error:", errText);
      return new Response(errText, { status: 502 });
    }

    return new Response("Notification sent", { status: 200 });
  } catch (error) {
    console.error("Telegram notification error:", error);
    return new Response("Error", { status: 500 });
  }
});
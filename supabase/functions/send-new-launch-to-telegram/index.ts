// ezpulse · push new launch signal_events to Telegram
// Deploy: supabase functions deploy send-new-launch-to-telegram --no-verify-jwt
// Secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_CHANNEL_ID (optional)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID")!;
const TELEGRAM_CHANNEL_ID = Deno.env.get("TELEGRAM_CHANNEL_ID");

const NEW_LAUNCH_KINDS = [
  "NEW_LAUNCH",
  "GRADUATED",
  "BONDING_CURVE_COMPLETED",
  "LAUNCH",
];

type SignalRecord = {
  ca?: string;
  token_ca?: string;
  symbol?: string;
  token_symbol?: string;
  kind?: string;
  strength?: string;
  change_24h?: number | null;
};

serve(async (req) => {
  try {
    const payload = await req.json();
    const signal = (payload.record ?? payload) as SignalRecord;

    if (!NEW_LAUNCH_KINDS.includes(signal.kind ?? "")) {
      return new Response("Not a new launch", { status: 200 });
    }

    const tokenCa = signal.token_ca ?? signal.ca;
    if (!tokenCa) {
      return new Response("Missing token ca", { status: 400 });
    }

    const tokenSymbol = signal.token_symbol ?? signal.symbol;

    const message = `
🎉 *New Token Launched!*

*Token:* ${tokenSymbol || tokenCa.slice(0, 6) + "..."}
*Type:* ${signal.kind ?? "—"}
*Initial Change:* ${signal.change_24h ?? 0}%

A new project has just launched on the platform.
    `.trim();

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: "📊 View in ezpulse",
            url: `https://ezpulse.xyz/token/${tokenCa}`,
          },
          {
            text: "🔍 View on DexScreener",
            url: `https://dexscreener.com/solana/${tokenCa}`,
          },
        ],
        [
          {
            text: "👤 Founder Terminal",
            url: `https://ezpulse.xyz/token/${tokenCa}`,
          },
        ],
      ],
    };

    const sendToChat = (chatId: string) =>
      fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown",
          reply_markup: keyboard,
        }),
      });

    const res = await sendToChat(TELEGRAM_CHAT_ID);
    if (!res.ok) {
      const errText = await res.text();
      console.error("New launch notification error:", errText);
      return new Response(errText, { status: 502 });
    }

    if (TELEGRAM_CHANNEL_ID) {
      const channelRes = await sendToChat(TELEGRAM_CHANNEL_ID);
      if (!channelRes.ok) {
        const errText = await channelRes.text();
        console.error("New launch channel error:", errText);
        return new Response(errText, { status: 502 });
      }
    }

    return new Response("New launch notification sent", { status: 200 });
  } catch (error) {
    console.error("New launch notification error:", error);
    return new Response("Error", { status: 500 });
  }
});
// ezpulse · push important signal_events to Telegram
// Deploy: supabase functions deploy send-signal-to-telegram --no-verify-jwt
// Secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID")!;

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
    const signal = (payload.record ?? payload) as SignalRecord;

    const tokenCa = signal.token_ca ?? signal.ca;
    const tokenSymbol = signal.token_symbol ?? signal.symbol;
    const strength = String(signal.strength ?? "").toUpperCase();

    // === SMART FILTERING ===
    const importantStrengths = ["STRONG", "BULLISH", "BEARISH", "HIGH"];
    const isImportant = importantStrengths.includes(strength);

    // Snapshot inserts often omit change_24h — allow those when strength qualifies
    const change24h = signal.change_24h;
    const hasChange = typeof change24h === "number" && Number.isFinite(change24h);
    const isSignificantMove = hasChange ? Math.abs(change24h) >= 15 : isImportant;

    if (!isImportant || !isSignificantMove) {
      return new Response("Skipped - not important enough", { status: 200 });
    }

    if (!tokenCa) {
      return new Response("Missing token ca", { status: 400 });
    }

    const changeLabel = hasChange
      ? `${change24h >= 0 ? "+" : ""}${change24h.toFixed(1)}%`
      : "N/A";

    const message = `
🚨 *New ${strength || "SIGNAL"} Signal*

*Token:* ${tokenSymbol || tokenCa.slice(0, 8) + "..."}
*Type:* ${signal.kind ?? "—"}
*24h Change:* ${changeLabel}
*Conviction:* ${signal.conviction_score ?? "N/A"}

[Open in ezpulse](https://ezpulse.xyz/token/${tokenCa})
    `.trim();

    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
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
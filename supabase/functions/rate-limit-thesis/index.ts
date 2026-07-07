// ezpulse · thesis posting rate limit (3 per wallet per 24h)
// Deploy: supabase functions deploy rate-limit-thesis --no-verify-jwt

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_THESES_PER_DAY = 3;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { wallet_address, token_ca: _tokenCa } = await req.json();

    if (!wallet_address) {
      return new Response(JSON.stringify({ error: "Wallet address is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count, error } = await supabase
      .from("investor_theses")
      .select("*", { count: "exact", head: true })
      .eq("wallet_address", wallet_address)
      .gte("created_at", twentyFourHoursAgo);

    if (error) throw error;

    if (count && count >= MAX_THESES_PER_DAY) {
      return new Response(
        JSON.stringify({
          allowed: false,
          message: `You can only post ${MAX_THESES_PER_DAY} theses per day.`,
          current_count: count,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        allowed: true,
        current_count: count || 0,
        max_allowed: MAX_THESES_PER_DAY,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
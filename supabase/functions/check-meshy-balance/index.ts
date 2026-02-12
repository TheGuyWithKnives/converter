import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MESHY_API_KEY = Deno.env.get('MESHY_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (!MESHY_API_KEY) {
      throw new Error('Missing MESHY_API_KEY');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const balanceResponse = await fetch('https://api.meshy.ai/openapi/v1/balance', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MESHY_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!balanceResponse.ok) {
      const errorData = await balanceResponse.json();
      throw new Error(`Meshy API error: ${errorData.message || balanceResponse.statusText}`);
    }

    const balanceData = await balanceResponse.json();
    const currentBalance = balanceData.balance || 0;

    const { error: insertError } = await supabase
      .from('meshy_balance_log')
      .insert({
        balance: currentBalance,
        last_checked: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Failed to log balance:', insertError);
    }

    const { error: notifyError } = await supabase.rpc('check_low_balance_and_notify');

    if (notifyError) {
      console.error('Failed to check notifications:', notifyError);
    }

    return new Response(JSON.stringify({
      success: true,
      balance: currentBalance,
      timestamp: new Date().toISOString(),
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error checking Meshy balance:', error);

    return new Response(JSON.stringify({
      error: (error as Error).message,
      success: false,
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      status: 500,
    });
  }
});

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";


interface RelayPayload {
  recipient_id?: string;
  device_token?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  // CORS configuration: In production, configure ALLOWED_ORIGIN in Supabase secrets
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || '*';
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  // Enforce POST method
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: `Method ${req.method} not allowed. Use POST.` }),
      {
        headers,
        status: 405,
      }
    );
  }

  // Authentication check (Phase 6 full verification)
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({
        error: 'Missing Authorization header. Expected Bearer token.',
      }),
      {
        headers,
        status: 401,
      }
    );
  }

  try {
    const payload: RelayPayload = await req.json();

    return new Response(
      JSON.stringify({
        status: 'ok',
        message: 'Push notification relay placeholder (Phase 6 implementation ready)',
        received: payload,
        timestamp: new Date().toISOString(),
      }),
      {
        headers,
        status: 200,
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid JSON payload';
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers,
        status: 400,
      }
    );
  }
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MESHY_API_KEY = Deno.env.get('MESHY_API_KEY');
const BASE_URL = 'https://api.meshy.ai';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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
    const { action, payload } = await req.json();

    if (!MESHY_API_KEY) {
      throw new Error('Missing MESHY_API_KEY');
    }

    let endpoint = '';
    let method = 'POST';
    let body: string | undefined = JSON.stringify(payload);
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${MESHY_API_KEY}`,
      'Content-Type': 'application/json',
    };

    switch (action) {
      case 'text-to-3d':
        endpoint = '/openapi/v2/text-to-3d';
        break;
      case 'image-to-3d':
        endpoint = '/openapi/v1/image-to-3d';
        break;
      case 'text-to-texture':
        endpoint = '/openapi/v1/text-to-texture';
        break;
      case 'retexture':
        endpoint = '/openapi/v1/retexture';
        break;
      case 'remesh':
        endpoint = '/openapi/v1/remesh';
        break;
      case 'rigging':
        endpoint = '/openapi/v1/rigging';
        break;
      case 'animation':
        endpoint = '/openapi/v1/animations';
        break;
      case 'list-animations': {
        endpoint = '/openapi/v1/animations/library';
        method = 'GET';
        body = undefined;
        break;
      }
      case 'get-task': {
        if (payload.endpoint) {
          endpoint = payload.endpoint;
        } else {
          throw new Error('Missing endpoint for get-task');
        }
        method = 'GET';
        body = undefined;
        break;
      }
      case 'proxy-model': {
        if (!payload.url || typeof payload.url !== 'string') {
          throw new Error('Missing url for proxy-model');
        }
        const modelUrl = payload.url;
        const allowedHosts = ['assets.meshy.ai', 'cdn.meshy.ai'];
        const parsedUrl = new URL(modelUrl);
        if (!allowedHosts.some(h => parsedUrl.hostname.endsWith(h))) {
          throw new Error('URL not allowed for proxying');
        }
        const modelResponse = await fetch(modelUrl);
        if (!modelResponse.ok) {
          throw new Error(`Failed to fetch model: ${modelResponse.status}`);
        }
        const arrayBuffer = await modelResponse.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
          binary += String.fromCharCode(...chunk);
        }
        const base64 = btoa(binary);
        const contentType = modelResponse.headers.get('content-type') || 'model/gltf-binary';
        return new Response(JSON.stringify({ data: base64, contentType }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;

    const response = await fetch(url, { method, headers, body });
    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.message || 'Meshy API error', details: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

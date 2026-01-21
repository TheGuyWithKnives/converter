import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const MESHY_API_KEY = Deno.env.get('MESHY_API_KEY')
const BASE_URL = 'https://api.meshy.ai'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, payload } = await req.json()

    if (!MESHY_API_KEY) {
      throw new Error('Missing MESHY_API_KEY')
    }

    let endpoint = ''
    let method = 'POST'
    let body = JSON.stringify(payload)
    const headers = {
      'Authorization': `Bearer ${MESHY_API_KEY}`,
      'Content-Type': 'application/json',
    }

    // Router pro různé Meshy funkce
    switch (action) {
      case 'text-to-3d':
        endpoint = '/openapi/v2/text-to-3d'
        break
      case 'image-to-3d':
        endpoint = '/openapi/v1/image-to-3d'
        break
      case 'text-to-texture':
        endpoint = '/openapi/v1/text-to-texture'
        break
      case 'rigging':
        endpoint = '/openapi/v1/rigging'
        break
      case 'get-task':
        endpoint = `/${payload.taskId}` // Meshy vrací plnou URL nebo ID, zde předpokládáme ID
        if (!payload.taskId.includes('/')) {
             // Pokud je to jen ID, musíme zjistit typ tasku, ale Meshy API má specifické gety. 
             // Zjednodušení: Klient pošle celou cestu endpointu v payload.endpoint, pokud jde o GET
             if(payload.endpoint) endpoint = payload.endpoint;
        }
        method = 'GET'
        body = undefined
        break
      default:
        throw new Error(`Unknown action: ${action}`)
    }

    // Pokud je endpoint definován relativně a nezačíná http, přidáme base
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`

    const response = await fetch(url, { method, headers, body })
    const data = await response.json()

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
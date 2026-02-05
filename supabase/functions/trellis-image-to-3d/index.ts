import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;

  const envOrigins = Deno.env.get('ALLOWED_ORIGINS');
  if (envOrigins) {
    const allowedList = envOrigins.split(',').map(o => o.trim());
    return allowedList.includes(origin);
  }

  if (origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.includes('webcontainer')) {
    return true;
  }

  return false;
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = isOriginAllowed(origin);

  return {
    "Access-Control-Allow-Origin": isAllowed && origin ? origin : "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
    "Access-Control-Allow-Credentials": "true",
  };
}

const MESHY_API_KEY = Deno.env.get('MESHY_API_KEY');

if (!MESHY_API_KEY) {
  console.error('CRITICAL: MESHY_API_KEY environment variable is not set!');
  throw new Error('Server misconfiguration: Missing API token');
}

if (!MESHY_API_KEY.startsWith('msy_')) {
  console.warn('WARNING: MESHY_API_KEY has unexpected format');
}

console.log(`MESHY_API_KEY loaded (length: ${MESHY_API_KEY.length})`);

async function downloadAndStoreModel(glbUrl: string, taskId: string): Promise<string> {
  console.log('Downloading GLB from Meshy:', glbUrl);

  const glbResponse = await fetch(glbUrl);
  if (!glbResponse.ok) {
    throw new Error(`Failed to download GLB: ${glbResponse.status}`);
  }

  const glbBlob = await glbResponse.blob();
  const glbArrayBuffer = await glbBlob.arrayBuffer();

  console.log('Uploading to Supabase Storage...');

  const fileName = `models/${taskId}.glb`;
  const { data, error } = await supabase.storage
    .from('3d-models')
    .upload(fileName, glbArrayBuffer, {
      contentType: 'model/gltf-binary',
      upsert: true,
    });

  if (error) {
    console.error('Storage upload error:', error);
    throw new Error(`Failed to upload to storage: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('3d-models')
    .getPublicUrl(fileName);

  console.log('Model stored at:', urlData.publicUrl);
  return urlData.publicUrl;
}

interface RequestBody {
  image?: string;
  images?: string[];
  instructions?: string;
  taskId?: string;
  qualityPreset?: 'fast' | 'quality' | 'ultra';
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('MESHY_API_KEY available:', !!MESHY_API_KEY);

    if (!MESHY_API_KEY) {
      throw new Error('MESHY_API_KEY not configured');
    }

    const { image, images, instructions, taskId, qualityPreset }: RequestBody = await req.json();

    if (images && images.length > 10) {
      throw new Error('Maximum 10 images allowed');
    }

    if (images) {
      const totalSize = images.reduce((acc, img) => acc + img.length, 0);
      if (totalSize > 15 * 1024 * 1024) {
        throw new Error('Total image size exceeds 15MB limit');
      }
    }

    if (instructions && instructions.length > 5000) {
      throw new Error('Instructions too long (maximum 5000 characters)');
    }

    if (taskId) {
      console.log('Checking status for task:', taskId);
      const statusResponse = await fetch(
        `https://api.meshy.ai/openapi/v1/image-to-3d/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${MESHY_API_KEY}`,
          },
        }
      );

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error('Status check failed:', errorText);
        throw new Error(`Failed to get task status: ${errorText}`);
      }

      const statusData = await statusResponse.json();

      console.log('Status data received:', JSON.stringify({
        id: statusData.id,
        status: statusData.status,
        hasModelUrls: !!statusData.model_urls,
        glbUrl: statusData.model_urls?.glb,
      }));

      let outputUrl = statusData.model_urls?.glb || statusData.model_url;

      if (statusData.status === 'SUCCEEDED' && outputUrl) {
        try {
          outputUrl = await downloadAndStoreModel(outputUrl, statusData.id);
        } catch (storageError) {
          console.error('Failed to store model, using original URL:', storageError);
        }
      }

      return new Response(JSON.stringify({
        id: statusData.id,
        status: statusData.status,
        output: outputUrl,
        progress: statusData.progress,
        error: statusData.task_error?.message || statusData.error,
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    const imageToUse = images && images.length > 0 ? images[0] : image;

    if (!imageToUse) {
      throw new Error('No image provided');
    }

    console.log('Starting new image-to-3D task...');
    if (instructions) {
      console.log('Custom instructions:', instructions);
    }

    const qualitySettings: Record<string, string> = {
      fast: 'meshy-4',
      quality: 'meshy-5',
      ultra: 'latest',
    };

    const aiModel = qualitySettings[qualityPreset || 'quality'];

    console.log('Quality preset:', qualityPreset || 'quality', '→', aiModel);

    const requestBody: any = {
      image_url: imageToUse,
      enable_pbr: true,
      ai_model: aiModel,
    };

    if (instructions) {
      requestBody.texture_prompt = instructions.substring(0, 600);
    }

    const response = await fetch('https://api.meshy.ai/openapi/v1/image-to-3d', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MESHY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Meshy API error:', response.status, errorText);
      throw new Error(`Failed to start generation (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    console.log('Task started:', result.result || result.id);

    return new Response(JSON.stringify({
      id: result.result || result.id,
      status: 'PENDING',
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Edge Function error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorName = error instanceof Error ? error.name : 'Error';

    let statusCode = 500;
    let userMessage = errorMessage;

    if (errorMessage.includes('CORS')) {
      statusCode = 403;
      userMessage = 'Request origin not allowed';
    } else if (errorMessage.includes('not configured')) {
      statusCode = 503;
      userMessage = 'Service temporarily unavailable';
    } else if (errorMessage.includes('Maximum') || errorMessage.includes('too long')) {
      statusCode = 400;
      userMessage = errorMessage;
    } else if (errorMessage.includes('Invalid') || errorMessage.includes('No image')) {
      statusCode = 400;
      userMessage = errorMessage;
    } else if (errorMessage.includes('timeout')) {
      statusCode = 504;
      userMessage = 'Request timeout';
    }

    console.error({
      type: errorName,
      message: errorMessage,
      statusCode,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        error: userMessage,
        type: errorName,
        timestamp: new Date().toISOString(),
      }),
      {
        status: statusCode,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
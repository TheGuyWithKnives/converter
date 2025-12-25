import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const corsOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  };
}

const REPLICATE_API_TOKEN = Deno.env.get('REPLICATE_API_TOKEN');
const TRELLIS_MODEL_VERSION = 'e8f6c45206993f297372f5436b90350817bd9b4a0d52d2a76df50c1c8afa2b3c';

interface RequestBody {
  image?: string;
  images?: string[];
  instructions?: string;
  predictionId?: string;
  qualityPreset?: 'fast' | 'quality' | 'ultra';
  advancedParams?: {
    ss_sampling_steps?: number;
    ss_guidance_strength?: number;
    slat_sampling_steps?: number;
    slat_guidance_strength?: number;
  };
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
    console.log('REPLICATE_API_TOKEN available:', !!REPLICATE_API_TOKEN);

    if (!REPLICATE_API_TOKEN) {
      throw new Error('REPLICATE_API_TOKEN not configured');
    }

    const { image, images, instructions, predictionId, qualityPreset, advancedParams }: RequestBody = await req.json();

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

    if (advancedParams) {
      const { ss_sampling_steps, slat_sampling_steps, ss_guidance_strength, slat_guidance_strength } = advancedParams;

      if (ss_sampling_steps && (ss_sampling_steps < 1 || ss_sampling_steps > 100)) {
        throw new Error('Invalid ss_sampling_steps (must be 1-100)');
      }
      if (slat_sampling_steps && (slat_sampling_steps < 1 || slat_sampling_steps > 100)) {
        throw new Error('Invalid slat_sampling_steps (must be 1-100)');
      }
      if (ss_guidance_strength && (ss_guidance_strength < 0 || ss_guidance_strength > 20)) {
        throw new Error('Invalid ss_guidance_strength (must be 0-20)');
      }
      if (slat_guidance_strength && (slat_guidance_strength < 0 || slat_guidance_strength > 20)) {
        throw new Error('Invalid slat_guidance_strength (must be 0-20)');
      }
    }

    if (predictionId) {
      console.log('Checking status for prediction:', predictionId);
      const statusResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${predictionId}`,
        {
          headers: {
            'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
          },
        }
      );

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error('Status check failed:', errorText);
        throw new Error(`Failed to get prediction status: ${errorText}`);
      }

      const statusData = await statusResponse.json();

      return new Response(JSON.stringify(statusData), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    const imageArray = images && images.length > 0 ? images : [image];

    console.log('Starting new prediction with', imageArray.length, 'image(s)...');
    if (instructions) {
      console.log('Custom instructions:', instructions);
    }

    const qualityPresets = {
      fast: {
        ss_sampling_steps: 12,
        ss_guidance_strength: 7.5,
        slat_sampling_steps: 12,
        slat_guidance_strength: 3,
      },
      quality: {
        ss_sampling_steps: 20,
        ss_guidance_strength: 8,
        slat_sampling_steps: 20,
        slat_guidance_strength: 4,
      },
      ultra: {
        ss_sampling_steps: 30,
        ss_guidance_strength: 9,
        slat_sampling_steps: 30,
        slat_guidance_strength: 5,
      },
    };

    const preset = qualityPreset || 'quality';
    const samplingParams = advancedParams || qualityPresets[preset];

    console.log('Quality preset:', preset);
    console.log('Sampling parameters:', samplingParams);

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: TRELLIS_MODEL_VERSION,
        input: {
          images: imageArray,
          seed: 0,
          texture_size: 2048,
          mesh_simplify: 0.92,
          generate_color: true,
          generate_model: true,
          randomize_seed: true,
          ss_sampling_steps: samplingParams.ss_sampling_steps,
          ss_guidance_strength: samplingParams.ss_guidance_strength,
          slat_sampling_steps: samplingParams.slat_sampling_steps,
          slat_guidance_strength: samplingParams.slat_guidance_strength,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Replicate API error:', response.status, errorText);
      throw new Error(`Failed to start generation (${response.status}): ${errorText}`);
    }

    const prediction = await response.json();
    console.log('Prediction started:', prediction.id);

    return new Response(JSON.stringify(prediction), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
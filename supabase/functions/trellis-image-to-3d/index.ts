import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
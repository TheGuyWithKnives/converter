import { applyInstructionsToImage } from './instructionsProcessor';
import { generateImageHash, getCachedModel, saveCachedModel } from './modelCache';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/trellis-image-to-3d`;

const lastRequestTimestamp = { value: 0 };
const MIN_REQUEST_INTERVAL = 30000;

function checkRateLimit(): void {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTimestamp.value;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTimeSeconds = Math.ceil((MIN_REQUEST_INTERVAL - timeSinceLastRequest) / 1000);
    throw new Error(`Prosím počkejte ${waitTimeSeconds} sekund před dalším požadavkem na generování modelu`);
  }

  lastRequestTimestamp.value = now;
}

export interface TripoSRResult {
  model_url: string;
  status: 'SUCCEEDED' | 'FAILED' | 'PROCESSING';
  error?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_SIZE = 50 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

async function fileToBase64(file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `Soubor ${file.name} je příliš velký (max 10MB). Aktuální velikost: ${(file.size / 1024 / 1024).toFixed(2)}MB`
    );
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(
      `Nepodporovaný formát souboru: ${file.type}. Podporované formáty: JPEG, PNG, WebP`
    );
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        if (reader.result.length > MAX_FILE_SIZE * 1.5) {
          reject(new Error('Soubor po konverzi překračuje maximální velikost'));
          return;
        }
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = () => reject(new Error('Chyba při čtení souboru'));
    reader.readAsDataURL(file);
  });
}

export type QualityPreset = 'fast' | 'quality' | 'ultra';

export async function generateModelFromImage(
  _imageUrl: string,
  file: File,
  additionalFiles?: File[],
  instructions?: string,
  qualityPreset?: QualityPreset
): Promise<TripoSRResult> {
  console.log('Processing image(s) with instructions and multi-view...');

  const allFiles = [file, ...(additionalFiles || [])];
  const totalSize = allFiles.reduce((sum, f) => sum + f.size, 0);

  if (totalSize > MAX_TOTAL_SIZE) {
    throw new Error(
      `Celková velikost souborů přesahuje limit (max 50MB). Aktuální: ${(totalSize / 1024 / 1024).toFixed(2)}MB`
    );
  }

  if (allFiles.length > 10) {
    throw new Error('Maximální počet obrázků je 10');
  }

  const imageHash = await generateImageHash(file);
  console.log('Image hash:', imageHash.substring(0, 16) + '...');

  const cachedUrl = await getCachedModel(imageHash, instructions);
  if (cachedUrl) {
    console.log('✅ Using cached model!');
    return {
      model_url: cachedUrl,
      status: 'SUCCEEDED',
    };
  }

  console.log('Cache miss - generating new model...');

  checkRateLimit();

  let filesToProcess = [file];
  if (additionalFiles && additionalFiles.length > 0) {
    filesToProcess = [file, ...additionalFiles];
    console.log(`Processing ${filesToProcess.length} images for multi-view generation...`);
  }

  if (instructions && instructions.trim()) {
    console.log('Applying instructions preprocessing to all images...');
    const processedFiles = await Promise.all(
      filesToProcess.map(f => applyInstructionsToImage(f, instructions))
    );
    filesToProcess = processedFiles.map(p => p.file);
  }

  console.log('Converting images to base64...');
  const dataUrls = await Promise.all(
    filesToProcess.map(f => fileToBase64(f))
  );

  console.log(`Starting Replicate TRELLIS prediction with ${dataUrls.length} image(s)...`);
  if (instructions) {
    console.log('Instructions were preprocessed and applied to all images:', instructions);
  }
  if (dataUrls.length > 1) {
    console.log(`Multi-view generation with ${dataUrls.length} different angles`);
  }

  const preset = qualityPreset || 'quality';
  console.log(`🎯 Quality preset: ${preset}`);

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      images: dataUrls,
      instructions: instructions || undefined,
      qualityPreset: preset,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Edge Function error:', response.status, errorText);
    throw new Error(`Failed to start generation (${response.status}): ${errorText}`);
  }

  const prediction = await response.json();
  const predictionId = prediction.id;

  if (!predictionId) {
    throw new Error('No prediction ID received');
  }

  console.log('Polling for result with prediction ID:', predictionId);

  const maxAttempts = 90;
  let attempts = 0;
  let pollDelay = 2000;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, pollDelay));
    pollDelay = Math.min(pollDelay * 1.15, 10000);
    attempts++;

    console.log(`⏳ Polling attempt ${attempts}/${maxAttempts}...`);

    const statusResponse = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        predictionId,
      }),
    });

    if (!statusResponse.ok) {
      console.error('Failed to get prediction status');
      continue;
    }

    const statusData = await statusResponse.json();
    console.log(`📊 Status: ${statusData.status}`);

    if (statusData.status === 'succeeded') {
      const output = statusData.output;
      console.log('✅ Generation succeeded! Full output:', JSON.stringify(output, null, 2));

      if (!output) {
        console.error('❌ No output object received');
        throw new Error('Invalid output from Replicate - no output object');
      }

      // TRELLIS může vracet různé formáty
      const glbUrl = output.model_file || output.glb || output.model || output;
      console.log('🔍 Extracted GLB URL:', glbUrl);

      if (!glbUrl || typeof glbUrl !== 'string') {
        console.error('❌ Could not find valid GLB URL in output:', output);
        throw new Error('Invalid output from Replicate - no model file URL found');
      }

      console.log('Model ready at:', glbUrl);

      await saveCachedModel(imageHash, glbUrl, instructions);

      return {
        model_url: glbUrl,
        status: 'SUCCEEDED',
      };
    }

    if (statusData.status === 'failed') {
      throw new Error(statusData.error || 'Model generation failed');
    }

    if (statusData.status === 'canceled') {
      throw new Error('Model generation was canceled');
    }
  }

  throw new Error('Timeout waiting for model generation. Please try again.');
}

export async function uploadImageToPublicUrl(file: File): Promise<string> {
  return URL.createObjectURL(file);
}

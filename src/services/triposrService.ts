import { applyInstructionsToImage } from './instructionsProcessor';
import { generateImageHash, getCachedModel, saveCachedModel } from './modelCache';
import { globalDeduplicator } from './requestManager';
import { meshyService } from './meshyService';

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

const QUALITY_TO_MODEL: Record<QualityPreset, string> = {
  fast: 'meshy-4',
  quality: 'meshy-5',
  ultra: 'latest',
};

export async function generateModelFromImage(
  _imageUrl: string,
  file: File,
  additionalFiles?: File[],
  instructions?: string,
  qualityPreset?: QualityPreset,
  signal?: AbortSignal
): Promise<TripoSRResult> {
  if (signal?.aborted) {
    throw new Error('Request was cancelled before starting');
  }

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

  const cachedUrl = await getCachedModel(imageHash, instructions);
  if (cachedUrl) {
    return {
      model_url: cachedUrl,
      status: 'SUCCEEDED',
    };
  }

  const requestKey = `model-${imageHash}-${instructions || 'none'}-${qualityPreset || 'quality'}-${allFiles.length}`;

  return await globalDeduplicator.deduplicate(
    requestKey,
    async () => {
      checkRateLimit();

      let filesToProcess = [file];
      if (additionalFiles && additionalFiles.length > 0) {
        filesToProcess = [file, ...additionalFiles];
      }

      if (instructions && instructions.trim()) {
        const processedFiles = await Promise.all(
          filesToProcess.map(f => applyInstructionsToImage(f, instructions))
        );
        filesToProcess = processedFiles.map(p => p.file);
      }

      const dataUrls = await Promise.all(
        filesToProcess.map(f => fileToBase64(f))
      );

      const preset = qualityPreset || 'quality';
      const aiModel = QUALITY_TO_MODEL[preset];

      if (signal?.aborted) {
        throw new Error('Request was cancelled before API call');
      }

      const taskId = await meshyService.createImageTo3D(dataUrls[0], {
        enable_pbr: true,
        ai_model: aiModel,
        ...(instructions && { texture_prompt: instructions.substring(0, 600) }),
      });

      const maxAttempts = 90;
      let attempts = 0;
      let pollDelay = 2000;

      while (attempts < maxAttempts) {
        if (signal?.aborted) {
          throw new Error('Request was cancelled during polling');
        }

        await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(resolve, pollDelay);
          signal?.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new Error('Request was cancelled'));
          });
        });

        pollDelay = Math.min(pollDelay * 1.15, 10000);
        attempts++;

        const statusData = await meshyService.getTaskStatus(taskId, 'image-to-3d');

        if (statusData.status === 'SUCCEEDED') {
          const glbUrl = statusData.model_urls?.glb;

          if (!glbUrl || typeof glbUrl !== 'string') {
            throw new Error('Invalid output from Meshy.ai - no model file URL found');
          }

          await saveCachedModel(imageHash, glbUrl, instructions);

          return {
            model_url: glbUrl,
            status: 'SUCCEEDED' as const,
          };
        }

        if (statusData.status === 'FAILED') {
          const errorMsg = statusData.error || 'Model generation failed';
          throw new Error(errorMsg);
        }

        if (statusData.status === 'CANCELLED' || statusData.status === 'CANCELED') {
          throw new Error('Model generation was canceled');
        }
      }

      throw new Error('Timeout waiting for model generation. Please try again.');
    },
    600000
  );
}

export async function uploadImageToPublicUrl(file: File): Promise<string> {
  return URL.createObjectURL(file);
}

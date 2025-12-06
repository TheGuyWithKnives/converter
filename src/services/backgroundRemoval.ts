// TensorFlow is used by MediaPipe internally
import '@tensorflow/tfjs';

export interface SegmentationResult {
  imageWithoutBg: HTMLCanvasElement;
  mask: ImageData;
  width: number;
  height: number;
}

export async function removeBackground(
  imageElement: HTMLImageElement,
  onProgress?: (progress: number) => void
): Promise<SegmentationResult> {
  if (onProgress) onProgress(0.1);

  const canvas = document.createElement('canvas');
  canvas.width = imageElement.width;
  canvas.height = imageElement.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.drawImage(imageElement, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  if (onProgress) onProgress(0.3);

  const mask = createMaskFromEdges(imageData);

  if (onProgress) onProgress(0.6);

  const refinedMask = refineMask(mask, imageData);

  if (onProgress) onProgress(0.8);

  const resultCanvas = applyMask(imageData, refinedMask);

  if (onProgress) onProgress(1.0);

  return {
    imageWithoutBg: resultCanvas,
    mask: refinedMask,
    width: canvas.width,
    height: canvas.height,
  };
}

function createMaskFromEdges(imageData: ImageData): ImageData {
  const { width, height, data } = imageData;
  const mask = new ImageData(width, height);

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) throw new Error('Failed to get context');

  tempCtx.putImageData(imageData, 0, 0);

  const edges = detectEdges(data, width, height);

  const centerX = width / 2;
  const centerY = height / 2;
  const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      const distanceFromCenter = Math.sqrt(
        Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
      );
      const distanceFactor = 1 - (distanceFromCenter / maxDistance);

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const brightness = (r + g + b) / 3;
      const saturation = Math.max(r, g, b) - Math.min(r, g, b);

      const edgeStrength = edges[y * width + x];

      let foregroundScore = 0;
      foregroundScore += distanceFactor * 0.5;
      foregroundScore += (saturation / 255) * 0.2;
      foregroundScore += edgeStrength * 0.3;

      const isBackground = foregroundScore < 0.25 ||
                          (brightness > 245 && saturation < 15) ||
                          (brightness < 10 && saturation < 15);

      mask.data[idx] = r;
      mask.data[idx + 1] = g;
      mask.data[idx + 2] = b;
      mask.data[idx + 3] = isBackground ? 0 : 255;
    }
  }

  return mask;
}

function detectEdges(data: Uint8ClampedArray, width: number, height: number): Float32Array {
  const edges = new Float32Array(width * height);

  const sobelX = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1]
  ];

  const sobelY = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1]
  ];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

          gx += gray * sobelX[ky + 1][kx + 1];
          gy += gray * sobelY[ky + 1][kx + 1];
        }
      }

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edges[y * width + x] = Math.min(magnitude / 1000, 1);
    }
  }

  return edges;
}

function refineMask(mask: ImageData, _originalImage: ImageData): ImageData {
  const { width, height } = mask;
  const refined = new ImageData(width, height);

  for (let i = 0; i < mask.data.length; i++) {
    refined.data[i] = mask.data[i];
  }

  const iterations = 2;

  for (let iter = 0; iter < iterations; iter++) {
    const temp = new Uint8ClampedArray(refined.data);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;

        let sum = 0;
        let count = 0;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nIdx = ((y + dy) * width + (x + dx)) * 4;
            sum += temp[nIdx + 3];
            count++;
          }
        }

        const avg = sum / count;
        refined.data[idx + 3] = avg > 127 ? 255 : 0;
      }
    }
  }

  return refined;
}

function applyMask(imageData: ImageData, mask: ImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  const result = new ImageData(imageData.width, imageData.height);

  for (let i = 0; i < imageData.data.length; i += 4) {
    result.data[i] = imageData.data[i];
    result.data[i + 1] = imageData.data[i + 1];
    result.data[i + 2] = imageData.data[i + 2];
    result.data[i + 3] = mask.data[i + 3];
  }

  ctx.putImageData(result, 0, 0);

  return canvas;
}

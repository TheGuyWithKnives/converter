export interface InstructionEffect {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  sharpness?: number;
  denoise?: boolean;
}

const DANGEROUS_PATTERNS = [
  /system[\s\u200B-\u200D\uFEFF]*:/gi,
  /ignore[\s\u200B-\u200D\uFEFF]*:/gi,
  /forget[\s\u200B-\u200D\uFEFF]*(previous|all|everything)/gi,
  /previous[\s\u200B-\u200D\uFEFF]*instructions?/gi,
  /new[\s\u200B-\u200D\uFEFF]*instructions?[\s\u200B-\u200D\uFEFF]*:/gi,
  /you[\s\u200B-\u200D\uFEFF]*are[\s\u200B-\u200D\uFEFF]*(now|a)/gi,
  /act[\s\u200B-\u200D\uFEFF]*as[\s\u200B-\u200D\uFEFF]*(if|a)/gi,
  /pretend[\s\u200B-\u200D\uFEFF]*(to|you)/gi,
  /<script[^>]*>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /eval\s*\(/gi,
  /expression\s*\(/gi,
];

const ALLOWED_CHARS_REGEX = /^[a-zA-Z0-9\sáčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ.,!?%\-+()]+$/;

export function sanitizeInstructions(instructions: string): string {
  if (!instructions || typeof instructions !== 'string') {
    return '';
  }

  if (instructions.length > 2000) {
    throw new Error('Instructions too long (max 2000 characters)');
  }

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(instructions)) {
      console.warn('Dangerous pattern detected in instructions:', pattern);
      throw new Error('Invalid instructions: contains forbidden patterns');
    }
  }

  let sanitized = instructions
    .replace(/[<>{}[\]\\`|~@#$^&*_=;:'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (sanitized.length < 3) {
    return '';
  }

  if (!ALLOWED_CHARS_REGEX.test(sanitized)) {
    console.warn('Instructions contain disallowed characters');
    throw new Error('Instructions contain invalid characters');
  }

  return sanitized;
}

export function parseInstructions(instructions: string): InstructionEffect {
  const sanitized = sanitizeInstructions(instructions);
  const lower = sanitized.toLowerCase();
  const effect: InstructionEffect = {};

  let effectCount = 0;

  if (lower.includes('světlejší') || lower.includes('světlý') || lower.includes('brighten')) {
    effect.brightness = 1.2;
    effectCount++;
  }
  if (lower.includes('tmavší') || lower.includes('tmavý') || lower.includes('darken')) {
    effect.brightness = 0.8;
    effectCount++;
  }

  if (lower.includes('více kontrastu') || lower.includes('kontrastní') || lower.includes('contrast')) {
    effect.contrast = 1.3;
    effectCount++;
  }
  if (lower.includes('méně kontrastu') || lower.includes('měkký')) {
    effect.contrast = 0.7;
    effectCount++;
  }

  if (lower.includes('sytější') || lower.includes('barevný') || lower.includes('saturate')) {
    effect.saturation = 1.4;
    effectCount++;
  }
  if (lower.includes('nenasycený') || lower.includes('šedivý') || lower.includes('desaturate')) {
    effect.saturation = 0.6;
    effectCount++;
  }

  if (lower.includes('ostřejší') || lower.includes('ostrý') || lower.includes('sharp')) {
    effect.sharpness = 1.5;
    effectCount++;
  }

  if (lower.includes('vyhlazený') || lower.includes('čistý') || lower.includes('denoise')) {
    effect.denoise = true;
    effectCount++;
  }

  if (
    lower.includes('vysoká kvalita') ||
    lower.includes('detailní') ||
    lower.includes('high quality') ||
    lower.includes('detailed')
  ) {
    effect.sharpness = 1.3;
    effect.contrast = 1.1;
    effectCount++;
  }

  if (effectCount > 5) {
    throw new Error('Příliš mnoho efektů najednou (max 5)');
  }

  return effect;
}

export async function applyInstructionsToImage(
  file: File,
  instructions: string
): Promise<{ file: File; url: string }> {
  console.log('applyInstructionsToImage - Input instructions:', instructions);

  const sanitized = sanitizeInstructions(instructions);

  if (!sanitized.trim()) {
    console.log('applyInstructionsToImage - No instructions, returning original');
    return { file, url: URL.createObjectURL(file) };
  }

  const effects = parseInstructions(sanitized);
  console.log('applyInstructionsToImage - Parsed effects:', effects);

  if (Object.keys(effects).length === 0) {
    console.log('applyInstructionsToImage - No effects parsed, returning original');
    return { file, url: URL.createObjectURL(file) };
  }

  console.log('applyInstructionsToImage - Applying effects to image...');

  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  canvas.width = img.width;
  canvas.height = img.height;

  const cssFilter = buildCSSFilter(effects);
  console.log('applyInstructionsToImage - CSS Filter:', cssFilter);
  ctx.filter = cssFilter;
  ctx.drawImage(img, 0, 0);

  ctx.filter = 'none';

  if (effects.sharpness && effects.sharpness > 1) {
    console.log('applyInstructionsToImage - Applying sharpness:', effects.sharpness);
    applySharpening(ctx, canvas.width, canvas.height, effects.sharpness);
  }

  if (effects.denoise) {
    console.log('applyInstructionsToImage - Applying denoising');
    applyDenoising(ctx, canvas.width, canvas.height);
  }

  console.log('applyInstructionsToImage - Converting canvas to blob...');

  return new Promise((resolve, reject) => {
    let resolved = false;

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error('Image processing timeout after 10 seconds'));
      }
    }, 10000);

    canvas.toBlob((blob) => {
      if (resolved) {
        console.warn('Blob callback called after timeout');
        return;
      }

      clearTimeout(timeoutId);
      resolved = true;

      if (!blob) {
        console.error('applyInstructionsToImage - Failed to create blob');
        reject(new Error('Failed to process image'));
        return;
      }

      const processedFile = new File([blob], file.name, { type: file.type });
      const url = URL.createObjectURL(processedFile);
      console.log('applyInstructionsToImage - Success! File processed:', processedFile.name);
      resolve({ file: processedFile, url });
    }, file.type, 0.95);
  });
}

function buildCSSFilter(effects: InstructionEffect): string {
  const filters: string[] = [];

  if (effects.brightness !== undefined) {
    filters.push(`brightness(${effects.brightness})`);
  }

  if (effects.contrast !== undefined) {
    filters.push(`contrast(${effects.contrast})`);
  }

  if (effects.saturation !== undefined) {
    filters.push(`saturate(${effects.saturation})`);
  }

  return filters.join(' ') || 'none';
}

function applySharpening(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number
) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const tempData = new Uint8ClampedArray(data);

  const amount = (intensity - 1) * 2;

  const kernel = [
    0, -amount, 0,
    -amount, 1 + 4 * amount, -amount,
    0, -amount, 0
  ];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            const kernelIdx = (ky + 1) * 3 + (kx + 1);
            sum += tempData[idx] * kernel[kernelIdx];
          }
        }
        const idx = (y * width + x) * 4 + c;
        data[idx] = Math.max(0, Math.min(255, sum));
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function applyDenoising(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const tempData = new Uint8ClampedArray(data);

  const radius = 1;

  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        let count = 0;

        for (let ky = -radius; ky <= radius; ky++) {
          for (let kx = -radius; kx <= radius; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += tempData[idx];
            count++;
          }
        }

        const idx = (y * width + x) * 4 + c;
        data[idx] = sum / count;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    const timeoutId = setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load timeout after 30 seconds'));
    }, 30000);

    img.onload = () => {
      clearTimeout(timeoutId);
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

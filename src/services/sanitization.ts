export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
}

export function sanitizeString(input: string, maxLength: number = 1000): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
    .substring(0, maxLength);
}

export function sanitizeInstructions(instructions: string): string {
  const sanitized = instructions
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();

  if (sanitized.length > 5000) {
    throw new Error('Instructions too long (maximum 5000 characters)');
  }

  return sanitized;
}

export function sanitizeNumber(
  value: any,
  min: number,
  max: number,
  defaultValue: number
): number {
  const num = Number(value);

  if (isNaN(num) || !isFinite(num)) {
    return defaultValue;
  }

  return Math.max(min, Math.min(max, num));
}

export function sanitizeURL(url: string): string | null {
  try {
    const parsedUrl = new URL(url);

    const allowedProtocols = ['http:', 'https:', 'data:', 'blob:'];
    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      console.warn(`Invalid protocol: ${parsedUrl.protocol}`);
      return null;
    }

    if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
      const hostname = parsedUrl.hostname.toLowerCase();

      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.16.')
      ) {
        console.warn(`Blocked private network URL: ${hostname}`);
        return null;
      }
    }

    return parsedUrl.toString();
  } catch (error) {
    console.error('Invalid URL:', error);
    return null;
  }
}

export function sanitizeImageFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP`,
    };
  }

  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum: 10MB`,
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty',
    };
  }

  const filename = file.name.toLowerCase();
  const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.php', '.jsp', '.asp'];
  if (suspiciousExtensions.some(ext => filename.endsWith(ext))) {
    return {
      valid: false,
      error: 'Suspicious file extension detected',
    };
  }

  return { valid: true };
}

export function sanitizeQualityPreset(preset: any): 'fast' | 'quality' | 'ultra' {
  const validPresets = ['fast', 'quality', 'ultra'];

  if (typeof preset === 'string' && validPresets.includes(preset)) {
    return preset as 'fast' | 'quality' | 'ultra';
  }

  return 'quality';
}

export function sanitizeMeshParams(params: any): {
  resolution: number;
  depthScale: number;
  smoothness: number;
} {
  return {
    resolution: sanitizeNumber(params?.resolution, 1, 10, 3),
    depthScale: sanitizeNumber(params?.depthScale, 0.1, 10, 3.0),
    smoothness: sanitizeNumber(params?.smoothness, 0, 1, 0.5),
  };
}

export function validateMeshComplexity(
  vertexCount: number,
  faceCount: number
): { valid: boolean; warning?: string } {
  const MAX_VERTICES = 500000;
  const MAX_FACES = 1000000;
  const WARN_VERTICES = 100000;
  const WARN_FACES = 200000;

  if (vertexCount > MAX_VERTICES || faceCount > MAX_FACES) {
    return {
      valid: false,
      warning: `Mesh too complex. Vertices: ${vertexCount}/${MAX_VERTICES}, Faces: ${faceCount}/${MAX_FACES}`,
    };
  }

  if (vertexCount > WARN_VERTICES || faceCount > WARN_FACES) {
    return {
      valid: true,
      warning: `High mesh complexity. May affect performance. Vertices: ${vertexCount}, Faces: ${faceCount}`,
    };
  }

  return { valid: true };
}

export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  allowedKeys: (keyof T)[]
): Partial<T> {
  const sanitized: Partial<T> = {};

  for (const key of allowedKeys) {
    if (key in obj) {
      sanitized[key] = obj[key];
    }
  }

  return sanitized;
}

export function escapeHTML(str: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return str.replace(/[&<>"'\/]/g, char => htmlEscapes[char]);
}

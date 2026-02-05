import type { Point, BrushSettings, FilterType } from './editorTypes';

export function createLayer(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function drawBrushStroke(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  brush: BrushSettings,
  isEraser = false
) {
  const dist = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
  const steps = Math.max(Math.ceil(dist / (brush.size * 0.25)), 1);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    drawBrushDot(ctx, x, y, brush, isEraser);
  }
}

function drawBrushDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  brush: BrushSettings,
  isEraser: boolean
) {
  ctx.save();

  if (isEraser) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = brush.opacity / 100;
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = brush.opacity / 100;
  }

  const radius = brush.size / 2;

  if (brush.hardness >= 90) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = isEraser ? 'rgba(0,0,0,1)' : brush.color;
    ctx.fill();
  } else {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    const innerStop = brush.hardness / 100;
    const color = isEraser ? '0,0,0' : hexToRgb(brush.color);
    gradient.addColorStop(0, `rgba(${color}, 1)`);
    gradient.addColorStop(innerStop, `rgba(${color}, 1)`);
    gradient.addColorStop(1, `rgba(${color}, 0)`);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  ctx.restore();
}

export function floodFill(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  fillColor: string,
  tolerance: number = 32
) {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const data = imageData.data;
  const w = imageData.width;
  const h = imageData.height;

  const sx = Math.floor(startX);
  const sy = Math.floor(startY);
  if (sx < 0 || sx >= w || sy < 0 || sy >= h) return;

  const startIdx = (sy * w + sx) * 4;
  const startR = data[startIdx];
  const startG = data[startIdx + 1];
  const startB = data[startIdx + 2];
  const startA = data[startIdx + 3];

  const fill = hexToRgbArray(fillColor);
  if (
    startR === fill[0] && startG === fill[1] &&
    startB === fill[2] && startA === 255
  ) return;

  const stack: [number, number][] = [[sx, sy]];
  const visited = new Uint8Array(w * h);

  const matches = (idx: number) => {
    return (
      Math.abs(data[idx] - startR) <= tolerance &&
      Math.abs(data[idx + 1] - startG) <= tolerance &&
      Math.abs(data[idx + 2] - startB) <= tolerance &&
      Math.abs(data[idx + 3] - startA) <= tolerance
    );
  };

  while (stack.length > 0) {
    const [cx, cy] = stack.pop()!;
    const pi = cy * w + cx;
    if (visited[pi]) continue;
    visited[pi] = 1;

    const idx = pi * 4;
    if (!matches(idx)) continue;

    data[idx] = fill[0];
    data[idx + 1] = fill[1];
    data[idx + 2] = fill[2];
    data[idx + 3] = 255;

    if (cx > 0) stack.push([cx - 1, cy]);
    if (cx < w - 1) stack.push([cx + 1, cy]);
    if (cy > 0) stack.push([cx, cy - 1]);
    if (cy < h - 1) stack.push([cx, cy + 1]);
  }

  ctx.putImageData(imageData, 0, 0);
}

export function drawShape(
  ctx: CanvasRenderingContext2D,
  type: string,
  start: Point,
  end: Point,
  strokeColor: string,
  fillColor: string,
  strokeWidth: number,
  filled: boolean
) {
  ctx.save();
  ctx.lineWidth = strokeWidth;
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = fillColor;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (type === 'rectangle') {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.abs(end.x - start.x);
    const h = Math.abs(end.y - start.y);
    if (filled) ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
  } else if (type === 'circle') {
    const cx = (start.x + end.x) / 2;
    const cy = (start.y + end.y) / 2;
    const rx = Math.abs(end.x - start.x) / 2;
    const ry = Math.abs(end.y - start.y) / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    if (filled) ctx.fill();
    ctx.stroke();
  } else if (type === 'line') {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  } else if (type === 'arrow') {
    const headLen = Math.max(strokeWidth * 4, 12);
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - headLen * Math.cos(angle - Math.PI / 6),
      end.y - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      end.x - headLen * Math.cos(angle + Math.PI / 6),
      end.y - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = strokeColor;
    ctx.fill();
  }

  ctx.restore();
}

export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontFamily: string,
  fontSize: number,
  fontWeight: string,
  fontStyle: string,
  color: string,
  align: CanvasTextAlign
) {
  ctx.save();
  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';

  const lines = text.split('\n');
  lines.forEach((line, i) => {
    ctx.fillText(line, x, y + i * fontSize * 1.3);
  });
  ctx.restore();
}

export function applyBlurBrush(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  strength: number
) {
  const r = Math.ceil(radius);
  const sx = Math.max(0, Math.floor(x - r));
  const sy = Math.max(0, Math.floor(y - r));
  const sw = Math.min(ctx.canvas.width - sx, r * 2);
  const sh = Math.min(ctx.canvas.height - sy, r * 2);
  if (sw <= 0 || sh <= 0) return;

  const imageData = ctx.getImageData(sx, sy, sw, sh);
  const data = imageData.data;
  const w = imageData.width;
  const k = Math.max(1, Math.floor(strength));

  for (let pass = 0; pass < k; pass++) {
    for (let py = 1; py < imageData.height - 1; py++) {
      for (let px = 1; px < w - 1; px++) {
        const dx = px - r;
        const dy = py - r;
        if (dx * dx + dy * dy > r * r) continue;

        const idx = (py * w + px) * 4;
        for (let c = 0; c < 3; c++) {
          data[idx + c] = (
            data[idx + c] * 4 +
            data[idx - 4 + c] +
            data[idx + 4 + c] +
            data[((py - 1) * w + px) * 4 + c] +
            data[((py + 1) * w + px) * 4 + c]
          ) / 8;
        }
      }
    }
  }

  ctx.putImageData(imageData, sx, sy);
}

export function applyFilter(
  ctx: CanvasRenderingContext2D,
  filter: FilterType,
  intensity: number = 100
) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const t = intensity / 100;

  switch (filter) {
    case 'grayscale':
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        data[i] = data[i] + (gray - data[i]) * t;
        data[i + 1] = data[i + 1] + (gray - data[i + 1]) * t;
        data[i + 2] = data[i + 2] + (gray - data[i + 2]) * t;
      }
      break;

    case 'sepia':
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const sr = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
        const sg = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
        const sb = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
        data[i] = r + (sr - r) * t;
        data[i + 1] = g + (sg - g) * t;
        data[i + 2] = b + (sb - b) * t;
      }
      break;

    case 'invert':
      for (let i = 0; i < data.length; i += 4) {
        data[i] = data[i] + (255 - data[i] * 2) * t;
        data[i + 1] = data[i + 1] + (255 - data[i + 1] * 2) * t;
        data[i + 2] = data[i + 2] + (255 - data[i + 2] * 2) * t;
      }
      break;

    case 'noise':
      for (let i = 0; i < data.length; i += 4) {
        const n = (Math.random() - 0.5) * intensity * 2.55;
        data[i] = Math.max(0, Math.min(255, data[i] + n));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
      }
      break;

    case 'posterize': {
      const levels = Math.max(2, Math.floor(10 - (intensity / 100) * 8));
      const step = 255 / (levels - 1);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.round(data[i] / step) * step;
        data[i + 1] = Math.round(data[i + 1] / step) * step;
        data[i + 2] = Math.round(data[i + 2] / step) * step;
      }
      break;
    }

    case 'emboss':
      applyConvolution(data, w, h, [
        -2, -1, 0,
        -1, 1, 1,
        0, 1, 2,
      ], t);
      break;

    case 'sharpen':
      applyConvolution(data, w, h, [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0,
      ], t);
      break;

    case 'blur':
      applyConvolution(data, w, h, [
        1 / 9, 1 / 9, 1 / 9,
        1 / 9, 1 / 9, 1 / 9,
        1 / 9, 1 / 9, 1 / 9,
      ], t);
      break;

    case 'vignette':
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const dx = (x - w / 2) / (w / 2);
          const dy = (y - h / 2) / (h / 2);
          const dist = Math.sqrt(dx * dx + dy * dy);
          const vignette = 1 - Math.pow(dist, 2) * 0.5 * t;
          const idx = (y * w + x) * 4;
          data[idx] *= vignette;
          data[idx + 1] *= vignette;
          data[idx + 2] *= vignette;
        }
      }
      break;
  }

  ctx.putImageData(imageData, 0, 0);
}

function applyConvolution(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  kernel: number[],
  blend: number
) {
  const copy = new Uint8ClampedArray(data);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * w + (x + kx)) * 4 + c;
            sum += copy[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        const idx = (y * w + x) * 4 + c;
        data[idx] = Math.max(0, Math.min(255, data[idx] + (sum - data[idx]) * blend));
      }
    }
  }
}

export function applyColorAdjustments(
  ctx: CanvasRenderingContext2D,
  brightness: number,
  contrast: number,
  saturation: number,
  hue: number
) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i + 1], b = data[i + 2];

    const bFactor = brightness / 100;
    r *= bFactor;
    g *= bFactor;
    b *= bFactor;

    const cFactor = (contrast / 100);
    r = ((r / 255 - 0.5) * cFactor + 0.5) * 255;
    g = ((g / 255 - 0.5) * cFactor + 0.5) * 255;
    b = ((b / 255 - 0.5) * cFactor + 0.5) * 255;

    const gray = r * 0.299 + g * 0.587 + b * 0.114;
    const sFactor = saturation / 100;
    r = gray + (r - gray) * sFactor;
    g = gray + (g - gray) * sFactor;
    b = gray + (b - gray) * sFactor;

    if (hue !== 0) {
      const [rh, gh, bh] = rotateHue(r, g, b, hue);
      r = rh; g = gh; b = bh;
    }

    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }

  ctx.putImageData(imageData, 0, 0);
}

function rotateHue(r: number, g: number, b: number, deg: number): [number, number, number] {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const matrix = [
    0.213 + cos * 0.787 - sin * 0.213,
    0.715 - cos * 0.715 - sin * 0.715,
    0.072 - cos * 0.072 + sin * 0.928,
    0.213 - cos * 0.213 + sin * 0.143,
    0.715 + cos * 0.285 + sin * 0.140,
    0.072 - cos * 0.072 - sin * 0.283,
    0.213 - cos * 0.213 - sin * 0.787,
    0.715 - cos * 0.715 + sin * 0.715,
    0.072 + cos * 0.928 + sin * 0.072,
  ];
  return [
    r * matrix[0] + g * matrix[1] + b * matrix[2],
    r * matrix[3] + g * matrix[4] + b * matrix[5],
    r * matrix[6] + g * matrix[7] + b * matrix[8],
  ];
}

function hexToRgb(hex: string): string {
  const arr = hexToRgbArray(hex);
  return `${arr[0]},${arr[1]},${arr[2]}`;
}

function hexToRgbArray(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ];
}

export function getPixelColor(ctx: CanvasRenderingContext2D, x: number, y: number): string {
  const pixel = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
  return `#${pixel[0].toString(16).padStart(2, '0')}${pixel[1].toString(16).padStart(2, '0')}${pixel[2].toString(16).padStart(2, '0')}`;
}

export function generateCheckerboard(width: number, height: number, size: number = 8): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      ctx.fillStyle = ((x / size + y / size) % 2 === 0) ? '#2a2a2a' : '#1a1a1a';
      ctx.fillRect(x, y, size, size);
    }
  }
  return canvas;
}

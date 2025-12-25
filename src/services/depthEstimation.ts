import * as tf from '@tensorflow/tfjs';

export interface DepthResult {
  depthMap: tf.Tensor3D;
  width: number;
  height: number;
}

export async function initializeDepthEstimator(
  onProgress?: (progress: number) => void
): Promise<void> {
  if (onProgress) onProgress(0.1);

  await tf.ready();
  await tf.setBackend('webgl');

  if (onProgress) onProgress(1.0);
}

export async function estimateDepth(
  imageElement: HTMLImageElement | HTMLCanvasElement,
  mask?: ImageData,
  onProgress?: (progress: number) => void
): Promise<DepthResult> {
  await initializeDepthEstimator();

  if (onProgress) onProgress(0.2);

  const canvas = document.createElement('canvas');
  canvas.width = imageElement.width;
  canvas.height = imageElement.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get context');

  ctx.drawImage(imageElement, 0, 0);

  if (onProgress) onProgress(0.3);

  let imageTensor: tf.Tensor3D | null = null;
  let grayscale: tf.Tensor3D | null = null;
  let normalized: tf.Tensor3D | null = null;
  let sobelX: tf.Tensor4D | null = null;
  let sobelY: tf.Tensor4D | null = null;
  let input: tf.Tensor4D | null = null;
  let gradX: tf.Tensor4D | null = null;
  let gradY: tf.Tensor4D | null = null;
  let gradient: tf.Tensor4D | null = null;
  let brightness: tf.Tensor4D | null = null;
  let depthFromBrightness: tf.Tensor4D | null = null;
  let laplacian: tf.Tensor4D | null = null;
  let detail: tf.Tensor4D | null = null;
  let detailNorm: tf.Tensor4D | null = null;
  let combined: tf.Tensor4D | null = null;
  let blurred: tf.Tensor4D | null = null;
  let depthEstimate: tf.Tensor3D | null = null;
  let smoothed: tf.Tensor3D | null = null;

  try {
    imageTensor = tf.browser.fromPixels(canvas);
    grayscale = tf.image.rgbToGrayscale(imageTensor);
    normalized = grayscale.div(255.0);

    if (onProgress) onProgress(0.4);

    sobelX = tf.tensor2d([
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1]
    ], [3, 3]).expandDims(2).expandDims(3) as tf.Tensor4D;

    sobelY = tf.tensor2d([
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1]
    ], [3, 3]).expandDims(2).expandDims(3) as tf.Tensor4D;

    input = normalized.expandDims(0) as tf.Tensor4D;

    if (onProgress) onProgress(0.5);

    gradX = tf.conv2d(input, sobelX, 1, 'same');
    gradY = tf.conv2d(input, sobelY, 1, 'same');

    gradient = tf.sqrt(tf.add(tf.square(gradX), tf.square(gradY)));

    if (onProgress) onProgress(0.6);

    brightness = normalized.expandDims(0) as tf.Tensor4D;

    depthFromBrightness = tf.sigmoid(
      tf.sub(brightness, 0.5).mul(8)
    ) as tf.Tensor4D;

    if (onProgress) onProgress(0.65);

    laplacian = tf.tensor2d([
      [0, -1, 0],
      [-1, 4, -1],
      [0, -1, 0]
    ], [3, 3]).expandDims(2).expandDims(3) as tf.Tensor4D;

    detail = tf.conv2d(input, laplacian, 1, 'same');
    detailNorm = tf.abs(detail) as tf.Tensor4D;

    if (onProgress) onProgress(0.7);

    combined = tf.add(
      tf.add(
        gradient.mul(0.3),
        depthFromBrightness.mul(0.5)
      ),
      detailNorm.mul(0.2)
    ) as tf.Tensor4D;

    blurred = tf.avgPool(combined, 5, 1, 'same');

    laplacian.dispose();
    laplacian = null;
    detail.dispose();
    detail = null;
    detailNorm.dispose();
    detailNorm = null;

    depthEstimate = blurred.squeeze([0]) as tf.Tensor3D;

    if (mask) {
      try {
        const maskCanvas = createCanvasFromImageData(mask);
        const maskTensor = tf.browser.fromPixels(maskCanvas);
        const maskGray = tf.image.rgbToGrayscale(maskTensor).div(255.0);
        const maskReshaped = maskGray.squeeze([2]);

        const enhancedDepth = depthEstimate.mul(maskReshaped) as tf.Tensor3D;
        depthEstimate.dispose();
        depthEstimate = enhancedDepth;
        maskTensor.dispose();
        maskGray.dispose();
        maskReshaped.dispose();
      } catch (error) {
        console.warn('Failed to apply mask to depth map:', error);
      }
    }

    if (onProgress) onProgress(0.85);

    smoothed = tf.avgPool(
      depthEstimate.expandDims(0) as tf.Tensor4D,
      [11, 11],
      [1, 1],
      'same'
    ).squeeze([0]) as tf.Tensor3D;

    if (onProgress) onProgress(0.95);

    imageTensor.dispose();
    grayscale.dispose();
    normalized.dispose();
    sobelX.dispose();
    sobelY.dispose();
    input.dispose();
    gradX.dispose();
    gradY.dispose();
    gradient.dispose();
    brightness.dispose();
    depthFromBrightness.dispose();
    combined.dispose();
    blurred.dispose();
    depthEstimate.dispose();

    if (onProgress) onProgress(1.0);

    return {
      depthMap: smoothed,
      width: imageElement.width,
      height: imageElement.height,
    };
  } catch (error) {
    imageTensor?.dispose();
    grayscale?.dispose();
    normalized?.dispose();
    sobelX?.dispose();
    sobelY?.dispose();
    input?.dispose();
    gradX?.dispose();
    gradY?.dispose();
    gradient?.dispose();
    brightness?.dispose();
    depthFromBrightness?.dispose();
    laplacian?.dispose();
    detail?.dispose();
    detailNorm?.dispose();
    combined?.dispose();
    blurred?.dispose();
    depthEstimate?.dispose();
    smoothed?.dispose();

    throw error;
  }
}

function createCanvasFromImageData(imageData: ImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2d context');
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function disposeEstimator(): void {
  tf.disposeVariables();
}

export async function depthMapToArray(depthMap: tf.Tensor3D): Promise<Float32Array> {
  const data = await depthMap.data();
  return new Float32Array(data);
}

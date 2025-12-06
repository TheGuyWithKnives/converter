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

  const imageTensor = tf.browser.fromPixels(canvas);
  const grayscale = tf.image.rgbToGrayscale(imageTensor);
  const normalized = grayscale.div(255.0);

  if (onProgress) onProgress(0.4);

  const sobelX = tf.tensor2d([
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1]
  ], [3, 3]).expandDims(2).expandDims(3);

  const sobelY = tf.tensor2d([
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1]
  ], [3, 3]).expandDims(2).expandDims(3);

  const input = normalized.expandDims(0);

  if (onProgress) onProgress(0.5);

  const gradX = tf.conv2d(input as tf.Tensor4D, sobelX as tf.Tensor4D, 1, 'same');
  const gradY = tf.conv2d(input as tf.Tensor4D, sobelY as tf.Tensor4D, 1, 'same');

  const gradient = tf.sqrt(tf.add(tf.square(gradX), tf.square(gradY)));

  if (onProgress) onProgress(0.6);

  const brightness = normalized.expandDims(0);

  const depthFromBrightness = tf.sigmoid(
    tf.sub(brightness, 0.5).mul(8)
  );

  if (onProgress) onProgress(0.65);

  const laplacian = tf.tensor2d([
    [0, -1, 0],
    [-1, 4, -1],
    [0, -1, 0]
  ], [3, 3]).expandDims(2).expandDims(3);

  const detail = tf.conv2d(input as tf.Tensor4D, laplacian as tf.Tensor4D, 1, 'same');
  const detailNorm = tf.abs(detail);

  if (onProgress) onProgress(0.7);

  const combined = tf.add(
    tf.add(
      gradient.mul(0.3),
      depthFromBrightness.mul(0.5)
    ),
    detailNorm.mul(0.2)
  );

  const blurred = tf.avgPool(combined as tf.Tensor4D, 5, 1, 'same');

  laplacian.dispose();
  detail.dispose();
  detailNorm.dispose();

  let depthEstimate = blurred.squeeze([0]);

  if (mask) {
    try {
      const maskCanvas = createCanvasFromImageData(mask);
      const maskTensor = tf.browser.fromPixels(maskCanvas);
      const maskGray = tf.image.rgbToGrayscale(maskTensor).div(255.0);
      const maskReshaped = maskGray.squeeze([2]);

      const enhancedDepth = depthEstimate.mul(maskReshaped);
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

  const smoothed = tf.avgPool(
    depthEstimate.expandDims(0) as tf.Tensor4D,
    [11, 11],
    [1, 1],
    'same'
  ).squeeze([0]);

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
    depthMap: smoothed as tf.Tensor3D,
    width: imageElement.width,
    height: imageElement.height,
  };
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

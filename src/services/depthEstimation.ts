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

  const tensors: tf.Tensor[] = [];

  try {
    const imageTensor = tf.browser.fromPixels(canvas);
    tensors.push(imageTensor);

    const grayscale = tf.image.rgbToGrayscale(imageTensor);
    tensors.push(grayscale);

    const normalized = grayscale.div(255.0) as tf.Tensor3D;
    tensors.push(normalized);

    if (onProgress) onProgress(0.4);

    const sobelX = tf.tensor2d([
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1]
    ], [3, 3]).expandDims(2).expandDims(3) as tf.Tensor4D;
    tensors.push(sobelX);

    const sobelY = tf.tensor2d([
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1]
    ], [3, 3]).expandDims(2).expandDims(3) as tf.Tensor4D;
    tensors.push(sobelY);

    const input = normalized.expandDims(0) as tf.Tensor4D;
    tensors.push(input);

    if (onProgress) onProgress(0.5);

    const gradX = tf.conv2d(input, sobelX, 1, 'same') as tf.Tensor4D;
    tensors.push(gradX);

    const gradY = tf.conv2d(input, sobelY, 1, 'same') as tf.Tensor4D;
    tensors.push(gradY);

    const gradXSquared = tf.square(gradX);
    tensors.push(gradXSquared);

    const gradYSquared = tf.square(gradY);
    tensors.push(gradYSquared);

    const gradSum = tf.add(gradXSquared, gradYSquared);
    tensors.push(gradSum);

    const gradient = tf.sqrt(gradSum) as tf.Tensor4D;
    tensors.push(gradient);

    if (onProgress) onProgress(0.6);

    const brightness = normalized.expandDims(0) as tf.Tensor4D;
    tensors.push(brightness);

    const brightnessSub = tf.sub(brightness, 0.5);
    tensors.push(brightnessSub);

    const brightnessMul = brightnessSub.mul(8);
    tensors.push(brightnessMul);

    const depthFromBrightness = tf.sigmoid(brightnessMul) as tf.Tensor4D;
    tensors.push(depthFromBrightness);

    if (onProgress) onProgress(0.65);

    const laplacian = tf.tensor2d([
      [0, -1, 0],
      [-1, 4, -1],
      [0, -1, 0]
    ], [3, 3]).expandDims(2).expandDims(3) as tf.Tensor4D;
    tensors.push(laplacian);

    const detail = tf.conv2d(input, laplacian, 1, 'same') as tf.Tensor4D;
    tensors.push(detail);

    const detailNorm = tf.abs(detail) as tf.Tensor4D;
    tensors.push(detailNorm);

    if (onProgress) onProgress(0.7);

    const gradientMul = gradient.mul(0.3);
    tensors.push(gradientMul);

    const brightnessMul2 = depthFromBrightness.mul(0.5);
    tensors.push(brightnessMul2);

    const detailMul = detailNorm.mul(0.2);
    tensors.push(detailMul);

    const add1 = tf.add(gradientMul, brightnessMul2);
    tensors.push(add1);

    const combined = tf.add(add1, detailMul) as tf.Tensor4D;
    tensors.push(combined);

    const blurred = tf.avgPool(combined, 5, 1, 'same') as tf.Tensor4D;
    tensors.push(blurred);

    let depthEstimate = blurred.squeeze([0]) as tf.Tensor3D;
    tensors.push(depthEstimate);

    if (mask) {
      try {
        const maskCanvas = createCanvasFromImageData(mask);
        const maskTensor = tf.browser.fromPixels(maskCanvas);
        tensors.push(maskTensor);

        const maskGray = tf.image.rgbToGrayscale(maskTensor).div(255.0) as tf.Tensor3D;
        tensors.push(maskGray);

        const maskReshaped = maskGray.squeeze([2]) as tf.Tensor2D;
        tensors.push(maskReshaped);

        const enhancedDepth = depthEstimate.mul(maskReshaped) as tf.Tensor3D;
        tensors.push(enhancedDepth);

        depthEstimate = enhancedDepth;
      } catch (error) {
        console.warn('Failed to apply mask to depth map:', error);
      }
    }

    if (onProgress) onProgress(0.85);

    const depthExpanded = depthEstimate.expandDims(0) as tf.Tensor4D;
    tensors.push(depthExpanded);

    const smoothed = tf.avgPool(
      depthExpanded,
      [11, 11],
      [1, 1],
      'same'
    ).squeeze([0]) as tf.Tensor3D;

    if (onProgress) onProgress(0.95);

    tensors.forEach(tensor => {
      if (tensor !== smoothed) {
        try {
          tensor.dispose();
        } catch (e) {
          console.warn('Failed to dispose tensor:', e);
        }
      }
    });

    if (onProgress) onProgress(1.0);

    return {
      depthMap: smoothed,
      width: imageElement.width,
      height: imageElement.height,
    };
  } catch (error) {
    tensors.forEach(tensor => {
      try {
        tensor.dispose();
      } catch (e) {
        console.warn('Failed to dispose tensor:', e);
      }
    });

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

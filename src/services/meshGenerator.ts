import * as THREE from 'three';
import { subdivideMesh, smoothMesh } from './meshSmoothing';
import { validateMeshComplexity } from './sanitization';

export interface MeshGenerationParams {
  resolution: number;
  depthScale: number;
  smoothness: number;
}

export async function generateMeshFromDepth(
  imageUrl: string,
  depthData: Float32Array,
  width: number,
  height: number,
  params: MeshGenerationParams,
  mask?: ImageData
): Promise<THREE.Mesh> {
  const { resolution, depthScale, smoothness } = params;

  const segmentsX = Math.floor(width / resolution);
  const segmentsY = Math.floor(height / resolution);

  const texture = await loadTexture(imageUrl);
  const img = await loadImage(imageUrl);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get context');
  ctx.drawImage(img, 0, 0, width, height);

  const heightMap: (number | null)[][] = [];
  for (let i = 0; i <= segmentsY; i++) {
    heightMap[i] = [];
    for (let j = 0; j <= segmentsX; j++) {
      const imageX = Math.min(Math.floor((j / segmentsX) * width), width - 1);
      const imageY = Math.min(Math.floor((i / segmentsY) * height), height - 1);
      const depthIndex = imageY * width + imageX;

      let isVisible = true;
      if (mask) {
        const maskIdx = (imageY * width + imageX) * 4;
        if (maskIdx + 3 < mask.data.length) {
          isVisible = mask.data[maskIdx + 3] > 128;
        } else {
          isVisible = false;
        }
      }

      if (!isVisible) {
        heightMap[i][j] = null;
        continue;
      }

      let depth = depthData[depthIndex] || 0;

      if (smoothness > 0 && i > 0 && i < segmentsY && j > 0 && j < segmentsX) {
        const neighbors: number[] = [];
        const indices = [
          depthIndex - 1,
          depthIndex + 1,
          depthIndex - width,
          depthIndex + width
        ];

        for (const idx of indices) {
          if (idx >= 0 && idx < depthData.length && depthData[idx] !== undefined) {
            neighbors.push(depthData[idx]);
          }
        }

        if (neighbors.length > 0) {
          const avg = neighbors.reduce((a, b) => a + b, 0) / neighbors.length;
          depth = depth * (1 - smoothness) + avg * smoothness;
        }
      }

      heightMap[i][j] = depth;
    }
  }

  const vertices: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];

  const frontVertexMap = new Map<string, number>();
  const backVertexMap = new Map<string, number>();
  let vertexIndex = 0;

  const bodyThickness = depthScale * 1.5;

  for (let i = 0; i <= segmentsY; i++) {
    for (let j = 0; j <= segmentsX; j++) {
      const depth = heightMap[i][j];
      if (depth === null) continue;

      const x = (j / segmentsX - 0.5) * 10;
      const y = -(i / segmentsY - 0.5) * 10 * (height / width);
      const depthVariation = 1.0 + (depth - 0.5) * 0.8;
      const z = depth * depthScale * depthVariation;

      vertices.push(x, y, z);
      uvs.push(j / segmentsX, i / segmentsY);
      frontVertexMap.set(`${i},${j}`, vertexIndex);
      vertexIndex++;
    }
  }

  for (let i = 0; i <= segmentsY; i++) {
    for (let j = 0; j <= segmentsX; j++) {
      const depth = heightMap[i][j];
      if (depth === null) continue;

      const x = (j / segmentsX - 0.5) * 10;
      const y = -(i / segmentsY - 0.5) * 10 * (height / width);
      const depthVariation = 1.0 + (depth - 0.5) * 0.8;
      const frontZ = depth * depthScale * depthVariation;
      const localThickness = bodyThickness * (0.6 + depth * 0.8);
      const z = frontZ - localThickness;

      vertices.push(x, y, z);
      uvs.push(j / segmentsX, i / segmentsY);
      backVertexMap.set(`${i},${j}`, vertexIndex);
      vertexIndex++;
    }
  }

  for (let i = 0; i < segmentsY; i++) {
    for (let j = 0; j < segmentsX; j++) {
      const key1 = `${i},${j}`;
      const key2 = `${i},${j + 1}`;
      const key3 = `${i + 1},${j}`;
      const key4 = `${i + 1},${j + 1}`;

      const v1 = frontVertexMap.get(key1);
      const v2 = frontVertexMap.get(key2);
      const v3 = frontVertexMap.get(key3);
      const v4 = frontVertexMap.get(key4);

      if (v1 !== undefined && v2 !== undefined && v3 !== undefined && v4 !== undefined) {
        indices.push(v1, v2, v3);
        indices.push(v2, v4, v3);
      }

      const b1 = backVertexMap.get(key1);
      const b2 = backVertexMap.get(key2);
      const b3 = backVertexMap.get(key3);
      const b4 = backVertexMap.get(key4);

      if (b1 !== undefined && b2 !== undefined && b3 !== undefined && b4 !== undefined) {
        indices.push(b1, b3, b2);
        indices.push(b2, b3, b4);
      }
    }
  }

  const boundaryEdges: Array<{i: number, j: number, dir: 'top' | 'bottom' | 'left' | 'right'}> = [];

  for (let i = 0; i <= segmentsY; i++) {
    for (let j = 0; j <= segmentsX; j++) {
      if (heightMap[i][j] === null) continue;

      if (i > 0 && heightMap[i - 1][j] === null) {
        boundaryEdges.push({i, j, dir: 'top'});
      }
      if (i < segmentsY && heightMap[i + 1][j] === null) {
        boundaryEdges.push({i, j, dir: 'bottom'});
      }
      if (j > 0 && heightMap[i][j - 1] === null) {
        boundaryEdges.push({i, j, dir: 'left'});
      }
      if (j < segmentsX && heightMap[i][j + 1] === null) {
        boundaryEdges.push({i, j, dir: 'right'});
      }

      if (i === 0 || i === segmentsY || j === 0 || j === segmentsX) {
        if (i === 0) boundaryEdges.push({i, j, dir: 'top'});
        if (i === segmentsY) boundaryEdges.push({i, j, dir: 'bottom'});
        if (j === 0) boundaryEdges.push({i, j, dir: 'left'});
        if (j === segmentsX) boundaryEdges.push({i, j, dir: 'right'});
      }
    }
  }

  for (const edge of boundaryEdges) {
    const {i, j, dir} = edge;

    if (dir === 'right' && j < segmentsX) {
      const key1 = `${i},${j}`;
      const key2 = `${i + 1},${j}`;

      const f1 = frontVertexMap.get(key1);
      const f2 = frontVertexMap.get(key2);
      const b1 = backVertexMap.get(key1);
      const b2 = backVertexMap.get(key2);

      if (f1 !== undefined && f2 !== undefined && b1 !== undefined && b2 !== undefined) {
        indices.push(f1, b1, f2);
        indices.push(f2, b1, b2);
      }
    } else if (dir === 'left' && j > 0) {
      const key1 = `${i},${j}`;
      const key2 = `${i + 1},${j}`;

      const f1 = frontVertexMap.get(key1);
      const f2 = frontVertexMap.get(key2);
      const b1 = backVertexMap.get(key1);
      const b2 = backVertexMap.get(key2);

      if (f1 !== undefined && f2 !== undefined && b1 !== undefined && b2 !== undefined) {
        indices.push(f1, f2, b1);
        indices.push(f2, b2, b1);
      }
    } else if (dir === 'bottom' && i < segmentsY) {
      const key1 = `${i},${j}`;
      const key2 = `${i},${j + 1}`;

      const f1 = frontVertexMap.get(key1);
      const f2 = frontVertexMap.get(key2);
      const b1 = backVertexMap.get(key1);
      const b2 = backVertexMap.get(key2);

      if (f1 !== undefined && f2 !== undefined && b1 !== undefined && b2 !== undefined) {
        indices.push(f1, f2, b1);
        indices.push(f2, b2, b1);
      }
    } else if (dir === 'top' && i > 0) {
      const key1 = `${i},${j}`;
      const key2 = `${i},${j + 1}`;

      const f1 = frontVertexMap.get(key1);
      const f2 = frontVertexMap.get(key2);
      const b1 = backVertexMap.get(key1);
      const b2 = backVertexMap.get(key2);

      if (f1 !== undefined && f2 !== undefined && b1 !== undefined && b2 !== undefined) {
        indices.push(f1, b1, f2);
        indices.push(f2, b1, b2);
      }
    }
  }

  if (vertices.length === 0 || indices.length === 0) {
    throw new Error('Nepodařilo se vygenerovat validní geometrii. Zkuste jiný obrázek nebo upravte parametry.');
  }

  let geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const vertexCount = vertices.length / 3;
  const faceCount = indices.length / 3;

  console.log(`Initial mesh: ${vertexCount} vertices, ${faceCount} triangles`);
  console.log(`Boundary edges: ${boundaryEdges.length}`);

  const validation = validateMeshComplexity(vertexCount, faceCount);
  if (!validation.valid) {
    throw new Error(validation.warning || 'Mesh too complex');
  }
  if (validation.warning) {
    console.warn(validation.warning);
  }

  geometry = subdivideMesh(geometry, 1);
  console.log(`After subdivision: ${geometry.attributes.position.count} vertices`);

  geometry = smoothMesh(geometry, 2, 0.4);
  console.log(`After smoothing: mesh refined`);

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    side: THREE.DoubleSide,
    metalness: 0.15,
    roughness: 0.75,
    flatShading: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = '3DModel';
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

function loadTexture(url: string): Promise<THREE.Texture> {
  return new Promise((resolve) => {
    const loader = new THREE.TextureLoader();
    loader.load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      resolve(tex);
    });
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export function optimizeMeshForPurpose(
  mesh: THREE.Mesh,
  purpose: 'print' | 'simulation' | 'visualization'
): THREE.Mesh {
  const geometry = mesh.geometry;

  switch (purpose) {
    case 'print':
      geometry.computeBoundingBox();
      if (geometry.boundingBox) {
        const size = new THREE.Vector3();
        geometry.boundingBox.getSize(size);
        const scale = 100 / Math.max(size.x, size.y, size.z);
        mesh.scale.setScalar(scale);
      }
      break;

    case 'simulation':
      break;

    case 'visualization':
      break;
  }

  return mesh;
}

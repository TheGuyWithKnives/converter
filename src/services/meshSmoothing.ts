import * as THREE from 'three';

export function subdivideMesh(geometry: THREE.BufferGeometry, iterations: number = 1): THREE.BufferGeometry {
  const positions = geometry.attributes.position.array as Float32Array;
  const indices = geometry.index?.array as Uint32Array;
  const uvs = geometry.attributes.uv?.array as Float32Array;

  if (!indices) return geometry;

  let newPositions: number[] = Array.from(positions);
  let newUVs: number[] = uvs ? Array.from(uvs) : [];
  let newIndices: number[] = Array.from(indices);

  for (let iter = 0; iter < iterations; iter++) {
    const edgeMap = new Map<string, number>();
    const nextPositions: number[] = [...newPositions];
    const nextUVs: number[] = [...newUVs];
    const nextIndices: number[] = [];

    let vertexCount = newPositions.length / 3;

    function getEdgeKey(a: number, b: number): string {
      return a < b ? `${a}_${b}` : `${b}_${a}`;
    }

    function getMidpoint(idx1: number, idx2: number): number {
      const key = getEdgeKey(idx1, idx2);

      if (edgeMap.has(key)) {
        return edgeMap.get(key)!;
      }

      const x1 = newPositions[idx1 * 3];
      const y1 = newPositions[idx1 * 3 + 1];
      const z1 = newPositions[idx1 * 3 + 2];

      const x2 = newPositions[idx2 * 3];
      const y2 = newPositions[idx2 * 3 + 1];
      const z2 = newPositions[idx2 * 3 + 2];

      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const mz = (z1 + z2) / 2;

      nextPositions.push(mx, my, mz);

      if (newUVs.length > 0) {
        const u1 = newUVs[idx1 * 2];
        const v1 = newUVs[idx1 * 2 + 1];
        const u2 = newUVs[idx2 * 2];
        const v2 = newUVs[idx2 * 2 + 1];
        nextUVs.push((u1 + u2) / 2, (v1 + v2) / 2);
      }

      edgeMap.set(key, vertexCount);
      return vertexCount++;
    }

    for (let i = 0; i < newIndices.length; i += 3) {
      const v1 = newIndices[i];
      const v2 = newIndices[i + 1];
      const v3 = newIndices[i + 2];

      const m1 = getMidpoint(v1, v2);
      const m2 = getMidpoint(v2, v3);
      const m3 = getMidpoint(v3, v1);

      nextIndices.push(v1, m1, m3);
      nextIndices.push(m1, v2, m2);
      nextIndices.push(m3, m2, v3);
      nextIndices.push(m1, m2, m3);
    }

    newPositions = nextPositions;
    newUVs = nextUVs;
    newIndices = nextIndices;
  }

  const newGeometry = new THREE.BufferGeometry();
  newGeometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));

  if (newUVs.length > 0) {
    newGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(newUVs, 2));
  }

  newGeometry.setIndex(newIndices);
  newGeometry.computeVertexNormals();

  return newGeometry;
}

export function smoothMesh(geometry: THREE.BufferGeometry, iterations: number = 1, factor: number = 0.5): THREE.BufferGeometry {
  const positions = geometry.attributes.position.array as Float32Array;
  const positionsCopy = new Float32Array(positions);

  const vertexNeighbors = new Map<number, Set<number>>();
  const indices = geometry.index?.array;

  if (!indices) return geometry;

  for (let i = 0; i < indices.length; i += 3) {
    const v1 = indices[i];
    const v2 = indices[i + 1];
    const v3 = indices[i + 2];

    if (!vertexNeighbors.has(v1)) vertexNeighbors.set(v1, new Set());
    if (!vertexNeighbors.has(v2)) vertexNeighbors.set(v2, new Set());
    if (!vertexNeighbors.has(v3)) vertexNeighbors.set(v3, new Set());

    vertexNeighbors.get(v1)!.add(v2);
    vertexNeighbors.get(v1)!.add(v3);
    vertexNeighbors.get(v2)!.add(v1);
    vertexNeighbors.get(v2)!.add(v3);
    vertexNeighbors.get(v3)!.add(v1);
    vertexNeighbors.get(v3)!.add(v2);
  }

  for (let iter = 0; iter < iterations; iter++) {
    const newPositions = new Float32Array(positions.length);

    for (let i = 0; i < positions.length / 3; i++) {
      const neighbors = vertexNeighbors.get(i);

      if (!neighbors || neighbors.size === 0) {
        newPositions[i * 3] = positionsCopy[i * 3];
        newPositions[i * 3 + 1] = positionsCopy[i * 3 + 1];
        newPositions[i * 3 + 2] = positionsCopy[i * 3 + 2];
        continue;
      }

      let avgX = 0, avgY = 0, avgZ = 0;

      for (const neighborIdx of neighbors) {
        avgX += positionsCopy[neighborIdx * 3];
        avgY += positionsCopy[neighborIdx * 3 + 1];
        avgZ += positionsCopy[neighborIdx * 3 + 2];
      }

      avgX /= neighbors.size;
      avgY /= neighbors.size;
      avgZ /= neighbors.size;

      const origX = positionsCopy[i * 3];
      const origY = positionsCopy[i * 3 + 1];
      const origZ = positionsCopy[i * 3 + 2];

      newPositions[i * 3] = origX + (avgX - origX) * factor;
      newPositions[i * 3 + 1] = origY + (avgY - origY) * factor;
      newPositions[i * 3 + 2] = origZ + (avgZ - origZ) * factor;
    }

    positionsCopy.set(newPositions);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positionsCopy, 3));
  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals();

  return geometry;
}

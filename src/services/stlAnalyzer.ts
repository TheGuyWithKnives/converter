import * as THREE from 'three';

export interface StlAnalysis {
  triangleCount: number;
  vertexCount: number;
  dimensions: { x: number; y: number; z: number };
  volume: number;
  surfaceArea: number;
  center: { x: number; y: number; z: number };
  boundingBoxVolume: number;
  fillRatio: number;
  overhangs: OverhangInfo[];
  recommendedLayerHeight: { min: number; max: number; optimal: number };
  printDifficulty: 'easy' | 'medium' | 'hard';
  estimatedSupportVolume: number;
  splitSuggestions: SplitSuggestion[];
}

export interface OverhangInfo {
  severity: 'mild' | 'moderate' | 'severe';
  angle: number;
  regionCenter: THREE.Vector3;
  triangleCount: number;
}

export interface SplitSuggestion {
  axis: 'x' | 'y' | 'z';
  position: number;
  reason: string;
}

export interface SupportConfig {
  density: 'low' | 'medium' | 'high';
  type: 'linear' | 'tree';
  overhangAngle: number;
  treeDirections: number;
  branchGap: number;
  contactDiameter: number;
}

export function analyzeStlMesh(mesh: THREE.Mesh): StlAnalysis {
  const geometry = mesh.geometry;
  if (!geometry) {
    return createEmptyAnalysis();
  }

  const posAttr = geometry.getAttribute('position');
  if (!posAttr) return createEmptyAnalysis();

  const box = new THREE.Box3().setFromObject(mesh);
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);

  const dimsMM = { x: size.x, y: size.y, z: size.z };
  const maxDim = Math.max(dimsMM.x, dimsMM.y, dimsMM.z);
  let scale = 1;
  if (maxDim < 2) scale = 1000;
  else if (maxDim < 20) scale = 10;
  else if (maxDim > 5000) scale = 0.1;

  const scaledDims = {
    x: dimsMM.x * scale,
    y: dimsMM.y * scale,
    z: dimsMM.z * scale,
  };

  const vertexCount = posAttr.count;
  let triangleCount = 0;
  if (geometry.index) {
    triangleCount = geometry.index.count / 3;
  } else {
    triangleCount = vertexCount / 3;
  }

  const { volume, surfaceArea } = computeVolumeAndArea(geometry, mesh.matrixWorld, scale);

  const boundingBoxVolume = (scaledDims.x * scaledDims.y * scaledDims.z) / 1000;
  const fillRatio = boundingBoxVolume > 0 ? Math.min(volume / boundingBoxVolume, 1) : 0;

  const overhangs = detectOverhangs(geometry, mesh.matrixWorld);

  const severeOverhangs = overhangs.filter(o => o.severity === 'severe').length;
  const moderateOverhangs = overhangs.filter(o => o.severity === 'moderate').length;

  let printDifficulty: 'easy' | 'medium' | 'hard' = 'easy';
  if (severeOverhangs > 2 || moderateOverhangs > 5) printDifficulty = 'hard';
  else if (severeOverhangs > 0 || moderateOverhangs > 2) printDifficulty = 'medium';

  const recommendedLayerHeight = calculateLayerHeight(scaledDims, triangleCount);

  const estimatedSupportVolume = estimateSupportVolume(overhangs, scaledDims);

  const splitSuggestions = suggestSplits(scaledDims, overhangs);

  return {
    triangleCount: Math.floor(triangleCount),
    vertexCount,
    dimensions: scaledDims,
    volume: Math.max(volume, 0.01),
    surfaceArea: Math.max(surfaceArea, 0.1),
    center: { x: center.x, y: center.y, z: center.z },
    boundingBoxVolume,
    fillRatio,
    overhangs,
    recommendedLayerHeight,
    printDifficulty,
    estimatedSupportVolume,
    splitSuggestions,
  };
}

function computeVolumeAndArea(
  geometry: THREE.BufferGeometry,
  worldMatrix: THREE.Matrix4,
  unitScale: number
): { volume: number; surfaceArea: number } {
  const pos = geometry.getAttribute('position');
  if (!pos) return { volume: 0, surfaceArea: 0 };

  let volume = 0;
  let area = 0;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();

  const getVertex = (index: number, target: THREE.Vector3) => {
    target.set(pos.getX(index), pos.getY(index), pos.getZ(index));
    target.applyMatrix4(worldMatrix);
    target.multiplyScalar(unitScale);
  };

  const processTriangle = (i0: number, i1: number, i2: number) => {
    getVertex(i0, a);
    getVertex(i1, b);
    getVertex(i2, c);

    volume += signedVolumeOfTriangle(a, b, c);

    const ab = new THREE.Vector3().subVectors(b, a);
    const ac = new THREE.Vector3().subVectors(c, a);
    area += ab.cross(ac).length() * 0.5;
  };

  if (geometry.index) {
    const idx = geometry.index;
    for (let i = 0; i < idx.count; i += 3) {
      processTriangle(idx.getX(i), idx.getX(i + 1), idx.getX(i + 2));
    }
  } else {
    for (let i = 0; i < pos.count; i += 3) {
      processTriangle(i, i + 1, i + 2);
    }
  }

  return {
    volume: Math.abs(volume) / 1000,
    surfaceArea: area / 100,
  };
}

function signedVolumeOfTriangle(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): number {
  return (
    a.x * (b.y * c.z - b.z * c.y) +
    a.y * (b.z * c.x - b.x * c.z) +
    a.z * (b.x * c.y - b.y * c.x)
  ) / 6.0;
}

function detectOverhangs(
  geometry: THREE.BufferGeometry,
  worldMatrix: THREE.Matrix4
): OverhangInfo[] {
  const pos = geometry.getAttribute('position');
  if (!pos) return [];

  const up = new THREE.Vector3(0, 1, 0);
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(worldMatrix);
  const regions: Map<string, { angles: number[]; centers: THREE.Vector3[]; count: number }> = new Map();

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();

  const processFace = (i0: number, i1: number, i2: number) => {
    a.set(pos.getX(i0), pos.getY(i0), pos.getZ(i0));
    b.set(pos.getX(i1), pos.getY(i1), pos.getZ(i1));
    c.set(pos.getX(i2), pos.getY(i2), pos.getZ(i2));

    const ab = new THREE.Vector3().subVectors(b, a);
    const ac = new THREE.Vector3().subVectors(c, a);
    const normal = ab.cross(ac).normalize();
    normal.applyMatrix3(normalMatrix).normalize();

    const angle = Math.acos(Math.max(-1, Math.min(1, normal.dot(up)))) * (180 / Math.PI);

    if (angle > 135) {
      const center = new THREE.Vector3().addVectors(a, b).add(c).divideScalar(3);
      const regionKey = `${Math.floor(center.x * 2)}_${Math.floor(center.y * 2)}_${Math.floor(center.z * 2)}`;

      if (!regions.has(regionKey)) {
        regions.set(regionKey, { angles: [], centers: [], count: 0 });
      }
      const region = regions.get(regionKey)!;
      region.angles.push(angle);
      region.centers.push(center.clone());
      region.count++;
    }
  };

  const maxFaces = Math.min(geometry.index ? geometry.index.count / 3 : pos.count / 3, 50000);

  if (geometry.index) {
    const idx = geometry.index;
    for (let i = 0; i < maxFaces * 3; i += 3) {
      processFace(idx.getX(i), idx.getX(i + 1), idx.getX(i + 2));
    }
  } else {
    for (let i = 0; i < maxFaces * 3; i += 3) {
      processFace(i, i + 1, i + 2);
    }
  }

  const overhangs: OverhangInfo[] = [];
  for (const [, region] of regions) {
    if (region.count < 3) continue;
    const avgAngle = region.angles.reduce((s, v) => s + v, 0) / region.angles.length;
    const avgCenter = new THREE.Vector3();
    region.centers.forEach(c => avgCenter.add(c));
    avgCenter.divideScalar(region.centers.length);

    let severity: OverhangInfo['severity'] = 'mild';
    if (avgAngle > 160) severity = 'severe';
    else if (avgAngle > 145) severity = 'moderate';

    overhangs.push({
      severity,
      angle: avgAngle,
      regionCenter: avgCenter,
      triangleCount: region.count,
    });
  }

  return overhangs.sort((a, b) => b.angle - a.angle).slice(0, 20);
}

function calculateLayerHeight(
  dims: { x: number; y: number; z: number },
  triangles: number
): { min: number; max: number; optimal: number } {
  const height = dims.y;
  const detail = triangles / (dims.x * dims.y * dims.z + 1) * 1000;

  if (height > 200 || detail < 0.5) {
    return { min: 0.2, max: 0.32, optimal: 0.28 };
  }
  if (height > 100 || detail < 2) {
    return { min: 0.16, max: 0.24, optimal: 0.2 };
  }
  if (detail > 10) {
    return { min: 0.04, max: 0.12, optimal: 0.08 };
  }
  return { min: 0.08, max: 0.2, optimal: 0.12 };
}

function estimateSupportVolume(overhangs: OverhangInfo[], dims: { x: number; y: number; z: number }): number {
  if (overhangs.length === 0) return 0;
  const totalSevere = overhangs.filter(o => o.severity === 'severe').length;
  const totalModerate = overhangs.filter(o => o.severity === 'moderate').length;
  const modelVolume = dims.x * dims.y * dims.z / 1000;
  return modelVolume * (totalSevere * 0.03 + totalModerate * 0.01);
}

function suggestSplits(
  dims: { x: number; y: number; z: number },
  overhangs: OverhangInfo[]
): SplitSuggestion[] {
  const suggestions: SplitSuggestion[] = [];
  const maxPrintSize = 220;

  if (dims.x > maxPrintSize) {
    const parts = Math.ceil(dims.x / maxPrintSize);
    for (let i = 1; i < parts; i++) {
      suggestions.push({
        axis: 'x',
        position: (dims.x / parts) * i,
        reason: `Model presahuje tiskarnu (${dims.x.toFixed(0)}mm). Rozdelit na ${parts} casti.`,
      });
    }
  }
  if (dims.y > maxPrintSize) {
    suggestions.push({
      axis: 'y',
      position: dims.y / 2,
      reason: `Vyska ${dims.y.toFixed(0)}mm presahuje tiskovy prostor. Doporuceno rozdelit horizontalne.`,
    });
  }
  if (dims.z > maxPrintSize) {
    const parts = Math.ceil(dims.z / maxPrintSize);
    for (let i = 1; i < parts; i++) {
      suggestions.push({
        axis: 'z',
        position: (dims.z / parts) * i,
        reason: `Hloubka ${dims.z.toFixed(0)}mm presahuje tiskarnu. Rozdelit na ${parts} casti.`,
      });
    }
  }

  const severeOverhangClusters = overhangs.filter(o => o.severity === 'severe');
  if (severeOverhangClusters.length > 3) {
    suggestions.push({
      axis: 'y',
      position: dims.y * 0.4,
      reason: 'Velke mnozstvi previsu. Rozdeleni umozni lepsi tisk bez podpor.',
    });
  }

  return suggestions;
}

export function getDefaultSupportConfig(): SupportConfig {
  return {
    density: 'medium',
    type: 'tree',
    overhangAngle: 45,
    treeDirections: 4,
    branchGap: 2.0,
    contactDiameter: 0.6,
  };
}

export function getSupportRecommendation(analysis: StlAnalysis): string[] {
  const tips: string[] = [];

  if (analysis.overhangs.length === 0) {
    tips.push('Model nevyzaduje podpory - zadne vyrazne previsy.');
    return tips;
  }

  const severe = analysis.overhangs.filter(o => o.severity === 'severe');
  const moderate = analysis.overhangs.filter(o => o.severity === 'moderate');

  if (severe.length > 0) {
    tips.push(`Nalezeno ${severe.length} kritickych oblasti s uhlem previsu > 70°. Podpory jsou nutne.`);
  }
  if (moderate.length > 0) {
    tips.push(`${moderate.length} oblasti se strednim previsem (45-70°). Doporuceny podpory.`);
  }

  if (analysis.dimensions.y > 150) {
    tips.push('Vysoky model - pouzijte stromove podpory pro snizeni spotreby materialu.');
  }

  if (severe.length > 4) {
    tips.push('Velky pocet previsu - zvazte rozdeleni modelu na casti pro lepsi kvalitu tisku.');
    tips.push('Stromove podpory rozdelene do 4 smeru s mezirou 2mm mezi vetvemi minimalizuji kontakt.');
  }

  if (analysis.printDifficulty === 'hard') {
    tips.push('Doporuceni: Vytisknte s vyssi hustotou podpor (15-25%) a pouzijte interface vrstvu 0.15mm.');
  } else if (analysis.printDifficulty === 'medium') {
    tips.push('Doporuceni: Standardni hustota podpor (10-15%) by mela stacit.');
  }

  return tips;
}

function createEmptyAnalysis(): StlAnalysis {
  return {
    triangleCount: 0,
    vertexCount: 0,
    dimensions: { x: 0, y: 0, z: 0 },
    volume: 0,
    surfaceArea: 0,
    center: { x: 0, y: 0, z: 0 },
    boundingBoxVolume: 0,
    fillRatio: 0,
    overhangs: [],
    recommendedLayerHeight: { min: 0.12, max: 0.2, optimal: 0.16 },
    printDifficulty: 'easy',
    estimatedSupportVolume: 0,
    splitSuggestions: [],
  };
}

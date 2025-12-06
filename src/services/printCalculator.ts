import * as THREE from 'three';

export interface Material {
  id: string;
  name: string;
  density: number;
  pricePerKg: number;
  type: 'FDM' | 'SLA';
}

export interface Printer {
  id: string;
  name: string;
  type: 'FDM' | 'SLA';
  speedMultiplier: number;
  layerHeight: number;
}

export interface GeometryStats {
  volume: number;
  surfaceArea: number;
}

export interface PrintEstimate {
  printTime: number;
  weight: number;
  cost: number;
  plasticVolume: number;
}

export const MATERIALS: Material[] = [
  {
    id: 'pla',
    name: 'PLA',
    density: 1.24,
    pricePerKg: 450,
    type: 'FDM'
  },
  {
    id: 'petg',
    name: 'PETG',
    density: 1.27,
    pricePerKg: 550,
    type: 'FDM'
  },
  {
    id: 'abs',
    name: 'ABS',
    density: 1.04,
    pricePerKg: 500,
    type: 'FDM'
  },
  {
    id: 'tpu',
    name: 'TPU',
    density: 1.21,
    pricePerKg: 750,
    type: 'FDM'
  },
  {
    id: 'resin',
    name: 'Resin',
    density: 1.15,
    pricePerKg: 1200,
    type: 'SLA'
  }
];

export const PRINTERS: Printer[] = [
  {
    id: 'ender3',
    name: 'Ender 3 (Standard)',
    type: 'FDM',
    speedMultiplier: 1.0,
    layerHeight: 0.2
  },
  {
    id: 'prusa-mk4',
    name: 'Prusa MK4 (Quality)',
    type: 'FDM',
    speedMultiplier: 1.2,
    layerHeight: 0.15
  },
  {
    id: 'bambu-x1',
    name: 'Bambu Lab X1 (Speed)',
    type: 'FDM',
    speedMultiplier: 4.0,
    layerHeight: 0.2
  },
  {
    id: 'anycubic-photon',
    name: 'Anycubic Photon (SLA)',
    type: 'SLA',
    speedMultiplier: 1.0,
    layerHeight: 0.05
  }
];

/**
 * Calculates the signed volume of a tetrahedron formed by the origin and a triangle
 * @param v0 First vertex of the triangle
 * @param v1 Second vertex of the triangle
 * @param v2 Third vertex of the triangle
 * @returns Signed volume in cubic units
 */
function signedVolumeOfTriangle(v0: THREE.Vector3, v1: THREE.Vector3, v2: THREE.Vector3): number {
  return v0.dot(new THREE.Vector3().crossVectors(v1, v2)) / 6.0;
}

/**
 * Calculates the area of a triangle using cross product
 * @param v0 First vertex of the triangle
 * @param v1 Second vertex of the triangle
 * @param v2 Third vertex of the triangle
 * @returns Area in square units
 */
function triangleArea(v0: THREE.Vector3, v1: THREE.Vector3, v2: THREE.Vector3): number {
  const edge1 = new THREE.Vector3().subVectors(v1, v0);
  const edge2 = new THREE.Vector3().subVectors(v2, v0);
  const cross = new THREE.Vector3().crossVectors(edge1, edge2);
  return cross.length() / 2.0;
}

/**
 * Calculates geometry statistics (volume and surface area) for a 3D model
 * Uses the "Signed Volume of Tetrahedron" method for accurate volume calculation
 * @param object THREE.Group or THREE.Scene containing the 3D model
 * @returns GeometryStats with volume in cm³ and surface area in cm²
 */
export function calculateGeometryStats(object: THREE.Object3D): GeometryStats {
  let totalVolume = 0;
  let totalSurfaceArea = 0;

  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const geometry = child.geometry;

      if (!geometry.isBufferGeometry) {
        console.warn('Non-BufferGeometry detected, skipping');
        return;
      }

      const positionAttribute = geometry.attributes.position;
      if (!positionAttribute) {
        console.warn('No position attribute found');
        return;
      }

      const worldMatrix = child.matrixWorld;
      const v0 = new THREE.Vector3();
      const v1 = new THREE.Vector3();
      const v2 = new THREE.Vector3();

      if (geometry.index) {
        const indices = geometry.index.array;
        for (let i = 0; i < indices.length; i += 3) {
          v0.fromBufferAttribute(positionAttribute, indices[i]).applyMatrix4(worldMatrix);
          v1.fromBufferAttribute(positionAttribute, indices[i + 1]).applyMatrix4(worldMatrix);
          v2.fromBufferAttribute(positionAttribute, indices[i + 2]).applyMatrix4(worldMatrix);

          totalVolume += signedVolumeOfTriangle(v0, v1, v2);
          totalSurfaceArea += triangleArea(v0, v1, v2);
        }
      } else {
        for (let i = 0; i < positionAttribute.count; i += 3) {
          v0.fromBufferAttribute(positionAttribute, i).applyMatrix4(worldMatrix);
          v1.fromBufferAttribute(positionAttribute, i + 1).applyMatrix4(worldMatrix);
          v2.fromBufferAttribute(positionAttribute, i + 2).applyMatrix4(worldMatrix);

          totalVolume += signedVolumeOfTriangle(v0, v1, v2);
          totalSurfaceArea += triangleArea(v0, v1, v2);
        }
      }
    }
  });

  totalVolume = Math.abs(totalVolume);

  const volumeCm3 = totalVolume / 1000;
  const surfaceAreaCm2 = totalSurfaceArea / 100;

  return {
    volume: volumeCm3,
    surfaceArea: surfaceAreaCm2
  };
}

/**
 * Estimates print time, material weight, and cost for a 3D model
 * @param stats Geometry statistics from calculateGeometryStats
 * @param printer Selected printer configuration
 * @param material Selected material
 * @param infillPercentage Infill percentage (0-100), only for FDM
 * @returns PrintEstimate with time in minutes, weight in grams, and cost in CZK
 */
export function estimatePrint(
  stats: GeometryStats,
  printer: Printer,
  material: Material,
  infillPercentage: number = 20
): PrintEstimate {
  if (printer.type === 'FDM') {
    return estimateFDM(stats, printer, material, infillPercentage);
  } else {
    return estimateSLA(stats, printer, material);
  }
}

/**
 * Calculates FDM print estimates
 */
function estimateFDM(
  stats: GeometryStats,
  printer: Printer,
  material: Material,
  infillPercentage: number
): PrintEstimate {
  const wallThickness = 0.12;

  const shellVolume = stats.surfaceArea * wallThickness;
  const infillVolume = (stats.volume - shellVolume) * (infillPercentage / 100);
  const totalPlasticVolume = shellVolume + Math.max(0, infillVolume);

  const weight = totalPlasticVolume * material.density;
  const cost = (weight / 1000) * material.pricePerKg;

  const baseSpeed = 10;
  const layerPenalty = (stats.volume / printer.layerHeight) * 0.05;
  const printTime = (totalPlasticVolume / (baseSpeed * printer.speedMultiplier)) + layerPenalty;

  return {
    printTime: Math.max(1, printTime),
    weight: Math.max(0.1, weight),
    cost: Math.max(1, cost),
    plasticVolume: totalPlasticVolume
  };
}

/**
 * Calculates SLA print estimates
 */
function estimateSLA(
  stats: GeometryStats,
  printer: Printer,
  material: Material
): PrintEstimate {
  const boundingBox = new THREE.Box3();
  const modelHeight = 10;

  const exposureTimePerLayer = 8;
  const numberOfLayers = modelHeight / printer.layerHeight;
  const printTime = numberOfLayers * exposureTimePerLayer / 60;

  const weight = stats.volume * material.density;
  const cost = (weight / 1000) * material.pricePerKg;

  return {
    printTime: Math.max(1, printTime),
    weight: Math.max(0.1, weight),
    cost: Math.max(1, cost),
    plasticVolume: stats.volume
  };
}

/**
 * Formats print time from minutes to human-readable format
 * @param minutes Total print time in minutes
 * @returns Formatted string like "2h 30m"
 */
export function formatPrintTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours === 0) {
    return `${mins}m`;
  }
  return `${hours}h ${mins}m`;
}

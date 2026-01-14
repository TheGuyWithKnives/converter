import { useMemo } from 'react';
import * as THREE from 'three';
import { Box, Triangle, Grid, Layers } from 'lucide-react';

interface MeshStatisticsProps {
  modelUrl?: string;
  mesh?: THREE.Mesh;
  scene?: THREE.Scene;
}

export default function MeshStatistics({ modelUrl, mesh, scene }: MeshStatisticsProps) {
  const stats = useMemo(() => {
    if (!mesh && !scene) {
      return null;
    }

    let totalVertices = 0;
    let totalTriangles = 0;
    let totalMeshes = 0;
    let totalMaterials = 0;
    let boundingBox: THREE.Box3 | null = null;

    const processObject = (obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh) {
        totalMeshes++;
        const geometry = obj.geometry;
        if (geometry) {
          const positionAttribute = geometry.attributes.position;
          if (positionAttribute) {
            totalVertices += positionAttribute.count;
          }
          if (geometry.index) {
            totalTriangles += geometry.index.count / 3;
          } else if (positionAttribute) {
            totalTriangles += positionAttribute.count / 3;
          }
        }
        if (obj.material) {
          totalMaterials++;
        }
        if (!boundingBox) {
          boundingBox = new THREE.Box3().setFromObject(obj);
        } else {
          boundingBox.expandByObject(obj);
        }
      }
      obj.children.forEach(processObject);
    };

    if (scene) {
      processObject(scene);
    } else if (mesh) {
      processObject(mesh);
    }

    const size = boundingBox ? boundingBox.getSize(new THREE.Vector3()) : new THREE.Vector3();

    return {
      vertices: totalVertices,
      triangles: Math.floor(totalTriangles),
      meshes: totalMeshes,
      materials: totalMaterials,
      dimensions: {
        x: size.x.toFixed(2),
        y: size.y.toFixed(2),
        z: size.z.toFixed(2),
      },
    };
  }, [mesh, scene]);

  if (!stats) {
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Box className="w-5 h-5 text-green-400" />
          <h3 className="text-white font-semibold">Mesh Statistics</h3>
        </div>
        <p className="text-slate-400 text-sm">No model loaded</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Box className="w-5 h-5 text-green-400" />
        <h3 className="text-white font-semibold">Mesh Statistics</h3>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-300">
            <Triangle className="w-4 h-4 text-blue-400" />
            <span>Triangles</span>
          </div>
          <span className="text-white font-mono">{stats.triangles.toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-300">
            <Grid className="w-4 h-4 text-green-400" />
            <span>Vertices</span>
          </div>
          <span className="text-white font-mono">{stats.vertices.toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-300">
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Meshes</span>
          </div>
          <span className="text-white font-mono">{stats.meshes}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-300">
            <Box className="w-4 h-4 text-orange-400" />
            <span>Materials</span>
          </div>
          <span className="text-white font-mono">{stats.materials}</span>
        </div>

        <div className="pt-3 border-t border-slate-700">
          <div className="text-slate-300 mb-2">Dimensions</div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-700 rounded px-2 py-1">
              <div className="text-xs text-slate-400">X</div>
              <div className="text-white font-mono text-sm">{stats.dimensions.x}</div>
            </div>
            <div className="bg-slate-700 rounded px-2 py-1">
              <div className="text-xs text-slate-400">Y</div>
              <div className="text-white font-mono text-sm">{stats.dimensions.y}</div>
            </div>
            <div className="bg-slate-700 rounded px-2 py-1">
              <div className="text-xs text-slate-400">Z</div>
              <div className="text-white font-mono text-sm">{stats.dimensions.z}</div>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <div className="text-xs text-slate-400">
            Quality: {stats.triangles < 10000 ? 'Low' : stats.triangles < 50000 ? 'Medium' : 'High'} poly
          </div>
        </div>
      </div>
    </div>
  );
}

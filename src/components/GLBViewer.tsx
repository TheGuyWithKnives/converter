import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { PLYExporter } from 'three/examples/jsm/exporters/PLYExporter.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { Settings, Download, Sun, Lightbulb, Eye, Film, Calculator } from 'lucide-react';
import { ModelAnimator } from './ModelAnimator';
import PrintEstimator from './PrintEstimator';
import { loadModelUrl } from '../services/modelLoader';

interface GLBViewerProps {
  modelUrl: string;
}

interface LightingSettings {
  ambientIntensity: number;
  keyLightIntensity: number;
  fillLightIntensity: number;
  rimLightIntensity: number;
  exposure: number;
  showGrid: boolean;
}

export default function GLBViewer({ modelUrl }: GLBViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lightsRef = useRef<{
    ambient: THREE.AmbientLight | null;
    key: THREE.DirectionalLight | null;
    fill: THREE.DirectionalLight | null;
    rim: THREE.DirectionalLight | null;
  }>({ ambient: null, key: null, fill: null, rim: null });
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showAnimator, setShowAnimator] = useState(false);
  const [showEstimator, setShowEstimator] = useState(false);
  const [lighting, setLighting] = useState<LightingSettings>({
    ambientIntensity: 0.7,
    keyLightIntensity: 1.5,
    fillLightIntensity: 0.5,
    rimLightIntensity: 0.8,
    exposure: 1.0,
    showGrid: true,
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2a2a3e);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn('WebGL context lost in GLBViewer');
      setWebglError('WebGL context lost. Attempting to restore...');
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };

    const handleContextRestored = () => {
      console.log('WebGL context restored in GLBViewer');
      setWebglError(null);
    };

    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1;
    controls.maxDistance = 50;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, lighting.ambientIntensity);
    scene.add(ambientLight);
    lightsRef.current.ambient = ambientLight;

    const keyLight = new THREE.DirectionalLight(0xffffff, lighting.keyLightIntensity);
    keyLight.position.set(5, 5, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    scene.add(keyLight);
    lightsRef.current.key = keyLight;

    const fillLight = new THREE.DirectionalLight(0xffffff, lighting.fillLightIntensity);
    fillLight.position.set(-5, 3, -3);
    scene.add(fillLight);
    lightsRef.current.fill = fillLight;

    const rimLight = new THREE.DirectionalLight(0xffffff, lighting.rimLightIntensity);
    rimLight.position.set(0, -5, -5);
    scene.add(rimLight);
    lightsRef.current.rim = rimLight;

    const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
    gridHelper.visible = lighting.showGrid;
    scene.add(gridHelper);
    gridRef.current = gridHelper;

    const loader = new GLTFLoader();
    let cancelled = false;

    const loadingTimeout = setTimeout(() => {
      if (!cancelled) {
        console.error('Model loading timeout');
        setError('Model loading timed out. Please try generating the model again.');
        setIsLoading(false);
      }
    }, 60000);

    loadModelUrl(modelUrl)
      .then((localUrl) => {
        if (cancelled) {
          URL.revokeObjectURL(localUrl);
          return;
        }
        loader.load(
          localUrl,
          (gltf) => {
            clearTimeout(loadingTimeout);
            URL.revokeObjectURL(localUrl);
            if (cancelled) return;
            const model = gltf.scene;
            modelRef.current = model;

            model.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });

            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 3 / maxDim;
            model.scale.multiplyScalar(scale);

            model.position.x = -center.x * scale;
            model.position.y = -center.y * scale;
            model.position.z = -center.z * scale;

            scene.add(model);
            setIsLoading(false);
          },
          undefined,
          (loadErr) => {
            clearTimeout(loadingTimeout);
            URL.revokeObjectURL(localUrl);
            if (cancelled) return;
            console.error('Error loading GLB from blob:', loadErr);
            setError('Failed to load 3D model. The model URL may be invalid or the file may be corrupted.');
            setIsLoading(false);
          }
        );
      })
      .catch((fetchErr) => {
        clearTimeout(loadingTimeout);
        if (cancelled) return;
        console.error('Error fetching model:', fetchErr);
        setError('Failed to load 3D model. The model URL may be invalid or the file may be corrupted.');
        setIsLoading(false);
      });

    let lastTime = 0;
    const targetFPS = 60;
    const frameInterval = 1000 / targetFPS;

    const animate = (currentTime: number = 0) => {
      animationFrameRef.current = requestAnimationFrame(animate);

      const deltaTime = currentTime - lastTime;

      if (deltaTime < frameInterval) {
        return;
      }

      lastTime = currentTime - (deltaTime % frameInterval);

      try {
        controls.update();
        renderer.render(scene, camera);
      } catch (error) {
        console.error('Render error in GLBViewer:', error);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      }
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;

      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelled = true;
      clearTimeout(loadingTimeout);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      if (modelRef.current) {
        modelRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();

            const materials = Array.isArray(child.material)
              ? child.material
              : [child.material];

            materials.forEach(material => {
              if (material) {
                Object.keys(material).forEach(key => {
                  const value = (material as any)[key];
                  if (value instanceof THREE.Texture) {
                    value.dispose();
                  }
                });
                material.dispose();
              }
            });
          }
        });
        scene.remove(modelRef.current);
      }

      if (lightsRef.current.ambient) {
        scene.remove(lightsRef.current.ambient);
        lightsRef.current.ambient = null;
      }
      if (lightsRef.current.key) {
        scene.remove(lightsRef.current.key);
        lightsRef.current.key = null;
      }
      if (lightsRef.current.fill) {
        scene.remove(lightsRef.current.fill);
        lightsRef.current.fill = null;
      }
      if (lightsRef.current.rim) {
        scene.remove(lightsRef.current.rim);
        lightsRef.current.rim = null;
      }

      if (gridRef.current) {
        scene.remove(gridRef.current);
        gridRef.current.geometry?.dispose();
        (gridRef.current.material as THREE.Material)?.dispose();
        gridRef.current = null;
      }

      if (controlsRef.current) {
        controlsRef.current.dispose();
        controlsRef.current = null;
      }

      if (containerRef.current && renderer.domElement.parentNode) {
        containerRef.current.removeChild(renderer.domElement);
      }

      renderer.dispose();
      rendererRef.current = null;

      scene.clear();
      sceneRef.current = null;
    };
  }, [modelUrl]);

  useEffect(() => {
    if (lightsRef.current.ambient) {
      lightsRef.current.ambient.intensity = lighting.ambientIntensity;
    }
    if (lightsRef.current.key) {
      lightsRef.current.key.intensity = lighting.keyLightIntensity;
    }
    if (lightsRef.current.fill) {
      lightsRef.current.fill.intensity = lighting.fillLightIntensity;
    }
    if (lightsRef.current.rim) {
      lightsRef.current.rim.intensity = lighting.rimLightIntensity;
    }
    if (rendererRef.current) {
      rendererRef.current.toneMappingExposure = lighting.exposure;
    }
    if (gridRef.current) {
      gridRef.current.visible = lighting.showGrid;
    }
  }, [lighting]);

  const handleExport = async (format: 'glb' | 'obj' | 'stl' | 'ply') => {
    if (!modelRef.current) return;

    try {
      let content: string | ArrayBuffer;
      let filename: string;
      let mimeType: string;

      switch (format) {
        case 'glb':
          const gltfExporter = new GLTFExporter();
          const gltfData = await new Promise<ArrayBuffer>((resolve, reject) => {
            gltfExporter.parse(
              modelRef.current!,
              (result) => resolve(result as ArrayBuffer),
              (error) => reject(error),
              { binary: true }
            );
          });
          content = gltfData;
          filename = 'model.glb';
          mimeType = 'model/gltf-binary';
          break;

        case 'obj':
          const objExporter = new OBJExporter();
          content = objExporter.parse(modelRef.current);
          filename = 'model.obj';
          mimeType = 'text/plain';
          break;

        case 'stl':
          const stlExporter = new STLExporter();
          content = stlExporter.parse(modelRef.current);
          filename = 'model.stl';
          mimeType = 'application/sla';
          break;

        case 'ply':
          const plyExporter = new PLYExporter();
          const plyResult = await new Promise<string>((resolve) => {
            plyExporter.parse(
              modelRef.current!,
              (result) => resolve(result as string),
              {}
            );
          });
          content = plyResult;
          filename = 'model.ply';
          mimeType = 'text/plain';
          break;

        default:
          return;
      }

      const blob = new Blob([content as BlobPart], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export model');
    }
  };

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 bg-opacity-75 z-10">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-sm">Loading 3D model...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 bg-opacity-90 z-10">
          <div className="text-center max-w-md p-8 bg-slate-800 rounded-lg shadow-xl">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">⚠️</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Chyba při načítání modelu</h3>
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
            >
              Obnovit stránku
            </button>
          </div>
        </div>
      )}

      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <button
          onClick={() => setShowAnimator(true)}
          className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-colors shadow-lg"
          title="Animate & Record"
        >
          <Film className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowEstimator(true)}
          className="p-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-colors shadow-lg"
          title="Print Cost & Time Estimator"
        >
          <Calculator className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowExport(!showExport)}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
          title="Export Model"
        >
          <Download className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowControls(!showControls)}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
          title="Lighting Controls"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {showExport && (
        <div className="absolute top-16 right-4 z-20 bg-slate-800 rounded-lg p-4 shadow-xl">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Model
          </h3>
          <div className="space-y-2">
            <button
              onClick={() => handleExport('glb')}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-sm"
            >
              Export as GLB
            </button>
            <button
              onClick={() => handleExport('obj')}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors text-sm"
            >
              Export as OBJ
            </button>
            <button
              onClick={() => handleExport('stl')}
              className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors text-sm"
            >
              Export as STL
            </button>
            <button
              onClick={() => handleExport('ply')}
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors text-sm"
            >
              Export as PLY
            </button>
          </div>
        </div>
      )}

      {showControls && (
        <div className="absolute top-16 right-4 z-20 bg-slate-800 rounded-lg p-4 shadow-xl max-w-xs">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Sun className="w-4 h-4" />
            Lighting Controls
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-white text-sm flex items-center gap-2 mb-1">
                <Lightbulb className="w-3 h-3" />
                Ambient Light
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={lighting.ambientIntensity}
                onChange={(e) => setLighting({ ...lighting, ambientIntensity: parseFloat(e.target.value) })}
                className="w-full"
              />
              <span className="text-slate-400 text-xs">{lighting.ambientIntensity.toFixed(1)}</span>
            </div>

            <div>
              <label className="text-white text-sm flex items-center gap-2 mb-1">
                <Sun className="w-3 h-3" />
                Key Light
              </label>
              <input
                type="range"
                min="0"
                max="3"
                step="0.1"
                value={lighting.keyLightIntensity}
                onChange={(e) => setLighting({ ...lighting, keyLightIntensity: parseFloat(e.target.value) })}
                className="w-full"
              />
              <span className="text-slate-400 text-xs">{lighting.keyLightIntensity.toFixed(1)}</span>
            </div>

            <div>
              <label className="text-white text-sm mb-1 block">Fill Light</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={lighting.fillLightIntensity}
                onChange={(e) => setLighting({ ...lighting, fillLightIntensity: parseFloat(e.target.value) })}
                className="w-full"
              />
              <span className="text-slate-400 text-xs">{lighting.fillLightIntensity.toFixed(1)}</span>
            </div>

            <div>
              <label className="text-white text-sm mb-1 block">Rim Light</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={lighting.rimLightIntensity}
                onChange={(e) => setLighting({ ...lighting, rimLightIntensity: parseFloat(e.target.value) })}
                className="w-full"
              />
              <span className="text-slate-400 text-xs">{lighting.rimLightIntensity.toFixed(1)}</span>
            </div>

            <div>
              <label className="text-white text-sm flex items-center gap-2 mb-1">
                <Eye className="w-3 h-3" />
                Exposure
              </label>
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                value={lighting.exposure}
                onChange={(e) => setLighting({ ...lighting, exposure: parseFloat(e.target.value) })}
                className="w-full"
              />
              <span className="text-slate-400 text-xs">{lighting.exposure.toFixed(1)}</span>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="showGrid"
                checked={lighting.showGrid}
                onChange={(e) => setLighting({ ...lighting, showGrid: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="showGrid" className="text-white text-sm">Show Grid</label>
            </div>
          </div>
        </div>
      )}

      <div ref={containerRef} className="w-full h-full" />

      {showAnimator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <ModelAnimator
            modelUrl={modelUrl}
            onClose={() => setShowAnimator(false)}
          />
        </div>
      )}

      {showEstimator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative">
            <button
              onClick={() => setShowEstimator(false)}
              className="absolute -top-2 -right-2 z-10 w-8 h-8 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
              title="Close"
            >
              ×
            </button>
            <PrintEstimator modelUrl={modelUrl} />
          </div>
        </div>
      )}
    </div>
  );
}

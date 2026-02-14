import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import MaterialEditor, { MaterialSettings } from './MaterialEditor';
import MeshStatistics from './MeshStatistics';
import CameraPresets, { CameraPreset } from './CameraPresets';
import ViewportControls from './ViewportControls';
import { loadModelUrl } from '../services/modelLoader';

interface EnhancedGLBViewerProps {
  modelUrl: string;
  onSceneReady?: (scene: THREE.Scene) => void;
}

export default function EnhancedGLBViewer({ modelUrl, onSceneReady }: EnhancedGLBViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const boundingBoxRef = useRef<THREE.BoxHelper | null>(null);
  const lightsRef = useRef<THREE.Light[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showWireframe, setShowWireframe] = useState(false);
  const [showLights, setShowLights] = useState(true);
  const [showBoundingBox, setShowBoundingBox] = useState(false);

  const resetCamera = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.set(0, 0, 5);
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  }, []);

  const setCameraPreset = useCallback((preset: CameraPreset) => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.set(...preset.position);
    controlsRef.current.target.set(...preset.target);
    controlsRef.current.update();
  }, []);

  const applyMaterial = useCallback((settings: MaterialSettings) => {
    if (!modelRef.current) return;

    modelRef.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(settings.color),
          metalness: settings.metalness,
          roughness: settings.roughness,
          emissive: new THREE.Color(settings.emissive),
          emissiveIntensity: settings.emissiveIntensity,
        });

        if (mesh.material instanceof THREE.Material) {
          mesh.material.dispose();
        }
        mesh.material = material;
      }
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
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

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1;
    controls.maxDistance = 50;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1);
    keyLight.position.set(5, 5, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 3, -3);
    scene.add(fillLight);

    lightsRef.current = [ambientLight, keyLight, fillLight];

    const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
    gridHelper.visible = showGrid;
    scene.add(gridHelper);
    gridRef.current = gridHelper;

    const loader = new GLTFLoader();
    let disposed = false;

    const loadingTimeout = setTimeout(() => {
      if (!disposed) {
        setError('Model loading timed out. Please try generating the model again.');
        setIsLoading(false);
      }
    }, 60000);

    loadModelUrl(modelUrl)
      .then((localUrl) => {
        if (disposed) {
          URL.revokeObjectURL(localUrl);
          return;
        }
        loader.load(
          localUrl,
          (gltf) => {
            clearTimeout(loadingTimeout);
            URL.revokeObjectURL(localUrl);
            if (disposed) return;
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
            const modelScale = 3 / maxDim;
            model.scale.multiplyScalar(modelScale);

            model.position.x = -center.x * modelScale;
            model.position.y = -center.y * modelScale;
            model.position.z = -center.z * modelScale;

            scene.add(model);

            if (onSceneReady) {
              onSceneReady(scene);
            }

            setIsLoading(false);
          },
          undefined,
          (loadError) => {
            clearTimeout(loadingTimeout);
            URL.revokeObjectURL(localUrl);
            if (disposed) return;
            console.error('Error loading GLB from blob:', loadError);
            setError('Failed to load 3D model. The model URL may be invalid or the file may be corrupted.');
            setIsLoading(false);
          }
        );
      })
      .catch((fetchErr) => {
        clearTimeout(loadingTimeout);
        if (disposed) return;
        console.error('Error fetching model:', fetchErr);
        setError('Failed to load 3D model. The model URL may be invalid or the file may be corrupted.');
        setIsLoading(false);
      });

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
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
      disposed = true;
      clearTimeout(loadingTimeout);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && renderer.domElement.parentNode) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      controls.dispose();
    };
  }, [modelUrl, onSceneReady]);

  useEffect(() => {
    if (!gridRef.current) return;
    gridRef.current.visible = showGrid;
  }, [showGrid]);

  useEffect(() => {
    if (!modelRef.current) return;

    modelRef.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material instanceof THREE.Material) {
          (mesh.material as any).wireframe = showWireframe;
        }
      }
    });
  }, [showWireframe]);

  useEffect(() => {
    if (!modelRef.current || !sceneRef.current) return;

    if (showBoundingBox) {
      if (!boundingBoxRef.current) {
        boundingBoxRef.current = new THREE.BoxHelper(modelRef.current, 0x00ff00);
        sceneRef.current.add(boundingBoxRef.current);
      }
    } else {
      if (boundingBoxRef.current) {
        sceneRef.current.remove(boundingBoxRef.current);
        boundingBoxRef.current.dispose();
        boundingBoxRef.current = null;
      }
    }
  }, [showBoundingBox]);

  useEffect(() => {
    lightsRef.current.forEach(light => {
      light.visible = showLights;
    });
  }, [showLights]);

  return (
    <div className="w-full h-full flex">
      <div className="flex-1 relative">
        <div className="absolute inset-0" ref={containerRef} />

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-brand-dark/95 z-10">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-brand-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-brand-light text-sm">Nacitam 3D model...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-brand-dark/95 z-10">
            <div className="text-center max-w-md p-8 bg-brand-panel rounded-2xl shadow-elevated border border-brand-border">
              <div className="w-16 h-16 bg-brand-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl text-brand-accent">!</span>
              </div>
              <h3 className="text-xl font-bold text-brand-light mb-2">Chyba pri nacitani modelu</h3>
              <p className="text-brand-accent/80 mb-4 text-sm">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-brand-accent hover:opacity-90 text-brand-light rounded-xl font-bold transition-all shadow-glow"
              >
                Obnovit stranku
              </button>
            </div>
          </div>
        )}
      </div>

      {!isLoading && !error && (
        <div className="w-80 bg-brand-panel border-l border-brand-border overflow-y-auto p-4 space-y-4">
          <MeshStatistics scene={sceneRef.current || undefined} />

          <ViewportControls
            showGrid={showGrid}
            showWireframe={showWireframe}
            showLights={showLights}
            showBoundingBox={showBoundingBox}
            onToggleGrid={() => setShowGrid(!showGrid)}
            onToggleWireframe={() => setShowWireframe(!showWireframe)}
            onToggleLights={() => setShowLights(!showLights)}
            onToggleBoundingBox={() => setShowBoundingBox(!showBoundingBox)}
            onResetCamera={resetCamera}
          />

          <CameraPresets onPresetSelect={setCameraPreset} />

          <MaterialEditor onApply={applyMaterial} />
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface ThreeViewerProps {
  mesh: THREE.Mesh | null;
  onMeshUpdate?: (mesh: THREE.Mesh) => void;
}

export default function ThreeViewer({ mesh, onMeshUpdate }: ThreeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const currentMeshRef = useRef<THREE.Mesh | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [lightIntensity, setLightIntensity] = useState(1);
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
  const [scale, setScale] = useState(1);
  const [webglError, setWebglError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2a2a3e);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false,
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn('WebGL context lost');
      setWebglError('WebGL context lost. Attempting to restore...');
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };

    const handleContextRestored = () => {
      console.log('WebGL context restored');
      setWebglError(null);
      if (sceneRef.current && cameraRef.current && rendererRef.current) {
        animate();
      }
    };

    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, lightIntensity * 1.2);
    keyLight.position.set(5, 5, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, lightIntensity * 0.4);
    fillLight.position.set(-5, 3, -3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, lightIntensity * 0.6);
    rimLight.position.set(0, -5, -5);
    scene.add(rimLight);

    const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
    scene.add(gridHelper);

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
        console.error('Render error:', error);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      }
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      if (currentMeshRef.current) {
        if (currentMeshRef.current.geometry) {
          currentMeshRef.current.geometry.dispose();
        }
        if (currentMeshRef.current.material) {
          if (Array.isArray(currentMeshRef.current.material)) {
            currentMeshRef.current.material.forEach(m => {
              m.dispose();
              if (m.map) m.map.dispose();
            });
          } else {
            currentMeshRef.current.material.dispose();
            if (currentMeshRef.current.material.map) {
              currentMeshRef.current.material.map.dispose();
            }
          }
        }
      }

      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (object.geometry) {
            object.geometry.dispose();
          }
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(m => {
                m.dispose();
                if (m.map) m.map.dispose();
              });
            } else {
              object.material.dispose();
              if (object.material.map) {
                object.material.map.dispose();
              }
            }
          }
        }
      });

      renderer.dispose();
      controls.dispose();

      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current || !mesh) return;

    if (currentMeshRef.current) {
      currentMeshRef.current.geometry?.dispose();
      if (Array.isArray(currentMeshRef.current.material)) {
        currentMeshRef.current.material.forEach(m => m.dispose());
      } else {
        currentMeshRef.current.material?.dispose();
      }
      sceneRef.current.remove(currentMeshRef.current);
    }

    sceneRef.current.add(mesh);
    currentMeshRef.current = mesh;

    if (cameraRef.current && controlsRef.current) {
      const box = new THREE.Box3().setFromObject(mesh);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = cameraRef.current.fov * (Math.PI / 180);
      const cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.5;

      cameraRef.current.position.set(center.x, center.y, center.z + cameraDistance);
      controlsRef.current.target.copy(center);
      controlsRef.current.update();
    }
  }, [mesh]);

  useEffect(() => {
    if (!sceneRef.current) return;
    const lights = sceneRef.current.children.filter(
      (child) => child instanceof THREE.DirectionalLight
    );
    lights.forEach((light) => {
      if (light instanceof THREE.DirectionalLight) {
        light.intensity = lightIntensity;
      }
    });
  }, [lightIntensity]);

  useEffect(() => {
    if (currentMeshRef.current) {
      currentMeshRef.current.rotation.set(rotation.x, rotation.y, rotation.z);
      if (onMeshUpdate) onMeshUpdate(currentMeshRef.current);
    }
  }, [rotation, onMeshUpdate]);

  useEffect(() => {
    if (currentMeshRef.current) {
      currentMeshRef.current.scale.set(scale, scale, scale);
      if (onMeshUpdate) onMeshUpdate(currentMeshRef.current);
    }
  }, [scale, onMeshUpdate]);

  return (
    <div className="w-full h-full flex flex-col">
      <div ref={containerRef} className="flex-1 w-full relative">
        {webglError && (
          <div className="absolute top-4 left-4 right-4 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg z-10">
            <p className="font-medium">{webglError}</p>
            <p className="text-sm mt-1">This usually resolves automatically. If not, try refreshing the page.</p>
          </div>
        )}
      </div>

      {mesh && (
        <div className="bg-slate-800 p-4 space-y-4">
          <div>
            <label className="text-white text-sm mb-2 block">Intenzita osvětlení</label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={lightIntensity}
              onChange={(e) => setLightIntensity(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-white text-sm mb-2 block">Škálování</label>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-white text-sm mb-2 block">Rotace X</label>
            <input
              type="range"
              min="0"
              max={Math.PI * 2}
              step="0.1"
              value={rotation.x}
              onChange={(e) => setRotation({ ...rotation, x: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-white text-sm mb-2 block">Rotace Y</label>
            <input
              type="range"
              min="0"
              max={Math.PI * 2}
              step="0.1"
              value={rotation.y}
              onChange={(e) => setRotation({ ...rotation, y: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-white text-sm mb-2 block">Rotace Z</label>
            <input
              type="range"
              min="0"
              max={Math.PI * 2}
              step="0.1"
              value={rotation.z}
              onChange={(e) => setRotation({ ...rotation, z: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [lightIntensity, setLightIntensity] = useState(1);
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
  const [scale, setScale] = useState(1);

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

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

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

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
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
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      controls.dispose();
      if (containerRef.current && renderer.domElement) {
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
      <div ref={containerRef} className="flex-1 w-full" />

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

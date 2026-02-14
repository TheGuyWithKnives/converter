import React, { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, useGLTF, Environment, Grid } from '@react-three/drei';
import * as THREE from 'three';

interface ThreeViewerProps {
  modelUrl: string;
  riggedModelUrl?: string | null;
  settings?: {
    showGrid: boolean;
    autoRotate: boolean;
    shadows: boolean;
    environment: string;
  };
}

const Model: React.FC<{ url: string }> = ({ url }) => {
  const { scene } = useGLTF(url);
  
  // Auto-center and scale
  useEffect(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxDim;
    
    scene.position.sub(center.multiplyScalar(scale));
    scene.scale.setScalar(scale);
    // Lift slightly above grid
    scene.position.y += size.y * scale * 0.5;
  }, [scene]);

  return <primitive object={scene} />;
};

export const ThreeViewer: React.FC<ThreeViewerProps> = ({ 
  modelUrl, 
  riggedModelUrl,
  settings = {
    showGrid: true,
    autoRotate: false,
    shadows: true,
    environment: 'city'
  }
}) => {
  const urlToLoad = riggedModelUrl || modelUrl;

  return (
    <div className="w-full h-full bg-gradient-to-b from-gray-900 to-black rounded-xl overflow-hidden relative">
      <Canvas
        shadows={settings.shadows}
        camera={{ position: [4, 2, 4], fov: 50 }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <Suspense fallback={null}>
          <Stage
            environment={settings.environment as any} 
            intensity={1}
            contactShadow={settings.shadows}
            shadows
            adjustCamera={false}
          >
             <Model url={urlToLoad} />
          </Stage>
          
          {/* FIX: Explicitní environment mapa, pokud Stage nestačí pro PBR materiály */}
          <Environment preset={settings.environment as any || 'city'} />

          {settings.showGrid && (
            <Grid 
              infiniteGrid 
              fadeDistance={30} 
              sectionColor="#4a9eff" 
              cellColor="#1a1a1a" 
              position={[0, -0.01, 0]} 
            />
          )}
        </Suspense>

        <OrbitControls 
          autoRotate={settings.autoRotate}
          makeDefault 
          minPolarAngle={0} 
          maxPolarAngle={Math.PI / 1.5}
        />
      </Canvas>
    </div>
  );
};

export default ThreeViewer;
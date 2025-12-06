import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Stage, OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { 
  Video, Loader2, Download, AlertCircle, Settings, 
  Clock, Monitor, Palette, FileVideo, CheckCircle2 
} from 'lucide-react';

// --- TYPY A KONSTANTY ---

type Resolution = '720p' | '1080p' | '2k' | '4k';
type Quality = 'high' | 'medium' | 'low';
type Duration = 2 | 4 | 8 | 12;

const RESOLUTIONS: Record<Resolution, { w: number; h: number; label: string }> = {
  '720p': { w: 1280, h: 720, label: 'HD (720p)' },
  '1080p': { w: 1920, h: 1080, label: 'Full HD (1080p)' },
  '2k': { w: 2560, h: 1440, label: '2K QHD' },
  '4k': { w: 3840, h: 2160, label: '4K UHD' },
};

const BITRATES: Record<Quality, number> = {
  high: 12000000,   // 12 Mbps
  medium: 5000000,  // 5 Mbps
  low: 2500000,     // 2.5 Mbps
};

interface ModelProps {
  url: string;
  isRecording: boolean;
  durationSeconds: number;
  onRotationUpdate: (progress: number) => void;
}

// --- KOMPONENTA MODELU (S LOGIKOU ROTACE) ---

function Model({ url, isRecording, durationSeconds, onRotationUpdate }: ModelProps) {
  const { scene } = useLoader(GLTFLoader, url);
  const ref = useRef<THREE.Group>(null);
  const startTimeRef = useRef<number | null>(null);
  
  // Přepočet trvání na milisekundy
  const durationMs = durationSeconds * 1000;

  useFrame((state) => {
    if (!ref.current) return;

    if (isRecording) {
      // --- LOGIKA NAHRÁVÁNÍ (PRECIZNÍ ČASOVÁNÍ) ---
      
      // Inicializace startovního času při prvním framu nahrávání
      if (startTimeRef.current === null) {
        startTimeRef.current = state.clock.getElapsedTime() * 1000;
      }
      
      const now = state.clock.getElapsedTime() * 1000;
      const elapsed = now - startTimeRef.current;
      
      // Výpočet progressu (0.0 až 1.0)
      const progress = Math.min(elapsed / durationMs, 1);
      
      // Nastavení rotace: 0 až 2*PI (360 stupňů)
      // Tím zajistíme, že na konci videa bude model přesně ve stejné pozici jako na začátku
      ref.current.rotation.y = progress * Math.PI * 2;
      
      onRotationUpdate(progress);
    } else {
      // --- LOGIKA NÁHLEDU (VOLNÁ ROTACE) ---
      ref.current.rotation.y += 0.005;
      startTimeRef.current = null; // Reset pro další nahrávání
    }
  });

  return <primitive object={scene} ref={ref} />;
}

// --- KOMPONENTA PRO ZMĚNU POZADÍ A VELIKOSTI CANVASU ---

function SceneSetup({ 
  bgColor, 
  transparent, 
  resolution 
}: { 
  bgColor: string; 
  transparent: boolean; 
  resolution: Resolution 
}) {
  const { gl, camera } = useThree();

  useEffect(() => {
    // Nastavení barvy pozadí
    if (transparent) {
      gl.setClearColor(0x000000, 0);
    } else {
      gl.setClearColor(bgColor, 1);
    }
  }, [bgColor, transparent, gl]);

  // Poznámka: Změna fyzické velikosti canvasu pro export se řeší v nadřazené komponentě,
  // zde bychom mohli manipulovat s dpr (device pixel ratio) pro ostřejší render.
  return null;
}

// --- HLAVNÍ KOMPONENTA ---

interface ModelAnimatorProps {
  modelUrl: string | null;
}

export function ModelAnimator({ modelUrl }: ModelAnimatorProps) {
  // Stav aplikace
  const [isRecording, setIsRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(true);

  // Nastavení exportu
  const [duration, setDuration] = useState<Duration>(4);
  const [resolution, setResolution] = useState<Resolution>('1080p');
  const [quality, setQuality] = useState<Quality>('medium');
  const [bgColor, setBgColor] = useState('#1a1a1a');
  const [isTransparent, setIsTransparent] = useState(false);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // --- FUNKCE PRO NAHRÁVÁNÍ ---

  const startRecording = useCallback(() => {
    if (!canvasRef.current) return;
    
    // Validace před startem
    if (MediaRecorder.notSupported) {
      setError("Váš prohlížeč nepodporuje MediaRecorder API.");
      return;
    }

    try {
      setError(null);
      setIsRecording(true);
      setProgress(0);
      chunksRef.current = [];

      // Vynucení rozlišení na canvasu (dočasně pro nahrávání)
      const originalWidth = canvasRef.current.width;
      const originalHeight = canvasRef.current.height;
      
      const targetW = RESOLUTIONS[resolution].w;
      const targetH = RESOLUTIONS[resolution].h;
      
      // Poznámka: Změna velikosti canvasu může bliknout, ale zajistí výstupní rozlišení
      canvasRef.current.width = targetW;
      canvasRef.current.height = targetH;

      const stream = canvasRef.current.captureStream(60); // 60 FPS request

      // Výběr kodeku
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp8';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: BITRATES[quality]
      });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        // Obnovení původní velikosti canvasu
        if (canvasRef.current) {
          canvasRef.current.width = originalWidth;
          canvasRef.current.height = originalHeight;
        }

        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        // Download trigger
        const a = document.createElement('a');
        a.href = url;
        a.download = `model-loop-${resolution}-${duration}s-${Date.now()}.webm`;
        a.click();
        
        URL.revokeObjectURL(url);
        setIsRecording(false);
        setProgress(0);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();

      // Automatické zastavení přesně po uplynutí doby
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, duration * 1000);

    } catch (err) {
      console.error('Recording error:', err);
      setError('Chyba při inicializaci nahrávání.');
      setIsRecording(false);
    }
  }, [resolution, quality, duration]);

  if (!modelUrl) return null;

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-2xl">
      
      {/* HEADER */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-800">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Video className="w-6 h-6 text-blue-500" />
          Generátor 3D Videa
        </h3>
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-gray-800 text-gray-400'}`}
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEVÝ PANEL - PREVIEW */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative aspect-video bg-gray-950 rounded-xl overflow-hidden border border-gray-800 shadow-inner group">
            <Canvas
              ref={canvasRef}
              gl={{ 
                preserveDrawingBuffer: true, 
                antialias: true,
                alpha: true 
              }}
              camera={{ position: [0, 0, 4], fov: 50 }}
              shadows
            >
              <SceneSetup 
                bgColor={bgColor} 
                transparent={isTransparent}
                resolution={resolution}
              />
              
              <ambientLight intensity={0.8} />
              <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1.5} castShadow />
              <pointLight position={[-10, -10, -10]} intensity={0.5} />
              <Environment preset="city" />

              <Stage environment={null} intensity={0.5}>
                <Model 
                  url={modelUrl} 
                  isRecording={isRecording} 
                  durationSeconds={duration}
                  onRotationUpdate={setProgress}
                />
              </Stage>
              
              <OrbitControls makeDefault enableZoom={true} enablePan={false} />
            </Canvas>

            {/* Nahrávací Overlay */}
            {isRecording && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-white">
                <Loader2 className="w-12 h-12 animate-spin text-red-500 mb-4" />
                <div className="text-2xl font-bold font-mono">REC</div>
                <div className="text-sm text-gray-300 mt-2">Nahrávám {resolution}...</div>
                <div className="w-64 h-2 bg-gray-700 rounded-full mt-6 overflow-hidden">
                  <div 
                    className="h-full bg-red-500 transition-all duration-75 ease-linear"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PRAVÝ PANEL - NASTAVENÍ */}
        <div className={`space-y-6 ${showSettings ? 'block' : 'hidden lg:block'}`}>
          
          {/* Délka videa */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Délka smyčky
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[2, 4, 8, 12].map((s) => (
                <button
                  key={s}
                  onClick={() => setDuration(s as Duration)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                    duration === s 
                      ? 'bg-blue-600 border-blue-500 text-white' 
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  {s} sekund
                </button>
              ))}
            </div>
          </div>

          {/* Rozlišení */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Monitor className="w-4 h-4" /> Rozlišení exportu
            </label>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value as Resolution)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {Object.entries(RESOLUTIONS).map(([key, val]) => (
                <option key={key} value={key}>{val.label} ({val.w}x{val.h})</option>
              ))}
            </select>
          </div>

          {/* Pozadí */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Palette className="w-4 h-4" /> Pozadí
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsTransparent(!isTransparent)}
                className={`flex-1 px-3 py-2 text-sm rounded-lg border flex items-center justify-center gap-2 transition-all ${
                  isTransparent 
                    ? 'bg-purple-600 border-purple-500 text-white' 
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                {isTransparent ? <CheckCircle2 className="w-4 h-4" /> : null}
                Průhledné
              </button>
              {!isTransparent && (
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer bg-transparent border-none"
                />
              )}
            </div>
          </div>

          {/* Kvalita */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <FileVideo className="w-4 h-4" /> Kvalita (Bitrate)
            </label>
            <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700">
              {(['low', 'medium', 'high'] as Quality[]).map((q) => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded capitalize transition-all ${
                    quality === q 
                      ? 'bg-gray-700 text-white shadow' 
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-800">
            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-lg flex items-start gap-2 text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}
            
            <button
              onClick={startRecording}
              disabled={isRecording}
              className={`
                w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all
                ${isRecording 
                  ? 'bg-gray-700 cursor-not-allowed opacity-50' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 hover:scale-[1.02] active:scale-[0.98] shadow-blue-900/20'
                }
              `}
            >
              {isRecording ? 'Nahrávání...' : 'Exportovat Video'}
              {!isRecording && <Download className="w-5 h-5" />}
            </button>
            <p className="text-xs text-gray-500 text-center mt-3">
              Výstup: WebM ({resolution}, {quality} quality)
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
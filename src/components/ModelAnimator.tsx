import { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  Play,
  Pause,
  StopCircle,
  Video,
  Download,
  RotateCw,
  Camera,
  Sun,
  Palette,
  Settings,
  Film,
  Image as ImageIcon,
  X,
  Check
} from 'lucide-react';

interface ModelAnimatorProps {
  modelUrl: string;
  onClose: () => void;
}

type CameraPreset = 'orbit' | 'top' | 'side' | 'front' | 'angle';
type AnimationType = 'rotate-y' | 'rotate-x' | 'turntable' | 'custom';
type BackgroundType = 'solid' | 'gradient' | 'transparent';

interface AnimationSettings {
  type: AnimationType;
  speed: number;
  direction: 1 | -1;
  duration: number;
  fps: number;
}

interface LightingSettings {
  ambient: number;
  directional: number;
  position: { x: number; y: number; z: number };
}

interface BackgroundSettings {
  type: BackgroundType;
  color1: string;
  color2: string;
}

export default function ModelAnimator({ modelUrl, onClose }: ModelAnimatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('orbit');
  const [activeTab, setActiveTab] = useState<'animation' | 'camera' | 'lighting' | 'background'>('animation');

  const [animationSettings, setAnimationSettings] = useState<AnimationSettings>({
    type: 'rotate-y',
    speed: 1,
    direction: 1,
    duration: 6,
    fps: 30,
  });

  const [lightingSettings, setLightingSettings] = useState<LightingSettings>({
    ambient: 0.5,
    directional: 1.0,
    position: { x: 5, y: 5, z: 5 },
  });

  const [backgroundSettings, setBackgroundSettings] = useState<BackgroundSettings>({
    type: 'gradient',
    color1: '#1e293b',
    color2: '#334155',
  });

  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: backgroundSettings.type === 'transparent',
      preserveDrawingBuffer: true,
    });

    renderer.setSize(800, 600);
    renderer.setPixelRatio(window.devicePixelRatio);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, lightingSettings.ambient);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, lightingSettings.directional);
    directionalLight.position.set(
      lightingSettings.position.x,
      lightingSettings.position.y,
      lightingSettings.position.z
    );
    scene.add(directionalLight);

    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene;

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        model.position.sub(center);

        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        model.scale.multiplyScalar(scale);

        scene.add(model);
        modelRef.current = model;

        applyCameraPreset('orbit');
      },
      undefined,
      (error) => {
        console.error('Error loading GLB model:', error);
      }
    );

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      renderer.dispose();
    };
  }, [modelUrl]);

  useEffect(() => {
    updateBackground();
  }, [backgroundSettings]);

  useEffect(() => {
    updateLighting();
  }, [lightingSettings]);

  const updateBackground = () => {
    if (!sceneRef.current || !rendererRef.current) return;

    if (backgroundSettings.type === 'transparent') {
      sceneRef.current.background = null;
      rendererRef.current.setClearColor(0x000000, 0);
    } else if (backgroundSettings.type === 'solid') {
      sceneRef.current.background = new THREE.Color(backgroundSettings.color1);
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 0, 512);
        gradient.addColorStop(0, backgroundSettings.color1);
        gradient.addColorStop(1, backgroundSettings.color2);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);

        const texture = new THREE.CanvasTexture(canvas);
        sceneRef.current.background = texture;
      }
    }
  };

  const updateLighting = () => {
    if (!sceneRef.current) return;

    sceneRef.current.children.forEach(child => {
      if (child instanceof THREE.AmbientLight) {
        child.intensity = lightingSettings.ambient;
      } else if (child instanceof THREE.DirectionalLight) {
        child.intensity = lightingSettings.directional;
        child.position.set(
          lightingSettings.position.x,
          lightingSettings.position.y,
          lightingSettings.position.z
        );
      }
    });
  };

  const applyCameraPreset = useCallback((preset: CameraPreset) => {
    if (!cameraRef.current || !modelRef.current) return;

    const camera = cameraRef.current;
    const distance = 5;

    switch (preset) {
      case 'orbit':
        camera.position.set(distance * 0.7, distance * 0.5, distance * 0.7);
        break;
      case 'top':
        camera.position.set(0, distance, 0);
        break;
      case 'side':
        camera.position.set(distance, 0, 0);
        break;
      case 'front':
        camera.position.set(0, 0, distance);
        break;
      case 'angle':
        camera.position.set(distance * 0.5, distance * 0.8, distance * 0.5);
        break;
    }

    camera.lookAt(0, 0, 0);
    setCameraPreset(preset);
  }, []);

  const animate = useCallback(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

    if (isPlaying && modelRef.current) {
      const speed = animationSettings.speed * animationSettings.direction * 0.01;

      switch (animationSettings.type) {
        case 'rotate-y':
          modelRef.current.rotation.y += speed;
          break;
        case 'rotate-x':
          modelRef.current.rotation.x += speed;
          break;
        case 'turntable':
          modelRef.current.rotation.y += speed;
          cameraRef.current.position.y = Math.sin(Date.now() * 0.0005) * 2 + 3;
          cameraRef.current.lookAt(0, 0, 0);
          break;
      }
    }

    rendererRef.current.render(sceneRef.current, cameraRef.current);
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [isPlaying, animationSettings]);

  useEffect(() => {
    animate();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animate]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    setIsPlaying(false);
    if (modelRef.current) {
      modelRef.current.rotation.set(0, 0, 0);
    }
  };

  const handleStartRecording = async () => {
    if (!canvasRef.current) return;

    try {
      const stream = canvasRef.current.captureStream(animationSettings.fps);

      const options: MediaRecorderOptions = {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5000000,
      };

      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options.mimeType = 'video/webm';
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `animation-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        setIsRecording(false);
        setRecordingProgress(0);
        setIsPlaying(false);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setIsPlaying(true);

      const durationMs = animationSettings.duration * 1000;
      const startTime = Date.now();

      const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / durationMs) * 100, 100);
        setRecordingProgress(progress);

        if (progress < 100) {
          requestAnimationFrame(updateProgress);
        } else {
          handleStopRecording();
        }
      };

      updateProgress();
    } catch (error) {
      console.error('Recording error:', error);
      alert('Nahrávání videa se nezdařilo. Zkuste to prosím znovu.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const handleCaptureScreenshot = () => {
    if (!canvasRef.current) return;

    canvasRef.current.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `model-screenshot-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-xl shadow-2xl max-w-7xl w-full max-h-[95vh] flex flex-col text-white">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Film className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold">3D Model Animator</h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 p-8">
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              className="max-w-full max-h-full shadow-2xl rounded-lg border-2 border-slate-700"
            />

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handlePlayPause}
                disabled={isRecording}
                className="p-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title={isPlaying ? 'Pauza' : 'Přehrát'}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>

              <button
                onClick={handleStop}
                disabled={isRecording}
                className="p-3 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Stop"
              >
                <StopCircle className="w-5 h-5" />
              </button>

              <div className="w-px h-8 bg-slate-700 mx-2" />

              <button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                disabled={isPlaying && !isRecording}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg font-semibold transition-colors ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Video className="w-5 h-5" />
                {isRecording ? `Nahrávání... ${Math.round(recordingProgress)}%` : 'Nahrát Video'}
              </button>

              <button
                onClick={handleCaptureScreenshot}
                className="flex items-center gap-2 px-4 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors font-medium"
              >
                <ImageIcon className="w-5 h-5" />
                Screenshot
              </button>
            </div>

            {isRecording && (
              <div className="w-full max-w-md mt-4">
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                    style={{ width: `${recordingProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col">
            <div className="flex border-b border-slate-700">
              <button
                onClick={() => setActiveTab('animation')}
                className={`flex-1 px-3 py-3 text-xs font-medium transition-colors ${
                  activeTab === 'animation'
                    ? 'bg-slate-700 text-blue-400 border-b-2 border-blue-500'
                    : 'text-slate-400 hover:bg-slate-750'
                }`}
              >
                <Film className="w-4 h-4 mx-auto mb-1" />
                Animace
              </button>
              <button
                onClick={() => setActiveTab('camera')}
                className={`flex-1 px-3 py-3 text-xs font-medium transition-colors ${
                  activeTab === 'camera'
                    ? 'bg-slate-700 text-blue-400 border-b-2 border-blue-500'
                    : 'text-slate-400 hover:bg-slate-750'
                }`}
              >
                <Camera className="w-4 h-4 mx-auto mb-1" />
                Kamera
              </button>
              <button
                onClick={() => setActiveTab('lighting')}
                className={`flex-1 px-3 py-3 text-xs font-medium transition-colors ${
                  activeTab === 'lighting'
                    ? 'bg-slate-700 text-blue-400 border-b-2 border-blue-500'
                    : 'text-slate-400 hover:bg-slate-750'
                }`}
              >
                <Sun className="w-4 h-4 mx-auto mb-1" />
                Světlo
              </button>
              <button
                onClick={() => setActiveTab('background')}
                className={`flex-1 px-3 py-3 text-xs font-medium transition-colors ${
                  activeTab === 'background'
                    ? 'bg-slate-700 text-blue-400 border-b-2 border-blue-500'
                    : 'text-slate-400 hover:bg-slate-750'
                }`}
              >
                <Palette className="w-4 h-4 mx-auto mb-1" />
                Pozadí
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeTab === 'animation' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-2 block">
                      Typ animace
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setAnimationSettings({ ...animationSettings, type: 'rotate-y' })}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          animationSettings.type === 'rotate-y'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        Rotace Y
                      </button>
                      <button
                        onClick={() => setAnimationSettings({ ...animationSettings, type: 'rotate-x' })}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          animationSettings.type === 'rotate-x'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        Rotace X
                      </button>
                      <button
                        onClick={() => setAnimationSettings({ ...animationSettings, type: 'turntable' })}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors col-span-2 ${
                          animationSettings.type === 'turntable'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        Turntable (360° + camera)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">
                      Rychlost: {animationSettings.speed}x
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="5"
                      step="0.1"
                      value={animationSettings.speed}
                      onChange={(e) =>
                        setAnimationSettings({ ...animationSettings, speed: parseFloat(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-2 block">
                      Směr
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setAnimationSettings({ ...animationSettings, direction: 1 })}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          animationSettings.direction === 1
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        Doprava →
                      </button>
                      <button
                        onClick={() => setAnimationSettings({ ...animationSettings, direction: -1 })}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          animationSettings.direction === -1
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        ← Doleva
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">
                      Délka videa: {animationSettings.duration}s
                    </label>
                    <input
                      type="range"
                      min="2"
                      max="30"
                      step="1"
                      value={animationSettings.duration}
                      onChange={(e) =>
                        setAnimationSettings({ ...animationSettings, duration: parseInt(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">
                      FPS: {animationSettings.fps}
                    </label>
                    <input
                      type="range"
                      min="15"
                      max="60"
                      step="15"
                      value={animationSettings.fps}
                      onChange={(e) =>
                        setAnimationSettings({ ...animationSettings, fps: parseInt(e.target.value) })
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>15</span>
                      <span>30</span>
                      <span>60</span>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'camera' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-2 block">
                      Preset pozice kamery
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => applyCameraPreset('orbit')}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          cameraPreset === 'orbit'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        Orbital
                      </button>
                      <button
                        onClick={() => applyCameraPreset('top')}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          cameraPreset === 'top'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        Shora
                      </button>
                      <button
                        onClick={() => applyCameraPreset('side')}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          cameraPreset === 'side'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        Z boku
                      </button>
                      <button
                        onClick={() => applyCameraPreset('front')}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          cameraPreset === 'front'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        Zepředu
                      </button>
                      <button
                        onClick={() => applyCameraPreset('angle')}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors col-span-2 ${
                          cameraPreset === 'angle'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        Úhel 45°
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-700">
                    <p className="text-xs text-slate-400">
                      💡 Tip: Orbital pohled je ideální pro turntable animace
                    </p>
                  </div>
                </>
              )}

              {activeTab === 'lighting' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">
                      Ambient Light: {lightingSettings.ambient.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={lightingSettings.ambient}
                      onChange={(e) =>
                        setLightingSettings({ ...lightingSettings, ambient: parseFloat(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">
                      Directional Light: {lightingSettings.directional.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="3"
                      step="0.1"
                      value={lightingSettings.directional}
                      onChange={(e) =>
                        setLightingSettings({ ...lightingSettings, directional: parseFloat(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>

                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-700">
                    <p className="text-xs font-semibold text-slate-300 mb-2">Pozice světla</p>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-slate-400">X: {lightingSettings.position.x}</label>
                        <input
                          type="range"
                          min="-10"
                          max="10"
                          step="0.5"
                          value={lightingSettings.position.x}
                          onChange={(e) =>
                            setLightingSettings({
                              ...lightingSettings,
                              position: { ...lightingSettings.position, x: parseFloat(e.target.value) },
                            })
                          }
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400">Y: {lightingSettings.position.y}</label>
                        <input
                          type="range"
                          min="-10"
                          max="10"
                          step="0.5"
                          value={lightingSettings.position.y}
                          onChange={(e) =>
                            setLightingSettings({
                              ...lightingSettings,
                              position: { ...lightingSettings.position, y: parseFloat(e.target.value) },
                            })
                          }
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400">Z: {lightingSettings.position.z}</label>
                        <input
                          type="range"
                          min="-10"
                          max="10"
                          step="0.5"
                          value={lightingSettings.position.z}
                          onChange={(e) =>
                            setLightingSettings({
                              ...lightingSettings,
                              position: { ...lightingSettings.position, z: parseFloat(e.target.value) },
                            })
                          }
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'background' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-2 block">
                      Typ pozadí
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setBackgroundSettings({ ...backgroundSettings, type: 'solid' })}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          backgroundSettings.type === 'solid'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        Solid
                      </button>
                      <button
                        onClick={() => setBackgroundSettings({ ...backgroundSettings, type: 'gradient' })}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          backgroundSettings.type === 'gradient'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        Gradient
                      </button>
                      <button
                        onClick={() => setBackgroundSettings({ ...backgroundSettings, type: 'transparent' })}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          backgroundSettings.type === 'transparent'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        Průhledné
                      </button>
                    </div>
                  </div>

                  {backgroundSettings.type !== 'transparent' && (
                    <div>
                      <label className="text-xs font-semibold text-slate-300 mb-2 block">
                        Barva {backgroundSettings.type === 'gradient' ? '1 (horní)' : ''}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={backgroundSettings.color1}
                          onChange={(e) =>
                            setBackgroundSettings({ ...backgroundSettings, color1: e.target.value })
                          }
                          className="w-16 h-10 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={backgroundSettings.color1}
                          onChange={(e) =>
                            setBackgroundSettings({ ...backgroundSettings, color1: e.target.value })
                          }
                          className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white"
                        />
                      </div>
                    </div>
                  )}

                  {backgroundSettings.type === 'gradient' && (
                    <div>
                      <label className="text-xs font-semibold text-slate-300 mb-2 block">
                        Barva 2 (spodní)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={backgroundSettings.color2}
                          onChange={(e) =>
                            setBackgroundSettings({ ...backgroundSettings, color2: e.target.value })
                          }
                          className="w-16 h-10 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={backgroundSettings.color2}
                          onChange={(e) =>
                            setBackgroundSettings({ ...backgroundSettings, color2: e.target.value })
                          }
                          className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white"
                        />
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-700">
                    <p className="text-xs text-slate-400">
                      💡 Průhledné pozadí je ideální pro sociální sítě a kompozice
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-700 bg-slate-800">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">
              <p>
                {animationSettings.duration}s @ {animationSettings.fps} FPS = ~
                {Math.round((animationSettings.duration * animationSettings.fps * 100) / 1024)} KB video
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors font-medium"
            >
              Zavřít
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

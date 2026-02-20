import { useState, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import {
  Box, Sparkles, Images, Edit3, Layout, Upload, Bone, Zap,
  Paintbrush, Grid3x3, Play, Menu, X, Eye, ImageIcon, Wand2, Clock
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';

import ImageUpload from './components/ImageUpload';
import MultiImageUpload from './components/MultiImageUpload';
import InstructionsChat from './components/InstructionsChat';
import ThreeViewer from './components/ThreeViewer';
import GLBViewer from './components/GLBViewer';
import EnhancedGLBViewer from './components/EnhancedGLBViewer';
import ParameterControls from './components/ParameterControls';
import LoadingEntertainment from './components/LoadingEntertainment';
import ImageEditor from './components/ImageEditor';
import { TextTo3DGenerator } from './components/TextTo3DGenerator';
import { RiggingControl } from './components/RiggingControl';
import { RetextureControl } from './components/RetextureControl';
import { RemeshControl } from './components/RemeshControl';
import { AnimationControl } from './components/AnimationControl';
import { HelmetTools } from './components/HelmetTools';
import { StlAnalysisPanel } from './components/StlAnalysisPanel';
import { TextToImageGenerator } from './components/TextToImageGenerator';
import { ImageToImageGenerator } from './components/ImageToImageGenerator';
import { BalanceDisplay } from './components/BalanceDisplay';
import ModelHistory from './components/ModelHistory';

import {
  exportToOBJ, exportToSTL, exportToPLY, exportToFBX, downloadFile,
} from './services/exporters';
import { generateModelFromImage, QualityPreset } from './services/triposrService';

type UploadMode = 'single' | 'multi';
type GenerationMode = 'image' | 'text' | 'text-to-image' | 'image-to-image';

function App() {
  const [currentImage, setCurrentImage] = useState<{ file: File; url: string } | null>(null);
  const [currentImages, setCurrentImages] = useState<{ files: File[]; urls: string[] }>({ files: [], urls: [] });
  const [uploadMode, setUploadMode] = useState<UploadMode>('single');
  const [generationMode, setGenerationMode] = useState<GenerationMode>('image');

  const [instructions, setInstructions] = useState<string>('');
  const [qualityPreset, setQualityPreset] = useState<QualityPreset>('quality');

  const [mesh, setMesh] = useState<THREE.Mesh | null>(null);
  const [aiModelUrl, setAiModelUrl] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  const [showEditor, setShowEditor] = useState(false);
  const [editingFile, setEditingFile] = useState<File | null>(null);
  const [useEnhancedViewer] = useState(true);
  const [activeTab, setActiveTab] = useState<'upload' | 'viewer' | 'history'>('upload');
  const [rigTaskId, setRigTaskId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const cancelProcessing = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort('User cancelled');
      abortControllerRef.current = null;
      setIsProcessing(false);
      setProgress(0);
      setProgressMessage('');
      toast('Proces zrusen', {
        style: { background: '#0B0F14', color: '#F4F4F4', border: '1px solid #00F5FF' }
      });
    }
  }, []);

  const processImageWithAI = useCallback(async (
    imageUrl: string,
    file: File,
    additionalFiles?: File[],
    userInstructions?: string,
    quality?: QualityPreset
  ) => {
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsProcessing(true);
    setProgress(0);
    setProgressMessage('Startuji NewAge Engine...');
    setAiModelUrl(null);
    setMesh(null);

    try {
      const result = await generateModelFromImage(
        imageUrl, file, additionalFiles, userInstructions,
        quality || qualityPreset, signal,
        (p, msg) => {
          setProgress(p);
          setProgressMessage(msg);
        }
      );

      if (result.model_url) {
        setAiModelUrl(result.model_url);
        setProgress(1);
        setProgressMessage('Hotovo!');
        toast.success('Model vygenerovan!', {
          style: { background: '#0B0F14', color: '#F4F4F4', border: '1px solid #00F5FF' },
          iconTheme: { primary: '#00F5FF', secondary: '#F4F4F4' }
        });
      } else {
        throw new Error('No model URL received');
      }

      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        setActiveTab('viewer');
      }, 500);

    } catch (error) {
      console.error('AI processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (!errorMessage.includes('cancelled')) {
        toast.error(`Chyba: ${errorMessage}`, {
          style: { background: '#0B0F14', color: '#F4F4F4', border: '1px solid #00F5FF' }
        });
      }
      setIsProcessing(false);
      setProgress(0);
    }
  }, [qualityPreset]);

  const handleTextTo3DReady = useCallback((url: string) => {
    setAiModelUrl(url);
    setActiveTab('viewer');
    toast.success('Model pripraven!', {
      style: { background: '#0B0F14', color: '#F4F4F4', border: '1px solid #00F5FF' },
      iconTheme: { primary: '#00F5FF', secondary: '#F4F4F4' }
    });
  }, []);

  const handleAiImageReady = useCallback((imageUrl: string) => {
    setGenerationMode('image');
    setUploadMode('single');
    fetch(imageUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], 'ai-generated.png', { type: 'image/png' });
        const url = URL.createObjectURL(file);
        setCurrentImage({ file, url });
        toast.success('Obrazek pripraven k 3D generovani', {
          style: { background: '#0B0F14', color: '#F4F4F4', border: '1px solid #00F5FF' },
          iconTheme: { primary: '#00F5FF', secondary: '#F4F4F4' }
        });
      })
      .catch(() => {
        toast.error('Nelze nacist obrazek');
      });
  }, []);

  const handleRiggingComplete = useCallback((url: string, taskId?: string) => {
    setAiModelUrl(url);
    if (taskId) setRigTaskId(taskId);
    toast.success('Rigging dokoncen!', {
      style: { background: '#0B0F14', color: '#F4F4F4', border: '1px solid #00F5FF' },
      iconTheme: { primary: '#00F5FF', secondary: '#F4F4F4' }
    });
  }, []);

  const handleImageUpload = useCallback((file: File, imageUrl: string) => {
    if (file.name.toLowerCase().endsWith('.stl')) {
      const loader = new STLLoader();
      loader.load(imageUrl, (geometry) => {
        const material = new THREE.MeshStandardMaterial({
          color: 0x60a5fa,
          roughness: 0.5,
          metalness: 0.1
        });
        geometry.computeBoundingBox();
        geometry.center();
        const newMesh = new THREE.Mesh(geometry, material);
        setMesh(newMesh);
        setAiModelUrl(null);
        setActiveTab('viewer');
        toast.success('STL model nacten', {
          style: { background: '#0B0F14', color: '#F4F4F4', border: '1px solid #3B82F6' },
        });
      }, undefined, () => {
        toast.error('Chyba pri nacitani STL souboru');
      });
      return;
    }
    setCurrentImage({ file, url: imageUrl });
  }, []);

  const handleMultiImageUpload = useCallback((files: File[], imageUrls: string[]) => {
    setCurrentImages({ files, urls: imageUrls });
  }, []);

  const handleGenerate = useCallback(() => {
    if (uploadMode === 'single' && currentImage) {
      processImageWithAI(currentImage.url, currentImage.file, undefined, instructions);
    } else if (uploadMode === 'multi' && currentImages.files.length > 0) {
      const [main, ...rest] = currentImages.files;
      processImageWithAI(currentImages.urls[0], main, rest, instructions);
    }
  }, [uploadMode, currentImage, currentImages, processImageWithAI, instructions]);

  const handleOpenEditor = useCallback(() => {
    if (uploadMode === 'single' && currentImage) setEditingFile(currentImage.file);
    else if (uploadMode === 'multi' && currentImages.files.length > 0) setEditingFile(currentImages.files[0]);
    if (currentImage || currentImages.files.length > 0) setShowEditor(true);
  }, [uploadMode, currentImage, currentImages]);

  const handleEditorSave = useCallback((editedFile: File) => {
    const url = URL.createObjectURL(editedFile);
    if (uploadMode === 'single') setCurrentImage({ file: editedFile, url });
    else {
      const newFiles = [editedFile, ...currentImages.files.slice(1)];
      const newUrls = [url, ...currentImages.urls.slice(1)];
      setCurrentImages({ files: newFiles, urls: newUrls });
    }
    setShowEditor(false);
    setEditingFile(null);
  }, [uploadMode, currentImages]);

  const handleEditorCancel = useCallback(() => {
    setShowEditor(false);
    setEditingFile(null);
  }, []);

  const handleExport = useCallback((format: 'obj' | 'stl' | 'ply' | 'fbx') => {
    if (!mesh) {
      toast.error('Pouzijte tlacitko Download GLB pro AI modely', { style: { background: '#0B0F14', color: '#F4F4F4' } });
      return;
    }
    const filename = currentImage?.file.name.replace(/\.[^/.]+$/, '') || 'model';
    try {
      if (format === 'obj') downloadFile(exportToOBJ(mesh), `${filename}.obj`, 'text/plain');
      if (format === 'stl') downloadFile(exportToSTL(mesh), `${filename}.stl`, 'text/plain');
      if (format === 'ply') downloadFile(exportToPLY(mesh), `${filename}.ply`, 'text/plain');
      if (format === 'fbx') downloadFile(exportToFBX(mesh), `${filename}.fbx`, 'text/plain');
      toast.success(`Export ${format.toUpperCase()} hotov`, { style: { background: '#0B0F14', color: '#F4F4F4', border: '1px solid #00F5FF' } });
    } catch {
      toast.error('Chyba exportu');
    }
  }, [mesh, currentImage]);

  const handleScaleChange = useCallback((newScale: [number, number, number]) => {
    if (mesh) {
      mesh.scale.set(...newScale);
      setMesh(mesh);
    }
  }, [mesh]);

  const hasModel = mesh || aiModelUrl;
  const hasUploadedImage = (uploadMode === 'single' && currentImage) || (uploadMode === 'multi' && currentImages.files.length > 0);

  return (
    <div className="h-screen flex flex-col bg-brand-dark text-brand-light font-sans overflow-hidden selection:bg-brand-accent selection:text-white">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0B0F14',
            color: '#F4F4F4',
            border: '1px solid #1E293B',
            fontFamily: '"Inter", "Arial Nova", sans-serif',
            borderRadius: '12px',
            fontSize: '13px',
          },
        }}
      />

      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/95 backdrop-blur-md">
          <LoadingEntertainment
            progress={progress}
            message={progressMessage}
            onCancel={cancelProcessing}
            cancellable={true}
          />
        </div>
      )}

      {/* HEADER */}
      <header className="bg-gradient-to-b from-brand-panel to-brand-panel/95 border-b border-brand-accent/10 flex-shrink-0 z-10 relative shadow-lg">
        <div className="px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden flex-shrink-0 transition-transform hover:scale-105 shadow-glow">
                <img
                  src="/WhatsApp_Image_2026-02-19_at_15.24.41.jpeg"
                  alt="NewAge Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-spartan font-bold tracking-wide flex items-baseline gap-0">
                  <span className="text-brand-light">NewAge</span>
                  <span className="inline-block w-px h-5 bg-brand-accent/50 mx-1.5 self-center"></span>
                  <span className="text-brand-accent">.</span>
                </h1>
                <p className="text-[10px] sm:text-xs text-brand-muted/80 tracking-[0.15em] uppercase font-semibold">
                  AI-Powered 3D Generation Suite
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <BalanceDisplay />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-brand-muted hover:text-brand-light transition-colors rounded-lg hover:bg-brand-dark/30"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center justify-between gap-6">
            {/* Generation Modes */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[9px] font-bold text-brand-muted uppercase tracking-wider px-2">Generovani</span>
              <div className="flex bg-brand-dark/70 rounded-xl p-1.5 border border-brand-light/5 shadow-inner">
                <button
                  onClick={() => setGenerationMode('image')}
                  className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
                    generationMode === 'image'
                      ? 'bg-brand-accent text-brand-dark shadow-glow'
                      : 'text-brand-muted hover:text-brand-light hover:bg-brand-light/5'
                  }`}
                >
                  <Images className="w-4 h-4" /> Image → 3D
                </button>
                <button
                  onClick={() => setGenerationMode('text')}
                  className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
                    generationMode === 'text'
                      ? 'bg-brand-accent text-brand-dark shadow-glow'
                      : 'text-brand-muted hover:text-brand-light hover:bg-brand-light/5'
                  }`}
                >
                  <Edit3 className="w-4 h-4" /> Text → 3D
                </button>
                <div className="w-px bg-brand-light/10 mx-1"></div>
                <button
                  onClick={() => setGenerationMode('text-to-image')}
                  className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
                    generationMode === 'text-to-image'
                      ? 'bg-brand-accent text-brand-dark shadow-glow'
                      : 'text-brand-muted hover:text-brand-light hover:bg-brand-light/5'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" /> Text → Img
                </button>
                <button
                  onClick={() => setGenerationMode('image-to-image')}
                  className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
                    generationMode === 'image-to-image'
                      ? 'bg-brand-accent text-brand-dark shadow-glow'
                      : 'text-brand-muted hover:text-brand-light hover:bg-brand-light/5'
                  }`}
                >
                  <Wand2 className="w-4 h-4" /> Img → Img
                </button>
              </div>
            </div>

            {/* Workspace Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border-2 ${
                  activeTab === 'upload'
                    ? 'border-brand-accent text-brand-light bg-brand-accent/10'
                    : 'border-brand-light/10 text-brand-muted hover:text-brand-light hover:border-brand-light/20'
                }`}
              >
                <Upload className="w-4 h-4" /> Studio
              </button>
              <button
                onClick={() => setActiveTab('viewer')}
                disabled={!hasModel}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border-2 relative ${
                  activeTab === 'viewer'
                    ? 'border-brand-accent text-brand-light bg-brand-accent/10'
                    : 'border-brand-light/10 text-brand-muted hover:text-brand-light hover:border-brand-light/20'
                } disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                <Layout className="w-4 h-4" /> Viewer
                {hasModel && activeTab !== 'viewer' && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-brand-accent rounded-full animate-pulse"></span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border-2 ${
                  activeTab === 'history'
                    ? 'border-brand-accent text-brand-light bg-brand-accent/10'
                    : 'border-brand-light/10 text-brand-muted hover:text-brand-light hover:border-brand-light/20'
                }`}
              >
                <Clock className="w-4 h-4" /> History
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-brand-accent/10 px-4 py-4 space-y-4 bg-gradient-to-b from-brand-panel to-brand-dark/50 animate-slide-down shadow-2xl">
            {/* Generation Modes Section */}
            <div className="space-y-2">
              <span className="text-[9px] font-bold text-brand-muted uppercase tracking-wider px-1">Režim generování</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setGenerationMode('image'); setMobileMenuOpen(false); }}
                  className={`py-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all border ${
                    generationMode === 'image'
                      ? 'bg-brand-accent text-brand-light shadow-glow border-brand-accent'
                      : 'bg-brand-dark/50 text-brand-muted border-brand-light/5 hover:border-brand-light/20'
                  }`}
                >
                  <Images className="w-5 h-5" />
                  <span>Image → 3D</span>
                </button>
                <button
                  onClick={() => { setGenerationMode('text'); setMobileMenuOpen(false); }}
                  className={`py-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all border ${
                    generationMode === 'text'
                      ? 'bg-brand-accent text-brand-light shadow-glow border-brand-accent'
                      : 'bg-brand-dark/50 text-brand-muted border-brand-light/5 hover:border-brand-light/20'
                  }`}
                >
                  <Edit3 className="w-5 h-5" />
                  <span>Text → 3D</span>
                </button>
                <button
                  onClick={() => { setGenerationMode('text-to-image'); setMobileMenuOpen(false); }}
                  className={`py-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all border ${
                    generationMode === 'text-to-image'
                      ? 'bg-brand-accent text-brand-light shadow-glow border-brand-accent'
                      : 'bg-brand-dark/50 text-brand-muted border-brand-light/5 hover:border-brand-light/20'
                  }`}
                >
                  <ImageIcon className="w-5 h-5" />
                  <span>Text → Img</span>
                </button>
                <button
                  onClick={() => { setGenerationMode('image-to-image'); setMobileMenuOpen(false); }}
                  className={`py-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all border ${
                    generationMode === 'image-to-image'
                      ? 'bg-brand-accent text-brand-light shadow-glow border-brand-accent'
                      : 'bg-brand-dark/50 text-brand-muted border-brand-light/5 hover:border-brand-light/20'
                  }`}
                >
                  <Wand2 className="w-5 h-5" />
                  <span>Img → Img</span>
                </button>
              </div>
            </div>

            {/* Workspace Section */}
            <div className="space-y-2">
              <span className="text-[9px] font-bold text-brand-muted uppercase tracking-wider px-1">Pracovní prostor</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => { setActiveTab('upload'); setMobileMenuOpen(false); }}
                  className={`py-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 border-2 transition-all ${
                    activeTab === 'upload'
                      ? 'border-brand-accent text-brand-accent bg-brand-accent/10'
                      : 'border-brand-light/10 text-brand-muted hover:border-brand-light/20'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>Studio</span>
                </button>
                <button
                  onClick={() => { setActiveTab('viewer'); setMobileMenuOpen(false); }}
                  disabled={!hasModel}
                  className={`py-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 border-2 transition-all relative ${
                    activeTab === 'viewer'
                      ? 'border-brand-accent text-brand-accent bg-brand-accent/10'
                      : 'border-brand-light/10 text-brand-muted hover:border-brand-light/20'
                  } disabled:opacity-30 disabled:cursor-not-allowed`}
                >
                  <Layout className="w-4 h-4" />
                  <span>Viewer</span>
                  {hasModel && activeTab !== 'viewer' && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-brand-accent rounded-full animate-pulse"></span>
                  )}
                </button>
                <button
                  onClick={() => { setActiveTab('history'); setMobileMenuOpen(false); }}
                  className={`py-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 border-2 transition-all ${
                    activeTab === 'history'
                      ? 'border-brand-accent text-brand-accent bg-brand-accent/10'
                      : 'border-brand-light/10 text-brand-muted hover:border-brand-light/20'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>History</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-brand-accent/5 blur-[150px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-1/4 h-1/4 bg-brand-accent/5 blur-[120px] rounded-full pointer-events-none" />

        {/* UPLOAD TAB */}
        {activeTab === 'upload' && (
          <div className="h-full overflow-y-auto">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 animate-fade-in">

              {/* Mobile: Floating preview button */}
              {hasModel && (
                <div className="lg:hidden mb-4">
                  <button
                    onClick={() => setMobilePreviewOpen(!mobilePreviewOpen)}
                    className="w-full py-3 bg-brand-panel border border-brand-accent/30 rounded-xl text-sm font-bold flex items-center justify-center gap-2 text-brand-accent hover:bg-brand-accent/5 transition-all"
                  >
                    <Eye className="w-4 h-4" />
                    {mobilePreviewOpen ? 'Skryt nahled modelu' : 'Zobrazit nahled modelu'}
                  </button>
                  {mobilePreviewOpen && (
                    <div className="mt-3 bg-brand-dark rounded-2xl border border-brand-accent overflow-hidden h-56 relative shadow-glow">
                      <div className="absolute inset-0">
                        {aiModelUrl ? <GLBViewer modelUrl={aiModelUrl} /> : <ThreeViewer mesh={mesh} />}
                      </div>
                      <button
                        onClick={() => setActiveTab('viewer')}
                        className="absolute bottom-3 right-3 bg-brand-accent text-brand-dark px-4 py-2 rounded-lg text-xs font-bold shadow-glow flex items-center gap-2"
                      >
                        <Layout className="w-4 h-4" /> Otevrit ve Vieweru
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                {/* LEFT PANEL */}
                <div className="lg:col-span-8 space-y-6">
                  <div className="bg-gradient-to-br from-brand-panel to-brand-panel/80 border border-brand-accent/10 rounded-3xl shadow-2xl p-6 sm:p-10 backdrop-blur-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-accent via-brand-accent/50 to-transparent"></div>
                    <div className="absolute top-0 right-0 w-96 h-96 bg-brand-accent/5 blur-[100px] rounded-full pointer-events-none"></div>

                    {generationMode === 'image' ? (
                      <>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 sm:mb-10 gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-accent to-brand-accent/70 flex items-center justify-center text-brand-light shadow-glow relative">
                              <Images className="w-5 h-5 text-brand-dark" />
                              <div className="absolute inset-0 rounded-xl bg-brand-light/10 blur-md"></div>
                            </div>
                            <div>
                              <h2 className="text-lg sm:text-xl font-spartan font-bold text-brand-light">
                                Nahrat podklady
                              </h2>
                              <p className="text-[10px] text-brand-muted/70 uppercase tracking-wider">Vstupní materiály</p>
                            </div>
                          </div>
                          <div className="flex bg-brand-dark p-1 rounded-lg border border-brand-light/5 self-start sm:self-auto">
                            <button
                              onClick={() => setUploadMode('single')}
                              className={`px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${uploadMode === 'single' ? 'bg-brand-accent text-brand-dark shadow-glow' : 'text-brand-muted hover:text-brand-light'}`}
                            >
                              Single
                            </button>
                            <button
                              onClick={() => setUploadMode('multi')}
                              className={`px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${uploadMode === 'multi' ? 'bg-brand-accent text-brand-dark shadow-glow' : 'text-brand-muted hover:text-brand-light'}`}
                            >
                              Multi-View
                            </button>
                          </div>
                        </div>

                        <div className="mb-6 sm:mb-8 group">
                          {uploadMode === 'multi' ? (
                            <MultiImageUpload onImagesUpload={handleMultiImageUpload} disabled={isProcessing} />
                          ) : (
                            <ImageUpload onImageUpload={handleImageUpload} disabled={isProcessing} />
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 relative">
                          <div className="bg-gradient-to-br from-brand-dark/60 to-brand-dark/40 p-5 sm:p-6 rounded-2xl border border-brand-light/10 hover:border-brand-accent/30 transition-all shadow-lg">
                            <label className="block text-[10px] font-bold text-brand-muted uppercase mb-4 flex items-center gap-2 tracking-wider">
                              <Sparkles className="w-3.5 h-3.5 text-brand-accent" /> Kvalita vystupu
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                              {['fast', 'quality', 'ultra'].map((q) => (
                                <button
                                  key={q}
                                  onClick={() => setQualityPreset(q as QualityPreset)}
                                  className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                                    qualityPreset === q
                                      ? 'border-brand-accent bg-brand-accent/15 text-brand-accent shadow-glow scale-105'
                                      : 'border-brand-light/10 bg-brand-dark/30 text-brand-muted hover:border-brand-light/30 hover:text-brand-light hover:scale-102'
                                  }`}
                                >
                                  {q.charAt(0).toUpperCase() + q.slice(1)}
                                </button>
                              ))}
                            </div>
                          </div>

                          {hasUploadedImage && (
                            <div className="flex flex-col gap-3 justify-center">
                              {/* OPRAVA: Přidán náhled aktuálního aktivního vstupu (editovaného obrázku) */}
                              {uploadMode === 'single' && currentImage && (
                                <div className="w-full aspect-video bg-black/20 rounded-xl border border-brand-light/10 overflow-hidden relative mb-2 group">
                                  <img 
                                    src={currentImage.url} 
                                    alt="Aktivni vstup" 
                                    className="w-full h-full object-contain" 
                                  />
                                  <div className="absolute top-2 right-2 bg-brand-accent px-2 py-1 rounded text-[10px] font-bold shadow-lg">
                                    AKTIVNÍ VSTUP
                                  </div>
                                </div>
                              )}
                              
                              <button
                                onClick={handleOpenEditor}
                                disabled={isProcessing}
                                className="w-full py-3 bg-gradient-to-r from-brand-dark/80 to-brand-dark/60 hover:from-brand-dark hover:to-brand-dark/80 border-2 border-brand-light/10 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:border-brand-light/30 text-brand-muted hover:text-brand-light shadow-lg"
                              >
                                <Edit3 className="w-4 h-4" /> Editor obrazku
                              </button>
                              <button
                                onClick={handleGenerate}
                                disabled={isProcessing}
                                className="w-full py-4 bg-gradient-to-r from-brand-accent to-brand-accent/80 hover:from-brand-accent/90 hover:to-brand-accent/70 rounded-xl text-brand-light text-sm font-bold shadow-glow flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
                                <Sparkles className="w-5 h-5 relative z-10" />
                                <span className="relative z-10">Generovat Model</span>
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="mt-6 sm:mt-8">
                          <InstructionsChat onInstructionsChange={setInstructions} disabled={isProcessing} />
                        </div>
                      </>
                    ) : generationMode === 'text' ? (
                      <div className="py-4">
                        <div className="mb-6 sm:mb-8">
                          <h2 className="text-lg sm:text-xl font-spartan font-bold flex items-center gap-3 mb-2 text-brand-light">
                            <span className="w-8 h-8 rounded bg-brand-accent/20 flex items-center justify-center text-brand-accent border border-brand-accent/20">
                              <Edit3 className="w-5 h-5" />
                            </span>
                            Text to 3D
                          </h2>
                          <p className="text-brand-muted text-sm">Popiste svou vizi a nechte AI vytvorit model behem par vterin.</p>
                        </div>
                        <TextTo3DGenerator onModelReady={handleTextTo3DReady} />
                      </div>
                    ) : generationMode === 'text-to-image' ? (
                      <div className="py-4">
                        <TextToImageGenerator onImageReady={handleAiImageReady} />
                      </div>
                    ) : generationMode === 'image-to-image' ? (
                      <div className="py-4">
                        <ImageToImageGenerator
                          onModelGenerated={handleTextTo3DReady}
                          onError={(msg) => toast.error(msg, { style: { background: '#0B0F14', color: '#F4F4F4', border: '1px solid #00F5FF' } })}
                          onSendToMultiView={(file, url) => {
                            setCurrentImage({ file, url });
                            setGenerationMode('image');
                            setUploadMode('single');
                            toast.success('Obrazek prenesen do Multi-View', {
                              style: { background: '#0B0F14', color: '#F4F4F4', border: '1px solid #00F5FF' },
                              iconTheme: { primary: '#00F5FF', secondary: '#F4F4F4' }
                            });
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* RIGHT PANEL - hidden on mobile, visible on lg */}
                <div className="hidden lg:block lg:col-span-4 space-y-6 relative z-0">
                  {hasModel ? (
                    <div className="bg-gradient-to-br from-brand-dark to-brand-panel rounded-3xl border-2 border-brand-accent/30 overflow-hidden h-72 relative shadow-2xl group">
                      <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/5 to-transparent"></div>
                      <div className="absolute inset-0">
                        {aiModelUrl ? <GLBViewer modelUrl={aiModelUrl} /> : <ThreeViewer mesh={mesh} />}
                      </div>
                      <div className="absolute top-3 right-3 bg-brand-panel/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-brand-light/10 flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-bold text-brand-light uppercase tracking-wider">Nahled</span>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center pb-8">
                        <button
                          onClick={() => setActiveTab('viewer')}
                          className="bg-gradient-to-r from-brand-accent to-brand-accent/80 text-brand-dark px-8 py-3.5 rounded-full font-bold transform translate-y-4 group-hover:translate-y-0 transition-all shadow-glow flex items-center gap-2 hover:scale-105"
                        >
                          <Layout className="w-5 h-5" /> Otevrit ve Vieweru
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-br from-brand-panel to-brand-dark/50 border border-brand-light/5 rounded-3xl p-10 text-center h-72 flex flex-col items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,0,60,0.05),transparent_50%)]"></div>
                      <div className="relative z-10">
                        <div className="w-24 h-24 bg-gradient-to-br from-brand-dark to-brand-panel rounded-2xl flex items-center justify-center mb-5 shadow-2xl border border-brand-light/5 mx-auto">
                          <Box className="w-10 h-10 text-brand-muted/50" />
                        </div>
                        <p className="text-brand-muted font-bold tracking-wide text-sm">ZATÍM ŽÁDNÝ MODEL</p>
                        <p className="text-brand-muted/50 text-xs mt-2 font-sans max-w-[200px] mx-auto leading-relaxed">
                          Nahrajte obrázek nebo zadejte text pro generování
                        </p>
                      </div>
                    </div>
                  )}

                  {aiModelUrl && (
                    <div className="bg-gradient-to-br from-brand-panel to-brand-panel/80 border-l-4 border-brand-accent rounded-2xl p-6 shadow-2xl relative overflow-hidden group hover:border-l-[6px] transition-all">
                      <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                        <Bone className="w-32 h-32 text-brand-light" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="flex items-center gap-3 mb-5 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-accent/20 to-brand-accent/10 flex items-center justify-center border border-brand-accent/20">
                          <Bone className="text-brand-accent w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-spartan font-bold text-base text-brand-light">AI Rigging</h3>
                          <p className="text-[10px] text-brand-muted/70 uppercase tracking-wider">Automatická kostra</p>
                        </div>
                      </div>
                      <div className="relative z-10">
                        <RiggingControl modelUrl={aiModelUrl} onRigged={handleRiggingComplete} />
                      </div>
                    </div>
                  )}

                  <div className="bg-brand-panel border border-brand-light/5 rounded-2xl p-6 relative">
                    <ParameterControls
                      params={{ resolution: 3, depthScale: 3.0, smoothness: 0.5 }}
                      onParamsChange={() => {}}
                      onRegenerate={handleGenerate}
                      onExport={handleExport}
                      disabled={(!hasModel) || isProcessing}
                      showParams={false}
                      aiModelUrl={aiModelUrl}
                    />
                  </div>

                  <div className="bg-gradient-to-br from-brand-accent/15 via-brand-accent/10 to-brand-panel rounded-2xl p-6 border border-brand-accent/30 relative overflow-hidden group hover:shadow-glow transition-all">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/10 blur-3xl rounded-full"></div>
                    <div className="relative z-10 flex items-start gap-4">
                      <div className="bg-gradient-to-br from-brand-accent to-brand-accent/70 p-2.5 rounded-xl shadow-glow flex-shrink-0">
                        <Zap className="w-5 h-5 text-brand-light" />
                      </div>
                      <div>
                        <h4 className="font-bold text-brand-light mb-2 font-spartan text-sm flex items-center gap-2">
                          NEWAGE TIP
                          <span className="text-[9px] bg-brand-accent/20 px-2 py-0.5 rounded-full text-brand-accent">PRO</span>
                        </h4>
                        <p className="text-xs text-brand-muted/90 leading-relaxed font-sans">
                          Podporované formáty: <span className="text-brand-light font-semibold">JPG, PNG</span> pro AI generování a <span className="text-brand-light font-semibold">STL</span> pro analýzu tisku. STL soubory se automaticky zobrazují s nástroji pro tisk.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEWER TAB */}
        {activeTab === 'viewer' && hasModel && (
          <div className="h-full relative bg-[#050508] animate-fade-in">
            {/* Overlay UI */}
            <div className="absolute top-4 sm:top-6 left-4 sm:left-6 z-20 flex flex-col gap-3 sm:gap-4 max-w-[calc(100vw-2rem)] sm:max-w-none">
              <button
                onClick={() => setActiveTab('upload')}
                className="bg-gradient-to-r from-brand-panel/95 to-brand-panel/90 backdrop-blur-xl border-2 border-brand-light/10 text-brand-light px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold hover:border-brand-accent/50 hover:shadow-glow transition-all flex items-center gap-2 shadow-2xl self-start group"
              >
                <span className="transform group-hover:-translate-x-1 transition-transform">←</span>
                <span>Zpět do Studia</span>
              </button>

              {aiModelUrl && (
                <div className="w-64 sm:w-80 space-y-4 max-h-[calc(100vh-120px)] overflow-y-auto pr-2 scrollbar-thin">
                  <div className="bg-gradient-to-br from-brand-panel/95 to-brand-panel/85 backdrop-blur-xl border-2 border-brand-accent/20 rounded-2xl p-4 sm:p-5 shadow-2xl hover:border-brand-accent/40 transition-all">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-accent/20 to-brand-accent/10 flex items-center justify-center border border-brand-accent/20">
                        <Bone className="w-4 h-4 text-brand-accent" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-brand-light font-spartan">Rigging</div>
                        <div className="text-[9px] text-brand-muted uppercase tracking-wider">Automatická kostra</div>
                      </div>
                    </div>
                    <RiggingControl modelUrl={aiModelUrl} onRigged={handleRiggingComplete} />
                  </div>

                  {rigTaskId && (
                    <div className="bg-gradient-to-br from-brand-panel/95 to-brand-panel/85 backdrop-blur-xl border-2 border-amber-400/20 rounded-2xl p-4 sm:p-5 shadow-2xl hover:border-amber-400/40 transition-all">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-400/10 flex items-center justify-center border border-amber-400/20">
                          <Play className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-brand-light font-spartan">Animace</div>
                          <div className="text-[9px] text-brand-muted uppercase tracking-wider">Pohyb modelu</div>
                        </div>
                      </div>
                      <AnimationControl rigTaskId={rigTaskId} onAnimated={(url) => setAiModelUrl(url)} />
                    </div>
                  )}

                  <div className="bg-gradient-to-br from-brand-panel/95 to-brand-panel/85 backdrop-blur-xl border-2 border-orange-400/20 rounded-2xl p-4 sm:p-5 shadow-2xl hover:border-orange-400/40 transition-all">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400/20 to-orange-400/10 flex items-center justify-center border border-orange-400/20">
                        <Paintbrush className="w-4 h-4 text-orange-400" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-brand-light font-spartan">AI Retexture</div>
                        <div className="text-[9px] text-brand-muted uppercase tracking-wider">Nová textura</div>
                      </div>
                    </div>
                    <RetextureControl modelUrl={aiModelUrl} onRetextured={(url) => setAiModelUrl(url)} />
                  </div>

                  <div className="bg-gradient-to-br from-brand-panel/95 to-brand-panel/85 backdrop-blur-xl border-2 border-cyan-400/20 rounded-2xl p-4 sm:p-5 shadow-2xl hover:border-cyan-400/40 transition-all">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400/20 to-cyan-400/10 flex items-center justify-center border border-cyan-400/20">
                        <Grid3x3 className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-brand-light font-spartan">Remesh</div>
                        <div className="text-[9px] text-brand-muted uppercase tracking-wider">Optimalizace sítě</div>
                      </div>
                    </div>
                    <RemeshControl modelUrl={aiModelUrl} onRemeshed={(url) => setAiModelUrl(url)} />
                  </div>
                </div>
              )}

              {/* STL Tools Panel */}
              {mesh && !aiModelUrl && (
                <div className="w-72 sm:w-80 space-y-3 max-h-[calc(100vh-120px)] overflow-y-auto pr-1 scrollbar-thin animate-in fade-in slide-in-from-left-4 duration-500">
                  <HelmetTools mesh={mesh} onScaleChange={handleScaleChange} />
                  <StlAnalysisPanel mesh={mesh} onScaleChange={handleScaleChange} />
                </div>
              )}
            </div>

            {/* 3D Canvas */}
            <div className="h-full w-full">
              {aiModelUrl && useEnhancedViewer ? (
                <EnhancedGLBViewer modelUrl={aiModelUrl} />
              ) : aiModelUrl ? (
                <GLBViewer modelUrl={aiModelUrl} />
              ) : mesh ? (
                <ThreeViewer mesh={mesh} />
              ) : null}
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="h-full overflow-y-auto">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8 animate-fade-in">
              <ModelHistory />
            </div>
          </div>
        )}
      </main>

      {/* MODALS */}
      {showEditor && editingFile && (
        <ImageEditor imageFile={editingFile} onSave={handleEditorSave} onCancel={handleEditorCancel} />
      )}
    </div>
  );
}

export default App;
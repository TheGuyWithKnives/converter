import { useState, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import {
  Box, Sparkles, Images, Edit3, Layout, Upload, Bone, Zap,
  Paintbrush, Grid3x3, Play, Menu, X, Eye
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

import {
  exportToOBJ, exportToSTL, exportToPLY, exportToFBX, downloadFile,
} from './services/exporters';
import { generateModelFromImage, QualityPreset } from './services/triposrService';

type UploadMode = 'single' | 'multi';
type GenerationMode = 'image' | 'text';

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
  const [activeTab, setActiveTab] = useState<'upload' | 'viewer'>('upload');
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
        style: { background: '#0F172A', color: '#F4F4F4', border: '1px solid #FF003C' }
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
    setProgressMessage('Startuji GENZEO Engine...');
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
          style: { background: '#0F172A', color: '#F4F4F4', border: '1px solid #FF003C' },
          iconTheme: { primary: '#FF003C', secondary: '#F4F4F4' }
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
          style: { background: '#0F172A', color: '#F4F4F4', border: '1px solid #FF003C' }
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
      style: { background: '#0F172A', color: '#F4F4F4', border: '1px solid #FF003C' },
      iconTheme: { primary: '#FF003C', secondary: '#F4F4F4' }
    });
  }, []);

  const handleRiggingComplete = useCallback((url: string, taskId?: string) => {
    setAiModelUrl(url);
    if (taskId) setRigTaskId(taskId);
    toast.success('Rigging dokoncen!', {
      style: { background: '#0F172A', color: '#F4F4F4', border: '1px solid #FF003C' },
      iconTheme: { primary: '#FF003C', secondary: '#F4F4F4' }
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
          style: { background: '#0F172A', color: '#F4F4F4', border: '1px solid #3B82F6' },
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
      toast.error('Pouzijte tlacitko Download GLB pro AI modely', { style: { background: '#0F172A', color: '#F4F4F4' } });
      return;
    }
    const filename = currentImage?.file.name.replace(/\.[^/.]+$/, '') || 'model';
    try {
      if (format === 'obj') downloadFile(exportToOBJ(mesh), `${filename}.obj`, 'text/plain');
      if (format === 'stl') downloadFile(exportToSTL(mesh), `${filename}.stl`, 'text/plain');
      if (format === 'ply') downloadFile(exportToPLY(mesh), `${filename}.ply`, 'text/plain');
      if (format === 'fbx') downloadFile(exportToFBX(mesh), `${filename}.fbx`, 'text/plain');
      toast.success(`Export ${format.toUpperCase()} hotov`, { style: { background: '#0F172A', color: '#F4F4F4', border: '1px solid #FF003C' } });
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
            background: '#0F172A',
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
      <header className="bg-brand-panel border-b border-brand-light/5 flex-shrink-0 z-10 relative">
        <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-brand-accent rounded-lg flex items-center justify-center shadow-glow transition-transform hover:scale-105">
              <Box className="w-5 h-5 sm:w-6 sm:h-6 text-brand-light" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-spartan font-bold text-brand-light tracking-wide">
                GENZEO<span className="text-brand-accent">.</span> platform
              </h1>
              <p className="text-[10px] sm:text-xs text-brand-muted tracking-[0.2em] uppercase font-bold hidden sm:block">
                Professional 2D / 3D Suite
              </p>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex bg-brand-dark/50 rounded-lg p-1 border border-brand-light/5">
              <button
                onClick={() => setGenerationMode('image')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
                  generationMode === 'image'
                    ? 'bg-brand-accent text-brand-light shadow-glow'
                    : 'text-brand-muted hover:text-brand-light'
                }`}
              >
                <Images className="w-4 h-4" /> Image 3D
              </button>
              <button
                onClick={() => setGenerationMode('text')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
                  generationMode === 'text'
                    ? 'bg-brand-accent text-brand-light shadow-glow'
                    : 'text-brand-muted hover:text-brand-light'
                }`}
              >
                <Edit3 className="w-4 h-4" /> Text 3D
              </button>
            </div>

            <div className="h-8 w-px bg-brand-light/10 mx-2" />

            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 border ${
                  activeTab === 'upload'
                    ? 'border-brand-accent text-brand-accent bg-brand-accent/5'
                    : 'border-transparent text-brand-muted hover:text-brand-light'
                }`}
              >
                <Upload className="w-4 h-4" /> Studio
              </button>
              <button
                onClick={() => setActiveTab('viewer')}
                disabled={!hasModel}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 border ${
                  activeTab === 'viewer'
                    ? 'border-brand-accent text-brand-accent bg-brand-accent/5'
                    : 'border-transparent text-brand-muted hover:text-brand-light'
                } disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                <Layout className="w-4 h-4" /> Viewer
              </button>
            </div>
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-brand-muted hover:text-brand-light transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-brand-light/5 px-4 py-3 space-y-3 bg-brand-panel animate-slide-down">
            <div className="flex gap-2">
              <button
                onClick={() => { setGenerationMode('image'); setMobileMenuOpen(false); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 ${
                  generationMode === 'image' ? 'bg-brand-accent text-brand-light' : 'bg-brand-dark text-brand-muted'
                }`}
              >
                <Images className="w-4 h-4" /> Image 3D
              </button>
              <button
                onClick={() => { setGenerationMode('text'); setMobileMenuOpen(false); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 ${
                  generationMode === 'text' ? 'bg-brand-accent text-brand-light' : 'bg-brand-dark text-brand-muted'
                }`}
              >
                <Edit3 className="w-4 h-4" /> Text 3D
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setActiveTab('upload'); setMobileMenuOpen(false); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border ${
                  activeTab === 'upload' ? 'border-brand-accent text-brand-accent' : 'border-brand-light/10 text-brand-muted'
                }`}
              >
                <Upload className="w-4 h-4" /> Studio
              </button>
              <button
                onClick={() => { setActiveTab('viewer'); setMobileMenuOpen(false); }}
                disabled={!hasModel}
                className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border ${
                  activeTab === 'viewer' ? 'border-brand-accent text-brand-accent' : 'border-brand-light/10 text-brand-muted'
                } disabled:opacity-30`}
              >
                <Layout className="w-4 h-4" /> Viewer
              </button>
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
                        className="absolute bottom-3 right-3 bg-brand-accent text-brand-light px-4 py-2 rounded-lg text-xs font-bold shadow-glow flex items-center gap-2"
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
                  <div className="bg-brand-panel border border-brand-light/5 rounded-2xl shadow-2xl p-5 sm:p-8 backdrop-blur-sm bg-opacity-95 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-brand-accent to-transparent opacity-70" />

                    {generationMode === 'image' ? (
                      <>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
                          <h2 className="text-lg sm:text-xl font-spartan font-bold flex items-center gap-3 text-brand-light">
                            <span className="w-8 h-8 rounded bg-brand-accent/20 flex items-center justify-center text-brand-accent border border-brand-accent/20">
                              <Images className="w-5 h-5" />
                            </span>
                            Nahrat podklady
                          </h2>
                          <div className="flex bg-brand-dark p-1 rounded-lg border border-brand-light/5 self-start sm:self-auto">
                            <button
                              onClick={() => setUploadMode('single')}
                              className={`px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${uploadMode === 'single' ? 'bg-brand-accent text-brand-light shadow-glow' : 'text-brand-muted hover:text-brand-light'}`}
                            >
                              Single
                            </button>
                            <button
                              onClick={() => setUploadMode('multi')}
                              className={`px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${uploadMode === 'multi' ? 'bg-brand-accent text-brand-light shadow-glow' : 'text-brand-muted hover:text-brand-light'}`}
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                          <div className="bg-brand-dark/50 p-4 sm:p-5 rounded-xl border border-brand-light/5 hover:border-brand-accent/30 transition-colors">
                            <label className="block text-xs font-bold text-brand-muted uppercase mb-3 sm:mb-4 flex items-center gap-2 tracking-wider">
                              <Sparkles className="w-3 h-3 text-brand-accent" /> Kvalita vystupu
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                              {['fast', 'quality', 'ultra'].map((q) => (
                                <button
                                  key={q}
                                  onClick={() => setQualityPreset(q as QualityPreset)}
                                  className={`py-2 rounded-lg text-sm font-bold border transition-all ${
                                    qualityPreset === q
                                      ? 'border-brand-accent bg-brand-accent/10 text-brand-accent shadow-[0_0_10px_rgba(255,0,60,0.2)]'
                                      : 'border-brand-light/10 bg-transparent text-brand-muted hover:border-brand-light/30 hover:text-brand-light'
                                  }`}
                                >
                                  {q.charAt(0).toUpperCase() + q.slice(1)}
                                </button>
                              ))}
                            </div>
                          </div>

                          {hasUploadedImage && (
                            <div className="flex flex-col gap-3 justify-center">
                              <button
                                onClick={handleOpenEditor}
                                disabled={isProcessing}
                                className="w-full py-3 bg-brand-dark hover:bg-brand-light/5 border border-brand-light/10 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:border-brand-accent/50 text-brand-muted hover:text-brand-light"
                              >
                                <Edit3 className="w-4 h-4" /> Editor obrazku
                              </button>
                              <button
                                onClick={handleGenerate}
                                disabled={isProcessing}
                                className="w-full py-3 bg-brand-accent hover:opacity-90 rounded-xl text-brand-light text-sm font-bold shadow-glow flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Sparkles className="w-4 h-4" />
                                Generovat Model
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="mt-6 sm:mt-8">
                          <InstructionsChat onInstructionsChange={setInstructions} disabled={isProcessing} />
                        </div>
                      </>
                    ) : (
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
                    )}
                  </div>
                </div>

                {/* RIGHT PANEL - hidden on mobile, visible on lg */}
                <div className="hidden lg:block lg:col-span-4 space-y-6">
                  {hasModel ? (
                    <div className="bg-brand-dark rounded-2xl border border-brand-accent overflow-hidden h-64 relative shadow-glow group">
                      <div className="absolute inset-0">
                        {aiModelUrl ? <GLBViewer modelUrl={aiModelUrl} /> : <ThreeViewer mesh={mesh} />}
                      </div>
                      <div className="absolute inset-0 bg-brand-dark/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                        <button
                          onClick={() => setActiveTab('viewer')}
                          className="bg-brand-accent text-brand-light px-8 py-3 rounded-full font-bold transform translate-y-4 group-hover:translate-y-0 transition-all shadow-glow flex items-center gap-2"
                        >
                          <Layout className="w-5 h-5" /> Otevrit Studio
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-brand-panel border border-brand-light/5 rounded-2xl p-8 text-center h-64 flex flex-col items-center justify-center opacity-70">
                      <div className="w-20 h-20 bg-brand-dark rounded-full flex items-center justify-center mb-4 shadow-inner border border-brand-light/5">
                        <Box className="w-8 h-8 text-brand-muted" />
                      </div>
                      <p className="text-brand-muted font-bold tracking-wide">ZATIM ZADNY MODEL</p>
                      <p className="text-brand-muted/60 text-xs mt-2 font-sans">Nahrajte obrazek nebo zadejte text vlevo</p>
                    </div>
                  )}

                  {aiModelUrl && (
                    <div className="bg-brand-panel border-l-4 border-brand-accent rounded-r-xl p-6 shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
                        <Bone className="w-24 h-24 text-brand-light" />
                      </div>
                      <div className="flex items-center gap-3 mb-4 relative z-10">
                        <Bone className="text-brand-accent w-6 h-6" />
                        <h3 className="font-spartan font-bold text-lg text-brand-light">AI Rigging</h3>
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

                  <div className="bg-gradient-to-br from-brand-accent/10 to-brand-panel rounded-2xl p-6 border border-brand-accent/20">
                    <div className="flex items-start gap-4">
                      <div className="bg-brand-accent/20 p-2 rounded-lg">
                        <Zap className="w-5 h-5 text-brand-accent" />
                      </div>
                      <div>
                        <h4 className="font-bold text-brand-light mb-1 font-spartan text-sm">GENZEO TIP</h4>
                        <p className="text-xs text-brand-muted leading-relaxed font-sans">
                          Podporovane formaty: JPG, PNG pro AI generovani a STL pro analyzu tisku. STL soubory se automaticky zobrazuji s nastroji pro tisk.
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
                className="bg-brand-panel/90 backdrop-blur-md border border-brand-light/10 text-brand-light px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold hover:bg-brand-panel hover:border-brand-accent transition-all flex items-center gap-2 shadow-xl self-start"
              >
                ← Zpet do Studia
              </button>

              {aiModelUrl && (
                <div className="w-64 sm:w-72 space-y-3 max-h-[calc(100vh-120px)] overflow-y-auto pr-1 scrollbar-thin">
                  <div className="bg-brand-panel/90 backdrop-blur-md border border-white/10 rounded-xl p-3 sm:p-4 shadow-2xl">
                    <div className="flex items-center gap-2 mb-3 text-brand-accent font-bold text-xs uppercase tracking-wider">
                      <Bone className="w-4 h-4" /> Rigging
                    </div>
                    <RiggingControl modelUrl={aiModelUrl} onRigged={handleRiggingComplete} />
                  </div>

                  {rigTaskId && (
                    <div className="bg-brand-panel/90 backdrop-blur-md border border-white/10 rounded-xl p-3 sm:p-4 shadow-2xl">
                      <div className="flex items-center gap-2 mb-3 text-amber-400 font-bold text-xs uppercase tracking-wider">
                        <Play className="w-4 h-4" /> Animace
                      </div>
                      <AnimationControl rigTaskId={rigTaskId} onAnimated={(url) => setAiModelUrl(url)} />
                    </div>
                  )}

                  <div className="bg-brand-panel/90 backdrop-blur-md border border-white/10 rounded-xl p-3 sm:p-4 shadow-2xl">
                    <div className="flex items-center gap-2 mb-3 text-orange-400 font-bold text-xs uppercase tracking-wider">
                      <Paintbrush className="w-4 h-4" /> AI Retexture
                    </div>
                    <RetextureControl modelUrl={aiModelUrl} onRetextured={(url) => setAiModelUrl(url)} />
                  </div>

                  <div className="bg-brand-panel/90 backdrop-blur-md border border-white/10 rounded-xl p-3 sm:p-4 shadow-2xl">
                    <div className="flex items-center gap-2 mb-3 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                      <Grid3x3 className="w-4 h-4" /> Remesh
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
      </main>

      {/* MODALS */}
      {showEditor && editingFile && (
        <ImageEditor imageFile={editingFile} onSave={handleEditorSave} onCancel={handleEditorCancel} />
      )}
    </div>
  );
}

export default App;

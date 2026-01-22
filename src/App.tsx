import { useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Box, Sparkles, Images, Edit3, Layout, Upload, Bone, Zap, AlertCircle, CheckCircle } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';

// Komponenty
import ImageUpload from './components/ImageUpload';
import MultiImageUpload from './components/MultiImageUpload';
import InstructionsChat from './components/InstructionsChat';
import ImagePreviewGallery from './components/ImagePreviewGallery';
import ThreeViewer from './components/ThreeViewer';
import GLBViewer from './components/GLBViewer';
import EnhancedGLBViewer from './components/EnhancedGLBViewer';
import ParameterControls from './components/ParameterControls';
import ProgressBar from './components/ProgressBar';
import ImageEditor from './components/ImageEditor';
import { TextTo3DGenerator } from './components/TextTo3DGenerator';
import { RiggingControl } from './components/RiggingControl';

// Služby
import { generateMeshFromDepth } from './services/meshGenerator';
import {
  exportToOBJ,
  exportToSTL,
  exportToPLY,
  exportToFBX,
  downloadFile,
} from './services/exporters';
import { generateModelFromImage, QualityPreset } from './services/triposrService';
import { applyInstructionsToImage } from './services/instructionsProcessor';
import { supabase } from './services/supabaseClient';

// Typy
type UploadMode = 'single' | 'multi';
type GenerationMode = 'image' | 'text';

interface ProcessedImage {
  original: string;
  processed: string;
  file: File;
  hasChanges: boolean;
}

function App() {
  // --- STATE MANAGEMENT ---
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
  
  const [showPreview, setShowPreview] = useState(false);
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [isPreviewProcessing, setIsPreviewProcessing] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingFile, setEditingFile] = useState<File | null>(null);
  const [useEnhancedViewer, setUseEnhancedViewer] = useState(true);
  const [activeTab, setActiveTab] = useState<'upload' | 'viewer'>('upload');

  const abortControllerRef = useRef<AbortController | null>(null);

  // --- LOGIC: CANCEL ---
  const cancelProcessing = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort('User cancelled');
      abortControllerRef.current = null;
      setIsProcessing(false);
      setProgress(0);
      setProgressMessage('');
      toast('Proces zrušen', { 
        icon: '🛑',
        style: { background: '#0F172A', color: '#F4F4F4', border: '1px solid #FF003C' }
      });
    }
  }, []);

  // --- LOGIC: AI GENERATION ---
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
      const imageCount = (additionalFiles?.length || 0) + 1;
      setProgressMessage(`Analyzuji ${imageCount} vstupů...`);
      setProgress(0.1);

      const result = await generateModelFromImage(
        imageUrl, 
        file, 
        additionalFiles, 
        userInstructions, 
        quality || qualityPreset, 
        signal
      );

      setProgress(0.9);
      setProgressMessage('Finalizuji geometrii...');

      if (result.model_url) {
        setAiModelUrl(result.model_url);
        setProgress(1);
        setProgressMessage('Hotovo!');
        toast.success('Model vygenerován!', {
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

  // --- HANDLERS ---
  const handleTextTo3DReady = useCallback((url: string) => {
    setAiModelUrl(url);
    setActiveTab('viewer');
    toast.success('Model připraven!', {
      style: { background: '#0F172A', color: '#F4F4F4', border: '1px solid #FF003C' },
      iconTheme: { primary: '#FF003C', secondary: '#F4F4F4' }
    });
  }, []);

  const handleRiggingComplete = useCallback((url: string) => {
    setAiModelUrl(url);
    toast.success('Rigging dokončen!', {
      style: { background: '#0F172A', color: '#F4F4F4', border: '1px solid #FF003C' },
      iconTheme: { primary: '#FF003C', secondary: '#F4F4F4' }
    });
  }, []);

  const handleImageUpload = useCallback((file: File, imageUrl: string) => {
    setCurrentImage({ file, url: imageUrl });
  }, []);

  const handleMultiImageUpload = useCallback((files: File[], imageUrls: string[]) => {
    setCurrentImages({ files, urls: imageUrls });
  }, []);

  const handlePreviewImages = useCallback(async () => {
    setIsPreviewProcessing(true);
    setProgressMessage('Aplikuji instrukce...');
    try {
      const filesToProcess = uploadMode === 'single' ? [currentImage!.file] : currentImages.files;
      const hasInstructions = instructions && instructions.trim().length > 0;
      const processed = await Promise.all(
        filesToProcess.map(async (file) => {
          const originalUrl = URL.createObjectURL(file);
          if (hasInstructions) {
            const result = await applyInstructionsToImage(file, instructions);
            return { original: originalUrl, processed: result.url, file: result.file, hasChanges: true };
          }
          return { original: originalUrl, processed: originalUrl, file: file, hasChanges: false };
        })
      );
      setProcessedImages(processed);
      setShowPreview(true);
    } catch (error) {
      toast.error('Chyba náhledu', { style: { background: '#0F172A', color: '#F4F4F4' } });
    } finally {
      setIsPreviewProcessing(false);
      setProgressMessage('');
    }
  }, [uploadMode, currentImage, currentImages, instructions]);

  const handleConfirmPreview = useCallback(() => {
    setShowPreview(false);
    if (uploadMode === 'single' && processedImages.length > 0) {
      processImageWithAI(processedImages[0].processed, processedImages[0].file, undefined, instructions);
    } else if (uploadMode === 'multi' && processedImages.length > 0) {
      const [main, ...rest] = processedImages;
      processImageWithAI(main.processed, main.file, rest.map(r => r.file), instructions);
    }
    setProcessedImages([]);
  }, [uploadMode, processedImages, processImageWithAI, instructions]);

  const handleCancelPreview = useCallback(() => {
    setProcessedImages([]);
    setShowPreview(false);
  }, []);

  const handleEditInstructions = useCallback(() => {
    setProcessedImages([]);
    setShowPreview(false);
  }, []);

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
  }, [uploadMode, currentImage, currentImages]);

  const handleEditorCancel = useCallback(() => {
    setShowEditor(false);
    setEditingFile(null);
  }, []);

  const handleGenerate = useCallback(() => {
    if (uploadMode === 'single' && currentImage) {
      processImageWithAI(currentImage.url, currentImage.file, undefined, instructions);
    } else if (uploadMode === 'multi' && currentImages.files.length > 0) {
      const [main, ...rest] = currentImages.files;
      processImageWithAI(currentImages.urls[0], main, rest, instructions);
    }
  }, [uploadMode, currentImage, currentImages, processImageWithAI, instructions]);

  const handleExport = useCallback((format: 'obj' | 'stl' | 'ply' | 'fbx') => {
      if (!mesh) {
        toast.error('Použijte tlačítko Download GLB pro AI modely', { style: { background: '#0F172A', color: '#F4F4F4' } });
        return;
      }
      const filename = currentImage?.file.name.replace(/\.[^/.]+$/, '') || 'model';
      try {
        if (format === 'obj') downloadFile(exportToOBJ(mesh), `${filename}.obj`, 'text/plain');
        if (format === 'stl') downloadFile(exportToSTL(mesh), `${filename}.stl`, 'text/plain');
        if (format === 'ply') downloadFile(exportToPLY(mesh), `${filename}.ply`, 'text/plain');
        if (format === 'fbx') downloadFile(exportToFBX(mesh), `${filename}.fbx`, 'text/plain');
        toast.success(`Export ${format.toUpperCase()} hotov`, { style: { background: '#0F172A', color: '#F4F4F4', border: '1px solid #FF003C' } });
      } catch (e) {
        toast.error('Chyba exportu');
      }
    }, [mesh, currentImage]);

  // --- RENDER ---
  return (
    <div className="h-screen flex flex-col bg-brand-dark text-brand-light font-sans overflow-hidden selection:bg-brand-accent selection:text-white">
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#0F172A',
            color: '#F4F4F4',
            border: '1px solid #1E293B',
            fontFamily: '"Arial Nova", sans-serif',
          },
        }}
      />
      
      {/* Loading Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/95 backdrop-blur-md">
           <div className="w-full max-w-md p-8 bg-brand-panel border border-brand-accent rounded-2xl shadow-glow-strong">
              <ProgressBar 
                progress={progress} 
                message={progressMessage} 
                onCancel={cancelProcessing} 
                cancellable={true} 
              />
           </div>
        </div>
      )}

      {/* --- HEADER --- */}
      <header className="bg-brand-panel border-b border-brand-light/5 flex-shrink-0 z-10 relative">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-brand-accent rounded-lg flex items-center justify-center shadow-glow transition-transform hover:scale-105">
              <Box className="w-6 h-6 text-brand-light" />
            </div>
            <div>
              <h1 className="text-2xl font-spartan font-bold text-brand-light tracking-wide">
                GENZEO<span className="text-brand-accent">.</span> platform
              </h1>
              <p className="text-xs text-brand-muted tracking-[0.2em] uppercase font-bold">
                Professional 2D → 3D Suite
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Mode Switcher */}
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

            <div className="h-8 w-px bg-brand-light/10 mx-2"></div>

            {/* Tab Switcher */}
            <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 border ${
                    activeTab === 'upload'
                      ? 'border-brand-accent text-brand-accent bg-brand-accent/5'
                      : 'border-transparent text-brand-muted hover:text-brand-light'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Studio
                </button>
                <button
                  onClick={() => setActiveTab('viewer')}
                  disabled={!mesh && !aiModelUrl}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 border ${
                    activeTab === 'viewer'
                      ? 'border-brand-accent text-brand-accent bg-brand-accent/5'
                      : 'border-transparent text-brand-muted hover:text-brand-light'
                  } disabled:opacity-30 disabled:cursor-not-allowed`}
                >
                  <Layout className="w-4 h-4" />
                  Viewer
                </button>
            </div>
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 overflow-hidden relative">
        {/* Dekorativní pozadí (červená záře místo modré) */}
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-brand-accent/5 blur-[150px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-1/4 h-1/4 bg-brand-accent/5 blur-[120px] rounded-full pointer-events-none" />

        {/* --- UPLOAD TAB --- */}
        {activeTab === 'upload' && (
          <div className="h-full overflow-y-auto custom-scrollbar">
            <div className="max-w-[1600px] mx-auto px-6 py-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* --- LEFT PANEL (INPUT) --- */}
                <div className="lg:col-span-8 space-y-6">
                  <div className="bg-brand-panel border border-brand-light/5 rounded-2xl shadow-2xl p-8 backdrop-blur-sm bg-opacity-95 relative overflow-hidden">
                    {/* Top Accent Line */}
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-brand-accent to-transparent opacity-70" />
                    
                    {generationMode === 'image' ? (
                      <>
                        <div className="flex items-center justify-between mb-8">
                          <h2 className="text-xl font-spartan font-bold flex items-center gap-3 text-brand-light">
                            <span className="w-8 h-8 rounded bg-brand-accent/20 flex items-center justify-center text-brand-accent border border-brand-accent/20">
                                <Images className="w-5 h-5" />
                            </span>
                            Nahrát podklady
                          </h2>
                          <div className="flex bg-brand-dark p-1 rounded-lg border border-brand-light/5">
                              <button 
                                onClick={() => { setUploadMode('single'); setShowPreview(false); setProcessedImages([]); }} 
                                className={`px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${uploadMode === 'single' ? 'bg-brand-accent text-brand-light shadow-glow' : 'text-brand-muted hover:text-brand-light'}`}
                              >
                                Single
                              </button>
                              <button 
                                onClick={() => { setUploadMode('multi'); setShowPreview(false); setProcessedImages([]); }} 
                                className={`px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${uploadMode === 'multi' ? 'bg-brand-accent text-brand-light shadow-glow' : 'text-brand-muted hover:text-brand-light'}`}
                              >
                                Multi-View
                              </button>
                          </div>
                        </div>

                        {/* Upload Zone - passing brand colors if component supports it, otherwise controlled by CSS */}
                        <div className="mb-8 group">
                          {uploadMode === 'multi' ? (
                            <MultiImageUpload onImagesUpload={handleMultiImageUpload} disabled={isProcessing} />
                          ) : (
                            <ImageUpload onImageUpload={handleImageUpload} disabled={isProcessing} />
                          )}
                        </div>

                        {/* Controls Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Quality Settings */}
                            <div className="bg-brand-dark/50 p-5 rounded-xl border border-brand-light/5 hover:border-brand-accent/30 transition-colors">
                                <label className="block text-xs font-bold text-brand-muted uppercase mb-4 flex items-center gap-2 tracking-wider">
                                  <Sparkles className="w-3 h-3 text-brand-accent" /> Kvalita výstupu
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

                            {/* Action Buttons */}
                            {((uploadMode === 'single' && currentImage) || (uploadMode === 'multi' && currentImages.files.length > 0)) && (
                                <div className="flex flex-col gap-3 justify-center">
                                    <button 
                                        onClick={handleOpenEditor}
                                        disabled={isProcessing}
                                        className="w-full py-3 bg-brand-dark hover:bg-brand-light/5 border border-brand-light/10 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:border-brand-accent/50 text-brand-muted hover:text-brand-light"
                                    >
                                        <Edit3 className="w-4 h-4" /> Editor obrázku
                                    </button>
                                    <button
                                      onClick={handlePreviewImages}
                                      disabled={isProcessing || isPreviewProcessing}
                                      className="w-full py-3 bg-brand-accent hover:opacity-90 rounded-xl text-brand-light text-sm font-bold shadow-glow flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        {isPreviewProcessing ? 'Analyzuji...' : 'Generovat Model'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Instructions - předáváme classes pro barvu */}
                        <div className="mt-8">
                            <InstructionsChat onInstructionsChange={setInstructions} disabled={isProcessing} />
                        </div>

                        {/* Preview Gallery */}
                        {showPreview && processedImages.length > 0 && (
                            <div className="mt-8 border-t border-brand-light/10 pt-8">
                                <ImagePreviewGallery
                                    images={processedImages}
                                    onConfirm={handleConfirmPreview}
                                    onCancel={handleCancelPreview}
                                    onEdit={handleEditInstructions}
                                    isGenerating={isProcessing}
                                />
                            </div>
                        )}
                      </>
                    ) : (
                      // TEXT TO 3D MODE
                      <div className="py-4">
                        <div className="mb-8">
                            <h2 className="text-xl font-spartan font-bold flex items-center gap-3 mb-2 text-brand-light">
                                <span className="w-8 h-8 rounded bg-brand-accent/20 flex items-center justify-center text-brand-accent border border-brand-accent/20">
                                    <Edit3 className="w-5 h-5" />
                                </span>
                                Text to 3D
                            </h2>
                            <p className="text-brand-muted text-sm">Popište svou vizi a nechte AI vytvořit model během pár vteřin.</p>
                        </div>
                        <TextTo3DGenerator onModelReady={handleTextTo3DReady} />
                      </div>
                    )}
                  </div>
                </div>

                {/* --- RIGHT PANEL (INFO & PREVIEW) --- */}
                <div className="lg:col-span-4 space-y-6">
                    
                    {/* Mini Preview Card */}
                    {(mesh || aiModelUrl) ? (
                        <div className="bg-brand-dark rounded-2xl border border-brand-accent overflow-hidden h-64 relative shadow-glow group">
                            <div className="absolute inset-0">
                                {aiModelUrl ? <GLBViewer modelUrl={aiModelUrl} /> : <ThreeViewer mesh={mesh} />}
                            </div>
                            <div className="absolute inset-0 bg-brand-dark/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                <button 
                                  onClick={() => setActiveTab('viewer')} 
                                  className="bg-brand-accent text-brand-light px-8 py-3 rounded-full font-bold transform translate-y-4 group-hover:translate-y-0 transition-all shadow-glow flex items-center gap-2"
                                >
                                    <Layout className="w-5 h-5" /> Otevřít Studio
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-brand-panel border border-brand-light/5 rounded-2xl p-8 text-center h-64 flex flex-col items-center justify-center opacity-70">
                            <div className="w-20 h-20 bg-brand-dark rounded-full flex items-center justify-center mb-4 shadow-inner border border-brand-light/5">
                                <Box className="w-8 h-8 text-brand-muted" />
                            </div>
                            <p className="text-brand-muted font-bold tracking-wide">ZATÍM ŽÁDNÝ MODEL</p>
                            <p className="text-brand-muted/60 text-xs mt-2 font-sans">Nahrajte obrázek nebo zadejte text vlevo</p>
                        </div>
                    )}

                    {/* Rigging Panel */}
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

                    {/* Parameters & Export */}
                    <div className="bg-brand-panel border border-brand-light/5 rounded-2xl p-6 relative">
                         <ParameterControls
                            params={{ resolution: 3, depthScale: 3.0, smoothness: 0.5 }}
                            onParamsChange={() => {}}
                            onRegenerate={handleGenerate}
                            onExport={handleExport}
                            disabled={(!mesh && !aiModelUrl) || isProcessing}
                            showParams={false}
                            aiModelUrl={aiModelUrl}
                         />
                    </div>
                    
                    {/* Info Tip Box */}
                    <div className="bg-gradient-to-br from-brand-accent/10 to-brand-panel rounded-2xl p-6 border border-brand-accent/20">
                         <div className="flex items-start gap-4">
                             <div className="bg-brand-accent/20 p-2 rounded-lg">
                                <Zap className="w-5 h-5 text-brand-accent" />
                             </div>
                             <div>
                                 <h4 className="font-bold text-brand-light mb-1 font-spartan text-sm">GENZEO TIP</h4>
                                 <p className="text-xs text-brand-muted leading-relaxed font-sans">
                                     Pro nejlepší výsledky používejte obrázky s vysokým kontrastem. Meshy API v2 nyní podporuje PBR materiály.
                                 </p>
                             </div>
                         </div>
                    </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* --- VIEWER TAB --- */}
        {activeTab === 'viewer' && (mesh || aiModelUrl) && (
          <div className="h-full relative bg-[#050508]">
             {/* Viewer Overlay UI */}
             <div className="absolute top-6 left-6 z-20 flex flex-col gap-4">
                <button 
                   onClick={() => setActiveTab('upload')}
                   className="bg-brand-panel/90 backdrop-blur-md border border-brand-light/10 text-brand-light px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-panel hover:border-brand-accent transition-all flex items-center gap-2 shadow-xl"
                >
                  ← Zpět do Studia
                </button>
                
                {aiModelUrl && (
                    <div className="w-72 bg-brand-panel/90 backdrop-blur-md border border-brand-light/10 rounded-xl p-5 shadow-2xl">
                        <div className="flex items-center gap-2 mb-3 text-brand-accent font-bold text-xs uppercase tracking-wider">
                           <Bone className="w-4 h-4" /> Animace & Rigging
                        </div>
                        <RiggingControl modelUrl={aiModelUrl} onRigged={handleRiggingComplete} />
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

      {/* --- MODALS --- */}
      {showEditor && editingFile && (
        <ImageEditor
          imageFile={editingFile}
          onSave={handleEditorSave}
          onCancel={handleEditorCancel}
        />
      )}
    </div>
  );
}

export default App;
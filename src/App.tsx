import { useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Box, Sparkles, Images, Edit3, Layout, Upload, Bone, Zap, AlertCircle } from 'lucide-react';
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
  
  // Vstupy a soubory
  const [currentImage, setCurrentImage] = useState<{ file: File; url: string } | null>(null);
  const [currentImages, setCurrentImages] = useState<{ files: File[]; urls: string[] }>({ files: [], urls: [] });
  const [uploadMode, setUploadMode] = useState<UploadMode>('single');
  const [generationMode, setGenerationMode] = useState<GenerationMode>('image');
  
  // Instrukce a parametry
  const [instructions, setInstructions] = useState<string>('');
  const [qualityPreset, setQualityPreset] = useState<QualityPreset>('quality');
  
  // Výstupy (3D Modely)
  const [mesh, setMesh] = useState<THREE.Mesh | null>(null);
  const [aiModelUrl, setAiModelUrl] = useState<string | null>(null);
  
  // Procesy a Loading
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  
  // UI Stavy (Preview, Editor, Taby)
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
      toast('Proces zrušen uživatelem', { icon: '🛑' });
    }
  }, []);

  // --- LOGIC: AI GENERATION (IMAGE TO 3D) ---
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
    setProgressMessage('Initializuji GENZEO Engine...');
    setAiModelUrl(null);
    setMesh(null);

    try {
      const imageCount = (additionalFiles?.length || 0) + 1;
      setProgressMessage(`Analyzuji ${imageCount} vstupů...`);
      setProgress(0.1);

      // Volání služby TripoSR / Meshy
      const result = await generateModelFromImage(
        imageUrl, 
        file, 
        additionalFiles, 
        userInstructions, 
        quality || qualityPreset, 
        signal
      );

      setProgress(0.9);
      setProgressMessage('Finalizuji model...');

      if (result.model_url) {
        setAiModelUrl(result.model_url);
        setProgress(1);
        setProgressMessage('Hotovo!');
        toast.success('Model úspěšně vygenerován!');
      } else {
        throw new Error('No model URL received');
      }

      // Automatické přepnutí na Viewer po krátké prodlevě
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        setActiveTab('viewer');
      }, 500);

    } catch (error) {
      console.error('AI processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('cancelled')) {
        // Ignorovat, pokud uživatel zrušil
      } else if (errorMessage.includes('loading')) {
        toast.loading('Model se stále načítá, zkuste to prosím za 20s znovu...');
      } else {
        toast.error(`Chyba generování: ${errorMessage}`);
      }

      setIsProcessing(false);
      setProgress(0);
    }
  }, [qualityPreset]);

  // --- LOGIC: TEXT TO 3D HANDLER ---
  const handleTextTo3DReady = useCallback((url: string) => {
    setAiModelUrl(url);
    setActiveTab('viewer');
    toast.success('Model z textu je připraven!');
  }, []);

  // --- LOGIC: RIGGING HANDLER ---
  const handleRiggingComplete = useCallback((url: string) => {
    setAiModelUrl(url);
    // Zůstáváme ve vieweru, jen se model přenačte
  }, []);

  // --- LOGIC: UPLOAD HANDLERS ---
  const handleImageUpload = useCallback(
    (file: File, imageUrl: string) => {
      setCurrentImage({ file, url: imageUrl });
    },
    []
  );

  const handleMultiImageUpload = useCallback(
    (files: File[], imageUrls: string[]) => {
      setCurrentImages({ files, urls: imageUrls });
    },
    []
  );

  // --- LOGIC: PREVIEW & PRE-PROCESSING ---
  const handlePreviewImages = useCallback(async () => {
    setIsPreviewProcessing(true);
    setProgressMessage('Aplikuji úpravy a instrukce...');

    try {
      const filesToProcess = uploadMode === 'single'
        ? [currentImage!.file]
        : currentImages.files;

      const hasInstructions = instructions && instructions.trim().length > 0;

      const processed = await Promise.all(
        filesToProcess.map(async (file, index) => {
          const originalUrl = URL.createObjectURL(file);

          if (hasInstructions) {
            const result = await applyInstructionsToImage(file, instructions);
            return {
              original: originalUrl,
              processed: result.url,
              file: result.file,
              hasChanges: true,
            };
          }

          return {
            original: originalUrl,
            processed: originalUrl,
            file: file,
            hasChanges: false,
          };
        })
      );

      setProcessedImages(processed);
      setShowPreview(true);
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Chyba při vytváření náhledu: ' + (error as Error).message);
    } finally {
      setIsPreviewProcessing(false);
      setProgressMessage('');
    }
  }, [uploadMode, currentImage, currentImages, instructions]);

  const handleConfirmPreview = useCallback(() => {
    setShowPreview(false);

    // Pokud Single Mode
    if (uploadMode === 'single' && processedImages.length > 0) {
      const processedFile = processedImages[0].file;
      const processedUrl = processedImages[0].processed;

      // Uložíme si URL pro pozdější vyčištění
      const urlsToRevoke = processedImages.map(img => ({
        original: img.original,
        processed: img.hasChanges ? img.processed : null,
      }));

      const processPromise = processImageWithAI(processedUrl, processedFile, undefined, instructions);

      // Cleanup po chvíli
      setTimeout(() => {
        urlsToRevoke.forEach(({ original, processed }) => {
          try {
            URL.revokeObjectURL(original);
            if (processed) URL.revokeObjectURL(processed);
          } catch (e) {
            console.warn('Failed to revoke URL:', e);
          }
        });
      }, 5000);

      processPromise.catch((error) => {
        console.error('Processing failed:', error);
      });
    } 
    // Pokud Multi Mode
    else if (uploadMode === 'multi' && processedImages.length > 0) {
      const [mainImage, ...additionalImages] = processedImages;
      const additionalFiles = additionalImages.map(img => img.file);

      const urlsToRevoke = processedImages.map(img => ({
        original: img.original,
        processed: img.hasChanges ? img.processed : null,
      }));

      const processPromise = processImageWithAI(
        mainImage.processed,
        mainImage.file,
        additionalFiles,
        instructions
      );

      setTimeout(() => {
        urlsToRevoke.forEach(({ original, processed }) => {
          try {
            URL.revokeObjectURL(original);
            if (processed) URL.revokeObjectURL(processed);
          } catch (e) { console.warn(e); }
        });
      }, 5000);

      processPromise.catch((error) => console.error(error));
    }

    setProcessedImages([]);
  }, [uploadMode, processedImages, processImageWithAI, instructions]);

  const handleCancelPreview = useCallback(() => {
    processedImages.forEach(img => {
      URL.revokeObjectURL(img.original);
      if (img.hasChanges) {
        URL.revokeObjectURL(img.processed);
      }
    });
    setProcessedImages([]);
    setShowPreview(false);
  }, [processedImages]);

  const handleEditInstructions = useCallback(() => {
    // Stejné jako cancel, jen se vrátíme k editaci
    processedImages.forEach(img => {
      URL.revokeObjectURL(img.original);
      if (img.hasChanges) {
        URL.revokeObjectURL(img.processed);
      }
    });
    setProcessedImages([]);
    setShowPreview(false);
  }, [processedImages]);

  // --- LOGIC: IMAGE EDITOR ---
  const handleOpenEditor = useCallback(() => {
    if (uploadMode === 'single' && currentImage) {
      setEditingFile(currentImage.file);
      setShowEditor(true);
    } else if (uploadMode === 'multi' && currentImages.files.length > 0) {
      setEditingFile(currentImages.files[0]);
      setShowEditor(true);
    }
  }, [uploadMode, currentImage, currentImages]);

  const handleEditorSave = useCallback((editedFile: File) => {
    const url = URL.createObjectURL(editedFile);

    if (uploadMode === 'single') {
      if (currentImage) {
        URL.revokeObjectURL(currentImage.url);
      }
      setCurrentImage({ file: editedFile, url });
    } else if (uploadMode === 'multi') {
      const newFiles = [editedFile, ...currentImages.files.slice(1)];
      const newUrls = [url, ...currentImages.urls.slice(1)];
      if (currentImages.urls[0]) {
        URL.revokeObjectURL(currentImages.urls[0]);
      }
      setCurrentImages({ files: newFiles, urls: newUrls });
    }

    setShowEditor(false);
    setEditingFile(null);
    toast.success('Obrázek upraven');
  }, [uploadMode, currentImage, currentImages]);

  const handleEditorCancel = useCallback(() => {
    setShowEditor(false);
    setEditingFile(null);
  }, []);

  // --- LOGIC: GENERATE BUTTON HANDLER ---
  const handleGenerate = useCallback(() => {
    if (uploadMode === 'single' && currentImage) {
      processImageWithAI(currentImage.url, currentImage.file, undefined, instructions);
    } else if (uploadMode === 'multi' && currentImages.files.length > 0) {
      const [mainFile, ...additionalFiles] = currentImages.files;
      const [mainUrl] = currentImages.urls;
      processImageWithAI(mainUrl, mainFile, additionalFiles, instructions);
    }
  }, [uploadMode, currentImage, currentImages, processImageWithAI, instructions]);

  // --- LOGIC: EXPORT ---
  const handleExport = useCallback(
    (format: 'obj' | 'stl' | 'ply' | 'fbx') => {
      if (!mesh) {
        toast.error('Žádný mesh k exportu (AI model stáhněte jako GLB)');
        return;
      }

      const filename = currentImage?.file.name.replace(/\.[^/.]+$/, '') || 'model';
      
      try {
        switch (format) {
          case 'obj':
            const objContent = exportToOBJ(mesh);
            downloadFile(objContent, `${filename}.obj`, 'text/plain');
            break;
          case 'stl':
            const stlContent = exportToSTL(mesh);
            downloadFile(stlContent, `${filename}.stl`, 'text/plain');
            break;
          case 'ply':
            const plyContent = exportToPLY(mesh);
            downloadFile(plyContent, `${filename}.ply`, 'text/plain');
            break;
          case 'fbx':
            const fbxContent = exportToFBX(mesh);
            downloadFile(fbxContent, `${filename}.fbx`, 'text/plain');
            break;
        }
        toast.success(`Export ${format.toUpperCase()} dokončen`);
      } catch (e) {
        console.error(e);
        toast.error('Chyba při exportu');
      }
    },
    [mesh, currentImage]
  );

  // --- LOGIC: CLEANUP ON UNMOUNT ---
  useEffect(() => {
    return () => {
      if (currentImage) {
        try { URL.revokeObjectURL(currentImage.url); } catch (e) { console.warn(e); }
      }
      currentImages.urls.forEach(url => {
        try { URL.revokeObjectURL(url); } catch (e) { console.warn(e); }
      });
      processedImages.forEach(img => {
        try { 
           URL.revokeObjectURL(img.original);
           if (img.hasChanges) URL.revokeObjectURL(img.processed);
        } catch (e) { console.warn(e); }
      });
    };
  }, []);

  // --- RENDER UI ---
  return (
    <div className="h-screen flex flex-col bg-brand-dark text-brand-light font-sans overflow-hidden">
      {/* Toast Notifikace - Styled podle manuálu */}
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#0F172A',
            color: '#F4F4F4',
            border: '1px solid #FF003C',
            fontFamily: '"Arial Nova", sans-serif',
          },
          success: {
             iconTheme: { primary: '#FF003C', secondary: '#F4F4F4' }
          }
        }}
      />
      
      {/* Loading Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/90 backdrop-blur-sm">
           <div className="w-full max-w-md p-6 bg-brand-panel border border-brand-accent/30 rounded-2xl shadow-[0_0_50px_rgba(255,0,60,0.2)]">
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
      <header className="bg-brand-panel border-b border-white/5 flex-shrink-0 z-10 relative">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-brand-accent rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(255,0,60,0.4)] transition-transform hover:scale-105">
              <Box className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-spartan font-bold text-white tracking-wide">
                GENZEO<span className="text-brand-accent">.</span> platform
              </h1>
              <p className="text-xs text-gray-400 tracking-wider uppercase font-medium">
                Professional 2D → 3D Suite
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Mode Switcher */}
            <div className="flex bg-brand-dark/50 rounded-lg p-1 border border-white/10">
              <button
                onClick={() => setGenerationMode('image')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
                  generationMode === 'image'
                    ? 'bg-brand-accent text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Images className="w-4 h-4" /> Image 3D
              </button>
              <button
                onClick={() => setGenerationMode('text')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
                  generationMode === 'text'
                    ? 'bg-brand-accent text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Edit3 className="w-4 h-4" /> Text 3D
              </button>
            </div>

            <div className="h-8 w-px bg-white/10 mx-2"></div>

            {/* Tab Switcher */}
            <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 border ${
                    activeTab === 'upload'
                      ? 'border-brand-accent text-brand-accent bg-brand-accent/10'
                      : 'border-transparent text-gray-400 hover:text-white'
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
                      ? 'border-brand-accent text-brand-accent bg-brand-accent/10'
                      : 'border-transparent text-gray-400 hover:text-white'
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
        {/* Dekorativní pozadí (Glow efekty) */}
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-brand-accent/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-1/4 h-1/4 bg-blue-900/10 blur-[100px] rounded-full pointer-events-none" />

        {/* --- UPLOAD TAB --- */}
        {activeTab === 'upload' && (
          <div className="h-full overflow-y-auto custom-scrollbar">
            <div className="max-w-[1600px] mx-auto px-6 py-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* --- LEFT PANEL (INPUT) --- */}
                <div className="lg:col-span-8 space-y-6">
                  <div className="bg-brand-panel border border-white/5 rounded-2xl shadow-2xl p-8 backdrop-blur-sm bg-opacity-80 relative overflow-hidden">
                    {/* Top Accent Line */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-accent to-transparent opacity-50" />
                    
                    {generationMode === 'image' ? (
                      <>
                        <div className="flex items-center justify-between mb-6">
                          <h2 className="text-xl font-spartan font-bold flex items-center gap-3">
                            <span className="w-8 h-8 rounded bg-brand-accent/20 flex items-center justify-center text-brand-accent">
                                <Images className="w-5 h-5" />
                            </span>
                            Nahrát podklady
                          </h2>
                          <div className="flex bg-brand-dark p-1 rounded-lg border border-white/5">
                              <button 
                                onClick={() => {
                                  setUploadMode('single');
                                  setShowPreview(false);
                                  setProcessedImages([]);
                                }} 
                                className={`px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${uploadMode === 'single' ? 'bg-brand-accent text-white shadow-md' : 'text-gray-500 hover:text-white'}`}
                              >
                                Single
                              </button>
                              <button 
                                onClick={() => {
                                  setUploadMode('multi');
                                  setShowPreview(false);
                                  setProcessedImages([]);
                                }} 
                                className={`px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${uploadMode === 'multi' ? 'bg-brand-accent text-white shadow-md' : 'text-gray-500 hover:text-white'}`}
                              >
                                Multi-View
                              </button>
                          </div>
                        </div>

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
                            <div className="bg-brand-dark/50 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
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
                                                : 'border-white/10 bg-transparent text-gray-400 hover:border-white/30 hover:text-white'
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
                                        className="w-full py-3 bg-brand-dark hover:bg-white/5 border border-white/10 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:border-brand-accent/50 text-gray-300 hover:text-white"
                                    >
                                        <Edit3 className="w-4 h-4" /> Editor obrázku
                                    </button>
                                    <button
                                      onClick={handlePreviewImages}
                                      disabled={isProcessing || isPreviewProcessing}
                                      className="w-full py-3 bg-gradient-to-r from-brand-accent to-red-600 hover:from-red-500 hover:to-red-600 rounded-xl text-white text-sm font-bold shadow-lg shadow-brand-accent/20 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        {isPreviewProcessing ? 'Analyzuji...' : 'Generovat Náhled'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Instructions */}
                        <div className="mt-6">
                            <InstructionsChat onInstructionsChange={setInstructions} disabled={isProcessing} />
                        </div>

                        {/* Preview Gallery */}
                        {showPreview && processedImages.length > 0 && (
                            <div className="mt-6 border-t border-white/10 pt-6">
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
                        <div className="mb-6">
                            <h2 className="text-xl font-spartan font-bold flex items-center gap-3 mb-2">
                                <span className="w-8 h-8 rounded bg-brand-accent/20 flex items-center justify-center text-brand-accent">
                                    <Edit3 className="w-5 h-5" />
                                </span>
                                Text to 3D
                            </h2>
                            <p className="text-gray-400 text-sm">Popište svou vizi a nechte AI vytvořit model během pár vteřin.</p>
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
                        <div className="bg-brand-dark rounded-2xl border border-brand-accent overflow-hidden h-64 relative shadow-[0_0_30px_rgba(255,0,60,0.15)] group">
                            <div className="absolute inset-0">
                                {aiModelUrl ? <GLBViewer modelUrl={aiModelUrl} /> : <ThreeViewer mesh={mesh} />}
                            </div>
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                <button 
                                  onClick={() => setActiveTab('viewer')} 
                                  className="bg-brand-accent text-white px-8 py-3 rounded-full font-bold transform translate-y-4 group-hover:translate-y-0 transition-all shadow-[0_0_20px_rgba(255,0,60,0.5)] flex items-center gap-2"
                                >
                                    <Layout className="w-5 h-5" /> Otevřít Studio
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-brand-panel border border-white/5 rounded-2xl p-8 text-center h-64 flex flex-col items-center justify-center opacity-60">
                            <div className="w-16 h-16 bg-brand-dark rounded-full flex items-center justify-center mb-4 shadow-inner border border-white/5">
                                <Box className="w-8 h-8 text-gray-600" />
                            </div>
                            <p className="text-gray-500 font-bold">Zatím žádný model</p>
                            <p className="text-gray-600 text-xs mt-2">Nahrajte obrázek nebo zadejte text</p>
                        </div>
                    )}

                    {/* Rigging Panel (Visible only when model exists) */}
                    {aiModelUrl && (
                        <div className="bg-brand-panel border-l-4 border-brand-accent rounded-r-xl p-6 shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                              <Bone className="w-16 h-16 text-white" />
                            </div>
                            <div className="flex items-center gap-3 mb-4 relative z-10">
                                <Bone className="text-brand-accent w-6 h-6" />
                                <h3 className="font-spartan font-bold text-lg text-white">AI Rigging</h3>
                            </div>
                            <div className="relative z-10">
                              <RiggingControl modelUrl={aiModelUrl} onRigged={handleRiggingComplete} />
                            </div>
                        </div>
                    )}

                    {/* Parameters & Export */}
                    <div className="bg-brand-panel border border-white/5 rounded-2xl p-6 relative">
                         <div className="absolute top-0 left-0 w-1 h-full bg-brand-dark" />
                         <ParameterControls
                            params={{ resolution: 3, depthScale: 3.0, smoothness: 0.5 }}
                            onParamsChange={() => {}}
                            onRegenerate={handleGenerate}
                            onExport={handleExport}
                            disabled={(!mesh && !aiModelUrl) || isProcessing}
                            showParams={false} // Zjednodušeno pro čistší design pravého panelu
                            aiModelUrl={aiModelUrl}
                         />
                    </div>
                    
                    {/* Info Tip Box */}
                    <div className="bg-gradient-to-br from-brand-accent/10 to-brand-panel rounded-2xl p-6 border border-brand-accent/20">
                         <div className="flex items-start gap-4">
                             <div className="bg-brand-accent/20 p-2 rounded-lg">
                                <Zap className="w-6 h-6 text-brand-accent" />
                             </div>
                             <div>
                                 <h4 className="font-bold text-white mb-1 font-spartan">GENZEO Tip</h4>
                                 <p className="text-xs text-gray-300 leading-relaxed font-sans">
                                     Pro nejlepší výsledky používejte obrázky s vysokým kontrastem a neutrálním pozadím.
                                     Meshy API v2 nyní podporuje PBR materiály automaticky.
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
                   className="bg-brand-panel/90 backdrop-blur border border-white/10 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-panel hover:border-brand-accent transition-all flex items-center gap-2 shadow-xl"
                >
                  ← Zpět do Studia
                </button>
                
                {aiModelUrl && (
                    <div className="w-72 bg-brand-panel/90 backdrop-blur border border-white/10 rounded-xl p-5 shadow-2xl">
                        <div className="flex items-center gap-2 mb-3 text-brand-accent font-bold text-xs uppercase tracking-wider">
                           <Bone className="w-4 h-4" /> Animace & Rigging
                        </div>
                        <RiggingControl modelUrl={aiModelUrl} onRigged={handleRiggingComplete} />
                    </div>
                )}
             </div>

             {/* 3D Canvas Container */}
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
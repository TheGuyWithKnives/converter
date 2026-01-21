import { useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Box, Sparkles, Images, Edit3, Layout, Upload, Bone } from 'lucide-react'; // Přidán Bone icon
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
// --- NOVÉ IMPORTY ---
import { TextTo3DGenerator } from './components/TextTo3DGenerator';
import { RiggingControl } from './components/RiggingControl';
// --------------------
import { generateMeshFromDepth } from './services/meshGenerator'; // MeshGenerationParams removed if unused
import {
  exportToOBJ,
  exportToSTL,
  exportToPLY,
  exportToFBX,
  downloadFile,
} from './services/exporters';
import { generateModelFromImage, QualityPreset } from './services/triposrService';
import { applyInstructionsToImage } from './services/instructionsProcessor';

type UploadMode = 'single' | 'multi';
type GenerationMode = 'image' | 'text'; // Nový typ pro přepínání režimů

interface ProcessedImage {
  original: string;
  processed: string;
  file: File;
  hasChanges: boolean;
}

function App() {
  // Původní state
  const [currentImage, setCurrentImage] = useState<{ file: File; url: string } | null>(null);
  const [currentImages, setCurrentImages] = useState<{ files: File[]; urls: string[] }>({ files: [], urls: [] });
  const [uploadMode, setUploadMode] = useState<UploadMode>('single');
  const [instructions, setInstructions] = useState<string>('');
  const [mesh, setMesh] = useState<THREE.Mesh | null>(null);
  const [aiModelUrl, setAiModelUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  const [showPreview, setShowPreview] = useState(false);
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [isPreviewProcessing, setIsPreviewProcessing] = useState(false);
  const [qualityPreset, setQualityPreset] = useState<QualityPreset>('quality');
  const [showEditor, setShowEditor] = useState(false);
  const [editingFile, setEditingFile] = useState<File | null>(null);
  const [useEnhancedViewer, setUseEnhancedViewer] = useState(true); // setUseEnhancedViewer
  const [activeTab, setActiveTab] = useState<'upload' | 'viewer'>('upload');
  
  // --- NOVÝ STATE ---
  const [generationMode, setGenerationMode] = useState<GenerationMode>('image');
  // ------------------

  const abortControllerRef = useRef<AbortController | null>(null);

  const cancelProcessing = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort('User cancelled');
      abortControllerRef.current = null;
      setIsProcessing(false);
      setProgress(0);
      setProgressMessage('');
      console.log('Processing cancelled by user');
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
    setProgressMessage('Příprava obrázku...');
    setAiModelUrl(null);
    setMesh(null);

    try {
      const imageCount = (additionalFiles?.length || 0) + 1;
      setProgressMessage(`Vytváření 3D modelu z ${imageCount} obrázků pomocí AI...`);
      setProgress(0.1);

      const result = await generateModelFromImage(imageUrl, file, additionalFiles, userInstructions, quality || qualityPreset, signal);

      setProgress(0.9);
      setProgressMessage('Model připraven!');

      if (result.model_url) {
        setAiModelUrl(result.model_url);
        setProgress(1);
        setProgressMessage('Model je připraven!');
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

      if (errorMessage.includes('loading')) {
        alert(`TripoSR model se načítá...\n\nProsím počkejte cca 20 sekund a zkuste to znovu.`);
      } else {
        alert(`Chyba při generování: ${errorMessage}\n\nZkuste to prosím znovu za chvíli.`);
      }

      setIsProcessing(false);
      setProgress(0);
    }
  }, [qualityPreset]);

  // --- NOVÝ HANDLER PRO TEXT TO 3D ---
  const handleTextTo3DReady = useCallback((url: string) => {
    setAiModelUrl(url);
    setActiveTab('viewer');
  }, []);
  // -----------------------------------

  // --- NOVÝ HANDLER PRO RIGGING ---
  const handleRiggingComplete = useCallback((url: string) => {
    setAiModelUrl(url);
    // Zůstaneme ve vieweru, jen aktualizujeme model
  }, []);
  // --------------------------------

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

  const handlePreviewImages = useCallback(async () => {
    setIsPreviewProcessing(true);
    setProgressMessage('Připravuji náhled úprav...');

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
      alert('Chyba při vytváření náhledu: ' + (error as Error).message);
    } finally {
      setIsPreviewProcessing(false);
      setProgressMessage('');
    }
  }, [uploadMode, currentImage, currentImages, instructions]);

  const handleConfirmPreview = useCallback(() => {
    setShowPreview(false);

    if (uploadMode === 'single' && processedImages.length > 0) {
      const processedFile = processedImages[0].file;
      const processedUrl = processedImages[0].processed;

      const urlsToRevoke = processedImages.map(img => ({
        original: img.original,
        processed: img.hasChanges ? img.processed : null,
      }));

      const processPromise = processImageWithAI(processedUrl, processedFile, undefined, instructions);

      setTimeout(() => {
        urlsToRevoke.forEach(({ original, processed }) => {
          try {
            URL.revokeObjectURL(original);
            if (processed) URL.revokeObjectURL(processed);
          } catch (e) {
            console.warn('Failed to revoke URL:', e);
          }
        });
      }, 1000);

      processPromise.catch((error) => {
        console.error('Processing failed:', error);
      });
    } else if (uploadMode === 'multi' && processedImages.length > 0) {
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
          } catch (e) {
            console.warn('Failed to revoke URL:', e);
          }
        });
      }, 1000);

      processPromise.catch((error) => {
        console.error('Processing failed:', error);
      });
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
    processedImages.forEach(img => {
      URL.revokeObjectURL(img.original);
      if (img.hasChanges) {
        URL.revokeObjectURL(img.processed);
      }
    });
    setProcessedImages([]);
    setShowPreview(false);
  }, [processedImages]);

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
  }, [uploadMode, currentImage, currentImages]);

  const handleEditorCancel = useCallback(() => {
    setShowEditor(false);
    setEditingFile(null);
  }, []);

  const handleGenerate = useCallback(() => {
    if (uploadMode === 'single' && currentImage) {
      processImageWithAI(currentImage.url, currentImage.file, undefined, instructions);
    } else if (uploadMode === 'multi' && currentImages.files.length > 0) {
      const [mainFile, ...additionalFiles] = currentImages.files;
      const [mainUrl] = currentImages.urls;
      processImageWithAI(mainUrl, mainFile, additionalFiles, instructions);
    }
  }, [uploadMode, currentImage, currentImages, processImageWithAI, instructions]);

  const handleExport = useCallback(
    (format: 'obj' | 'stl' | 'ply' | 'fbx') => {
      if (!mesh) return;

      const filename = currentImage?.file.name.replace(/\.[^/.]+$/, '') || 'model';

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
    },
    [mesh, currentImage]
  );

  useEffect(() => {
    return () => {
      if (currentImage) {
        try {
          URL.revokeObjectURL(currentImage.url);
        } catch (e) {
          console.warn('Failed to revoke URL on unmount:', e);
        }
      }

      currentImages.urls.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          console.warn('Failed to revoke URL on unmount:', e);
        }
      });

      processedImages.forEach(img => {
        try {
          URL.revokeObjectURL(img.original);
          if (img.hasChanges) {
            URL.revokeObjectURL(img.processed);
          }
        } catch (e) {
          console.warn('Failed to revoke URL on unmount:', e);
        }
      });
    };
  }, []);

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      {isProcessing && (
        <ProgressBar
          progress={progress}
          message={progressMessage}
          onCancel={cancelProcessing}
          cancellable={true}
        />
      )}

      <header className="bg-slate-800 border-b border-slate-700 shadow-lg flex-shrink-0">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg">
              <Box className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">3D Studio Pro</h1>
              <p className="text-xs text-slate-400">Professional 2D to 3D Converter</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* --- NOVÝ PŘEPÍNAČ REŽIMŮ --- */}
            <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
              <button
                onClick={() => setGenerationMode('image')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  generationMode === 'image'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🖼️ Image to 3D
              </button>
              <button
                onClick={() => setGenerationMode('text')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  generationMode === 'text'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📝 Text to 3D
              </button>
            </div>
            {/* --------------------------- */}

            <div className="h-6 w-px bg-slate-700 mx-2"></div>

            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'upload'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload & Generate
            </button>
            <button
              onClick={() => setActiveTab('viewer')}
              disabled={!mesh && !aiModelUrl}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'viewer'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Layout className="w-4 h-4" />
              3D Viewer
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {activeTab === 'upload' && (
          <div className="h-full overflow-y-auto">
            <div className="max-w-7xl mx-auto px-6 py-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* --- LEVÝ PANEL (Vstup) --- */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    
                    {/* Logika pro zobrazení podle režimu (Image vs Text) */}
                    {generationMode === 'image' ? (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-blue-600" />
                            Nahrát obrázek
                          </h2>
                        </div>

                        <div className="mb-4 flex gap-2">
                          <button
                            onClick={() => {
                              setUploadMode('single');
                              setShowPreview(false);
                              setProcessedImages([]);
                            }}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              uploadMode === 'single'
                                ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            disabled={isProcessing}
                          >
                            Jeden obrázek
                          </button>
                          <button
                            onClick={() => {
                              setUploadMode('multi');
                              setShowPreview(false);
                              setProcessedImages([]);
                            }}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              uploadMode === 'multi'
                                ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            disabled={isProcessing}
                          >
                            <Images className="w-4 h-4 inline mr-1" />
                            Více úhlů
                          </button>
                        </div>

                        {uploadMode === 'multi' ? (
                          <MultiImageUpload onImagesUpload={handleMultiImageUpload} disabled={isProcessing} />
                        ) : (
                          <ImageUpload onImageUpload={handleImageUpload} disabled={isProcessing} />
                        )}

                        {/* --- KVALITA PRESETS --- */}
                        <div className="mt-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Kvalita modelu
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              onClick={() => setQualityPreset('fast')}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                qualityPreset === 'fast'
                                  ? 'bg-green-600 text-white shadow-md'
                                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                              }`}
                              disabled={isProcessing}
                            >
                              <div className="font-semibold">Rychlý</div>
                              <div className="text-xs opacity-80">~30s</div>
                            </button>
                            <button
                              onClick={() => setQualityPreset('quality')}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                qualityPreset === 'quality'
                                  ? 'bg-blue-600 text-white shadow-md'
                                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                              }`}
                              disabled={isProcessing}
                            >
                              <div className="font-semibold">Kvalita</div>
                              <div className="text-xs opacity-80">~45s</div>
                            </button>
                            <button
                              onClick={() => setQualityPreset('ultra')}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                qualityPreset === 'ultra'
                                  ? 'bg-purple-600 text-white shadow-md'
                                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                              }`}
                              disabled={isProcessing}
                            >
                              <div className="font-semibold">Ultra</div>
                              <div className="text-xs opacity-80">~60s</div>
                            </button>
                          </div>
                          <p className="text-xs text-slate-500 mt-2">
                            {qualityPreset === 'fast' && '⚡ Nejrychlejší generování, dobrá kvalita'}
                            {qualityPreset === 'quality' && '🎯 Vyvážený poměr kvality a rychlosti (výchozí)'}
                            {qualityPreset === 'ultra' && '✨ Maximální kvalita geometrie a textur'}
                          </p>
                        </div>

                        {/* --- INTRUCTIONS CHAT --- */}
                        <div className="mt-4">
                          <InstructionsChat
                            onInstructionsChange={setInstructions}
                            disabled={isProcessing}
                          />
                        </div>

                        {/* --- AKCE (Editor, Náhled) --- */}
                        {((uploadMode === 'single' && currentImage) || (uploadMode === 'multi' && currentImages.files.length > 0)) && !mesh && !aiModelUrl && !showPreview && (
                          <div className="mt-4 space-y-3">
                            <button
                              onClick={handleOpenEditor}
                              disabled={isProcessing}
                              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all font-medium text-slate-700 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Edit3 className="w-5 h-5" />
                              Upravit obrázek (Crop, Rotate, Colors)
                            </button>

                            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border-2 border-blue-200">
                              <div className="flex items-start gap-4">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-slate-800 mb-2">
                                    Připraveno k náhledu
                                  </h3>
                                  <p className="text-sm text-slate-600">
                                    {uploadMode === 'single'
                                      ? '1 obrázek nahraný'
                                      : `${currentImages.files.length} obrázků nahráno`}
                                    {instructions && ' • Instrukce budou aplikovány'}
                                  </p>
                                </div>
                                <button
                                  onClick={handlePreviewImages}
                                  disabled={isProcessing || isPreviewProcessing}
                                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
                                >
                                  <Sparkles className="w-5 h-5" />
                                  {isPreviewProcessing ? 'Připravuji...' : 'Náhled úprav'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* --- NÁHLED GALERIE --- */}
                        {showPreview && processedImages.length > 0 && (
                          <div className="mt-4">
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
                      // --- SEKCE TEXT TO 3D ---
                      <div className="p-2">
                        <TextTo3DGenerator onModelReady={handleTextTo3DReady} />
                        
                        <div className="mt-8 bg-slate-50 p-4 rounded-lg border border-slate-200">
                           <h4 className="font-bold text-slate-700 mb-2">Jak psát prompty?</h4>
                           <ul className="text-sm text-slate-600 space-y-2 list-disc pl-4">
                             <li>Buďte konkrétní: "A red sports car, shiny paint" místo "car"</li>
                             <li>Popište styl: "low poly", "realistic", "voxel", "cyberpunk"</li>
                             <li>Zmiňte detaily: "wearing a hat", "holding a sword"</li>
                           </ul>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* --- MENŠÍ 3D NÁHLED V UPLOAD TABU --- */}
                  {(mesh || aiModelUrl) && (
                    <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden h-[600px] border border-slate-700 relative">
                      <div className="h-full">
                        {aiModelUrl ? (
                          <GLBViewer modelUrl={aiModelUrl} />
                        ) : mesh ? (
                          <ThreeViewer mesh={mesh} />
                        ) : null}
                      </div>
                      
                      {/* Tlačítko pro přechod do velkého Vieweru */}
                      <button 
                        onClick={() => setActiveTab('viewer')}
                        className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
                      >
                         <Layout className="w-4 h-4" /> Otevřít ve Studiu
                      </button>
                    </div>
                  )}

                  {!mesh && !aiModelUrl && !isProcessing && generationMode === 'image' && (
                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-300 rounded-lg p-6">
                      <div className="flex gap-3">
                        <Sparkles className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-bold text-blue-900 mb-2 text-lg">
                            AI-Powered 3D Reconstruction
                          </h3>
                          <div className="text-sm text-blue-800 space-y-2">
                            <p className="font-medium">
                              Profesionální konverze obrázků na 3D modely pomocí TripoSR AI:
                            </p>
                            <ul className="space-y-1 ml-4">
                              <li>• Realistická 3D rekonstrukce s přesnou geometrií</li>
                              <li>• Plně objemový model viditelný ze všech stran</li>
                              <li>• Pokročilé nástroje pro editaci materiálů a meshů</li>
                              <li>• Multi-angle support pro ještě lepší kvalitu</li>
                              <li>• Generování trvá 30-60 sekund (zdarma)</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* --- PRAVÝ PANEL (Tools & Info) --- */}
                <div className="lg:col-span-1 space-y-6">
                  
                  {/* POKUD MÁME MODEL, UKAŽ RIGGING (i v upload tabu) */}
                  {aiModelUrl && (
                    <div className="bg-slate-800 rounded-lg shadow-lg p-4 border border-slate-700">
                      <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                        <Bone className="w-5 h-5 text-green-500" />
                        AI Rigging
                      </h3>
                      <p className="text-slate-400 text-xs mb-3">
                        Automaticky přidá kostru pro animace.
                      </p>
                      <RiggingControl modelUrl={aiModelUrl} onRigged={handleRiggingComplete} />
                    </div>
                  )}

                  <ParameterControls
                    params={{ resolution: 3, depthScale: 3.0, smoothness: 0.5 }}
                    onParamsChange={() => {}}
                    onRegenerate={handleGenerate}
                    onExport={handleExport}
                    disabled={(!mesh && !aiModelUrl) || isProcessing}
                    showParams={false}
                    aiModelUrl={aiModelUrl}
                  />

                  <div className="bg-slate-800 rounded-lg shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-white mb-3">
                      Podporované formáty
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-blue-400">.OBJ</span>
                        <span className="text-slate-300">
                          Univerzální formát s texturami
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-blue-400">.STL</span>
                        <span className="text-slate-300">
                          Optimalizováno pro 3D tisk
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-blue-400">.PLY</span>
                        <span className="text-slate-300">
                          Polygon file format s barvami
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-blue-400">.FBX</span>
                        <span className="text-slate-300">
                          Pro animace a profesionální SW
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-800 rounded-lg shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-white mb-3">Tipy pro nejlepší výsledky</h3>
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li>• Použijte obrázky s dobrým kontrastem</li>
                      <li>• Vyhněte se rozmazaným fotografiím</li>
                      <li>• Objekty s výraznými tvary fungují lépe</li>
                      <li>• Experimenty s parametry vyhlazení</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- VIEWER TAB --- */}
        {activeTab === 'viewer' && (mesh || aiModelUrl) && (
          <div className="h-full relative">
             {/* Overlay s nástroji pro Viewer */}
             <div className="absolute top-4 left-4 z-10 w-64 space-y-4">
                <button 
                   onClick={() => setActiveTab('upload')}
                   className="bg-slate-800/80 backdrop-blur text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-slate-700"
                >
                  ← Zpět k nastavení
                </button>

                {/* Rigging Control ve Vieweru */}
                {aiModelUrl && (
                  <div className="bg-slate-800/90 backdrop-blur p-4 rounded-lg border border-slate-600 shadow-xl">
                    <h4 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
                       <Bone className="w-4 h-4 text-green-400" /> Animace & Rigging
                    </h4>
                    <RiggingControl modelUrl={aiModelUrl} onRigged={handleRiggingComplete} />
                  </div>
                )}
             </div>

            {aiModelUrl && useEnhancedViewer ? (
              <EnhancedGLBViewer modelUrl={aiModelUrl} />
            ) : aiModelUrl ? (
              <div className="h-full bg-slate-800">
                <GLBViewer modelUrl={aiModelUrl} />
              </div>
            ) : mesh ? (
              <div className="h-full bg-slate-800">
                <ThreeViewer mesh={mesh} />
              </div>
            ) : null}
          </div>
        )}
      </main>

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
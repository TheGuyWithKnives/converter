import { useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Box, Info, Sparkles, Images, Edit3, X } from 'lucide-react';
import ImageUpload from './components/ImageUpload';
import MultiImageUpload from './components/MultiImageUpload';
import InstructionsChat from './components/InstructionsChat';
import ImagePreviewGallery from './components/ImagePreviewGallery';
import ThreeViewer from './components/ThreeViewer';
import GLBViewer from './components/GLBViewer';
import ParameterControls from './components/ParameterControls';
import ProgressBar from './components/ProgressBar';
import ImageEditor from './components/ImageEditor';
import { generateMeshFromDepth, MeshGenerationParams } from './services/meshGenerator';
import {
  exportToOBJ,
  exportToSTL,
  exportToPLY,
  exportToFBX,
  downloadFile,
} from './services/exporters';
import { generateModelFromImage, QualityPreset } from './services/triposrService';
import { applyInstructionsToImage } from './services/instructionsProcessor';

type ProcessingMode = 'basic' | 'ai';
type UploadMode = 'single' | 'multi';

interface ProcessedImage {
  original: string;
  processed: string;
  file: File;
  hasChanges: boolean;
}

function App() {
  const [currentImage, setCurrentImage] = useState<{ file: File; url: string } | null>(null);
  const [currentImages, setCurrentImages] = useState<{ files: File[]; urls: string[] }>({ files: [], urls: [] });
  const [uploadMode, setUploadMode] = useState<UploadMode>('single');
  const [instructions, setInstructions] = useState<string>('');
  const [mesh, setMesh] = useState<THREE.Mesh | null>(null);
  const [aiModelUrl, setAiModelUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [processingMode, setProcessingMode] = useState<ProcessingMode>('ai');
  const [params, setParams] = useState<MeshGenerationParams>({
    resolution: 3,
    depthScale: 3.0,
    smoothness: 0.5,
  });

  const [showPreview, setShowPreview] = useState(false);
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [isPreviewProcessing, setIsPreviewProcessing] = useState(false);
  const [qualityPreset, setQualityPreset] = useState<QualityPreset>('quality');
  const [showEditor, setShowEditor] = useState(false);
  const [editingFile, setEditingFile] = useState<File | null>(null);

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
      }, 500);
    } catch (error) {
      console.error('AI processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('loading')) {
        alert(`TripoSR model se načítá...\n\nProsím počkejte cca 20 sekund a zkuste to znovu.\n\nMezitím můžete použít Basic Mode.`);
      } else {
        alert(`AI Mode Error: ${errorMessage}\n\nZkuste to prosím znovu za chvíli, nebo použijte Basic Mode.`);
      }

      setIsProcessing(false);
      setProgress(0);
    }
  }, [qualityPreset]);

  const processImageBasic = useCallback(
    async (imageUrl: string) => {
      setIsProcessing(true);
      setProgress(0);
      setProgressMessage('Načítání obrázku...');
      setAiModelUrl(null);
      setMesh(null);

      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = imageUrl;
        });

        setProgressMessage('Odstranění pozadí...');
        setProgress(0.1);
        const { removeBackground } = await import('./services/backgroundRemoval');
        const bgRemovalResult = await removeBackground(img, (p) => {
          setProgress(0.1 + p * 0.2);
        });

        setProgressMessage('Odhad hloubky z obrázku...');
        setProgress(0.3);
        const { estimateDepth, depthMapToArray } = await import('./services/depthEstimation');
        const depthResult = await estimateDepth(
          bgRemovalResult.imageWithoutBg,
          bgRemovalResult.mask,
          (p) => {
            setProgress(0.3 + p * 0.3);
          }
        );

        setProgressMessage('Převod depth mapy na pole dat...');
        setProgress(0.6);
        const depthArray = await depthMapToArray(depthResult.depthMap);

        setProgressMessage('Generování 3D modelu...');
        setProgress(0.7);

        const canvasUrl = bgRemovalResult.imageWithoutBg.toDataURL();

        const generatedMesh = await generateMeshFromDepth(
          canvasUrl,
          depthArray,
          depthResult.width,
          depthResult.height,
          params,
          bgRemovalResult.mask
        );

        depthResult.depthMap.dispose();

        setProgress(1);
        setProgressMessage('Hotovo!');
        setMesh(generatedMesh);

        setTimeout(() => {
          setIsProcessing(false);
          setProgress(0);
        }, 500);
      } catch (error) {
        console.error('Chyba při zpracování:', error);
        alert('Nastala chyba při zpracování obrázku. Zkuste to prosím znovu.');
        setIsProcessing(false);
        setProgress(0);
      }
    },
    [params]
  );

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

      console.log('Preview - Instructions:', instructions);
      console.log('Preview - Has instructions:', hasInstructions);
      console.log('Preview - Files to process:', filesToProcess.length);

      const processed = await Promise.all(
        filesToProcess.map(async (file, index) => {
          const originalUrl = URL.createObjectURL(file);

          if (hasInstructions) {
            console.log(`Processing file ${index + 1}/${filesToProcess.length} with instructions`);
            const result = await applyInstructionsToImage(file, instructions);
            console.log(`File ${index + 1} processed successfully`);
            return {
              original: originalUrl,
              processed: result.url,
              file: result.file,
              hasChanges: true,
            };
          }

          console.log(`File ${index + 1} - no instructions, using original`);
          return {
            original: originalUrl,
            processed: originalUrl,
            file: file,
            hasChanges: false,
          };
        })
      );

      console.log('Preview - All files processed:', processed.length);
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

      const processPromise = processingMode === 'ai'
        ? processImageWithAI(processedUrl, processedFile, undefined, instructions)
        : processImageBasic(processedUrl);

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

      if (processingMode === 'ai') {
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
    }

    setProcessedImages([]);
  }, [uploadMode, processedImages, processingMode, processImageWithAI, processImageBasic, instructions]);

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
      if (processingMode === 'ai') {
        processImageWithAI(currentImage.url, currentImage.file, undefined, instructions);
      } else {
        processImageBasic(currentImage.url);
      }
    } else if (uploadMode === 'multi' && currentImages.files.length > 0) {
      const [mainFile, ...additionalFiles] = currentImages.files;
      const [mainUrl] = currentImages.urls;
      if (processingMode === 'ai') {
        processImageWithAI(mainUrl, mainFile, additionalFiles, instructions);
      }
    }
  }, [uploadMode, currentImage, currentImages, processingMode, processImageWithAI, processImageBasic, instructions]);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {isProcessing && (
        <ProgressBar
          progress={progress}
          message={progressMessage}
          onCancel={cancelProcessing}
          cancellable={true}
        />
      )}

      <header className="bg-slate-800 border-b border-slate-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Box className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">2D → 3D Converter</h1>
              <p className="text-sm text-slate-400">
                Převod obrázků na 3D modely pomocí AI
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800">
                  Nahrát obrázek
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setProcessingMode('ai');
                      setShowPreview(false);
                      setProcessedImages([]);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      processingMode === 'ai'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                    disabled={isProcessing}
                  >
                    <Sparkles className="w-4 h-4 inline mr-1" />
                    AI Mode
                  </button>
                  <button
                    onClick={() => {
                      setProcessingMode('basic');
                      setShowPreview(false);
                      setProcessedImages([]);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      processingMode === 'basic'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                    disabled={isProcessing}
                  >
                    Basic Mode
                  </button>
                </div>
              </div>

              {processingMode === 'ai' && (
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
              )}

              {processingMode === 'ai' && uploadMode === 'multi' ? (
                <MultiImageUpload onImagesUpload={handleMultiImageUpload} disabled={isProcessing} />
              ) : (
                <ImageUpload onImageUpload={handleImageUpload} disabled={isProcessing} />
              )}

              {processingMode === 'ai' && (
                <>
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

                  <div className="mt-4">
                    <InstructionsChat
                      onInstructionsChange={setInstructions}
                      disabled={isProcessing}
                    />
                  </div>
                </>
              )}

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
            </div>

            {(mesh || aiModelUrl) && (
              <div className="bg-white rounded-lg shadow-lg overflow-hidden h-[600px]">
                <div className="h-full">
                  {aiModelUrl ? (
                    <GLBViewer modelUrl={aiModelUrl} />
                  ) : mesh ? (
                    <ThreeViewer mesh={mesh} />
                  ) : null}
                </div>
              </div>
            )}

            {!mesh && !aiModelUrl && !isProcessing && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">
                      Jak to funguje?
                    </h3>
                    <div className="text-sm text-blue-800 space-y-3">
                      <div>
                        <strong className="text-purple-700">AI Mode (Doporučeno):</strong>
                        <ol className="mt-1 space-y-1 ml-4">
                          <li>• TripoSR AI pro realistickou 3D rekonstrukci</li>
                          <li>• Vytvoří plně objemový 3D model ze všech stran</li>
                          <li>• Zdarma přes Hugging Face Gradio Space</li>
                          <li>• Trvá 30-60 sekund</li>
                        </ol>
                      </div>
                      <div>
                        <strong className="text-blue-700">Basic Mode:</strong>
                        <ol className="mt-1 space-y-1 ml-4">
                          <li>• Rychlá depth-map konverze (5-15 sekund)</li>
                          <li>• Běží lokálně ve vašem prohlížeči</li>
                          <li>• Vytvoří 2.5D relief s texturami</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <ParameterControls
              params={params}
              onParamsChange={setParams}
              onRegenerate={handleGenerate}
              onExport={handleExport}
              disabled={(!mesh && !aiModelUrl) || isProcessing}
              showParams={processingMode === 'basic'}
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
      </main>

      <footer className="bg-slate-800 border-t border-slate-700 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center text-slate-400 text-sm">
          <p>Využívá TensorFlow.js a Three.js pro zpracování a rendering</p>
        </div>
      </footer>

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

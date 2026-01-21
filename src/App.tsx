import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { ThreeViewer } from './components/ThreeViewer';
import { ImageUpload } from './components/ImageUpload';
import { ParameterControls } from './components/ParameterControls';
import { InstructionsChat } from './components/InstructionsChat';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ViewportControls } from './components/ViewportControls';
import { MeshStatistics } from './components/MeshStatistics';
import { CustomPrinterForm } from './components/CustomPrinterForm';
import { TextTo3DGenerator } from './components/TextTo3DGenerator'; // Nová komponenta
import { RiggingControl } from './components/RiggingControl'; // Nová komponenta

// Typy pro režim generování
type GenerationMode = 'image' | 'text';

function App() {
  // Stav aplikace
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Nový stav pro přepínání režimů
  const [generationMode, setGenerationMode] = useState<GenerationMode>('image');

  // Funkce pro zpracování dokončení generování (společná pro oba režimy)
  const handleModelGenerated = (url: string) => {
    setModelUrl(url);
    setIsProcessing(false);
    setUploadProgress(0);
    setError(null);
  };

  // Handler pro Image Upload (zachováváme původní logiku)
  const handleImageUpload = async (file: File) => {
    setIsProcessing(true);
    setUploadProgress(0);
    setError(null);
    
    // Zde by byla tvá existující logika volání služby (triposrService/meshyService)
    // Pro demonstraci integrace Meshy v ImageUpload komponentě:
    // ImageUpload komponenta by měla volat prop 'onUploadComplete'
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
        <Toaster position="top-right" />

        {/* Hlavní Layout */}
        <main className="container mx-auto px-4 py-8 h-screen flex flex-col">
          
          {/* Hlavička */}
          <header className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                2D→3D Converter
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Advanced AI Meshing & Rigging Engine
              </p>
            </div>
            <div className="flex gap-2">
               {/* Přepínač režimů */}
               <div className="bg-gray-800 p-1 rounded-lg flex border border-gray-700">
                  <button
                    onClick={() => setGenerationMode('image')}
                    className={`px-4 py-2 rounded-md transition-all ${
                      generationMode === 'image' 
                        ? 'bg-blue-600 text-white shadow-lg' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    🖼️ Image to 3D
                  </button>
                  <button
                    onClick={() => setGenerationMode('text')}
                    className={`px-4 py-2 rounded-md transition-all ${
                      generationMode === 'text' 
                        ? 'bg-purple-600 text-white shadow-lg' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    📝 Text to 3D
                  </button>
               </div>
            </div>
          </header>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
            
            {/* Levý Panel - Ovládání a Vstup */}
            <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
              
              {/* Sekce Vstupu - Mění se podle módu */}
              <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4 backdrop-blur-sm">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  {generationMode === 'image' ? 'Vstupní Obrázek' : 'Textové Zadání'}
                </h2>
                
                {generationMode === 'image' ? (
                  // Původní Image Upload
                  <ImageUpload 
                    onUploadStart={() => {
                      setIsProcessing(true);
                      setUploadProgress(0);
                    }}
                    onProgress={setUploadProgress}
                    onProcessingComplete={handleModelGenerated}
                    onError={(err) => setError(err.message)}
                    isProcessing={isProcessing}
                  />
                ) : (
                  // Nový Text to 3D Generator
                  <TextTo3DGenerator 
                    onModelReady={handleModelGenerated} 
                  />
                )}
              </div>

              {/* Parametry a Statistiky */}
              <div className="space-y-6">
                 {/* Zobrazíme parametry jen pokud máme model nebo jsme v image módu */}
                 <ParameterControls 
                   // Zde předej props, které tvá komponenta ParameterControls vyžaduje
                   // Např: settings={...} onSettingsChange={...}
                 />
                 
                 {modelUrl && <MeshStatistics modelUrl={modelUrl} />}
              </div>

              {/* Instrukce / Chat */}
              <div className="flex-1 min-h-[200px]">
                <InstructionsChat />
              </div>
            </div>

            {/* Pravý Panel - 3D Viewer a Výsledek */}
            <div className="lg:col-span-8 flex flex-col gap-6 h-full">
              
              {/* Hlavní Viewer */}
              <div className="relative flex-1 bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden shadow-2xl">
                {modelUrl ? (
                  <>
                    <ThreeViewer 
                      modelUrl={modelUrl} 
                      // enableGrid={true}
                      // autoRotate={true}
                    />
                    <ViewportControls />
                    
                    {/* Tlačítko pro stažení/export (pokud není uvnitř Vieweru) */}
                    <div className="absolute top-4 right-4 flex gap-2">
                      <a 
                        href={modelUrl} 
                        download="model.glb"
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded shadow-lg text-sm font-medium transition-colors"
                      >
                        Download .GLB
                      </a>
                    </div>
                  </>
                ) : (
                  // Placeholder když není model
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 bg-gray-900/50">
                    {isProcessing ? (
                      <div className="text-center">
                        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-lg text-blue-400 font-medium">
                          {generationMode === 'image' ? 'Konvertuji 2D na 3D...' : 'Generuji z textu...'}
                        </p>
                        <p className="text-sm mt-2 opacity-75">{uploadProgress}% dokončeno</p>
                      </div>
                    ) : (
                      <div className="text-center p-8">
                        <div className="text-6xl mb-4 opacity-20">🧊</div>
                        <p className="text-xl font-medium">Zatím žádný model</p>
                        <p className="text-sm mt-2">
                          {generationMode === 'image' 
                            ? 'Nahrajte obrázek vlevo pro začátek' 
                            : 'Zadejte textový popis vlevo'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Panel nástrojů pod Viewerem (Rigging, Tisk) */}
              {modelUrl && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sekce pro Rigging (Animace) */}
                  <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <h3 className="font-bold text-gray-200 mb-2">🦴 AI Rigging & Animace</h3>
                    <RiggingControl 
                      modelUrl={modelUrl} 
                      onRigged={(riggedUrl) => {
                        setModelUrl(riggedUrl);
                        // Volitelně zobrazit notifikaci o úspěchu
                      }} 
                    />
                  </div>

                  {/* Sekce pro 3D Tisk */}
                  <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                     <h3 className="font-bold text-gray-200 mb-2">🖨️ Příprava tisku</h3>
                     <CustomPrinterForm />
                  </div>
                </div>
              )}

            </div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
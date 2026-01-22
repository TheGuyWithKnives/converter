import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image as ImageIcon, X, FileWarning, CheckCircle } from 'lucide-react';

interface ImageUploadProps {
  onImageUpload: (file: File, imageUrl: string) => void;
  disabled?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImageUpload, disabled }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Funkce pro validaci (vrácena zpět z původního kódu)
  const validateFile = (file: File): string | null => {
    if (file.size > 20 * 1024 * 1024) { // 20MB limit
      return 'Soubor je příliš velký (Max 20MB)';
    }
    return null;
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      
      // Validace
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);

      // Vytvoření náhledu
      const imageUrl = URL.createObjectURL(file);
      setPreview(imageUrl);
      onImageUpload(file, imageUrl);
    }
  }, [onImageUpload]);

  const clearPreview = (e: React.MouseEvent) => {
    e.stopPropagation(); // Aby se neotevřelo okno pro výběr souboru
    setPreview(null);
    setError(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxFiles: 1,
    disabled
  });

  // Cleanup náhledu při odchodu
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <div className="w-full space-y-3">
      <div
        {...getRootProps()}
        className={`relative w-full h-72 border-2 border-dashed rounded-xl transition-all duration-300 ease-out cursor-pointer overflow-hidden group
          ${error 
            ? 'border-red-500 bg-red-500/10' 
            : isDragActive 
              ? 'border-brand-accent bg-brand-accent/10 shadow-[0_0_30px_rgba(255,0,60,0.2)]' 
              : 'border-brand-light/10 bg-brand-dark/50 hover:border-brand-accent/50 hover:bg-brand-panel'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {/* Pozadí */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-brand-dark/80 pointer-events-none" />
        
        {preview ? (
          // --- STAV: OBRÁZEK NAHRÁN (Zobrazuje náhled) ---
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-brand-dark/40 backdrop-blur-sm group-hover:bg-brand-dark/60 transition-colors">
            <img 
              src={preview} 
              alt="Preview" 
              className="max-h-full max-w-full object-contain p-4 drop-shadow-2xl"
            />
            
            {/* Tlačítko pro odstranění */}
            <button
              onClick={clearPreview}
              className="absolute top-4 right-4 p-2 bg-brand-dark/80 text-brand-light rounded-full hover:bg-red-600 hover:text-white transition-all border border-brand-light/10 shadow-lg"
              title="Odstranit obrázek"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Indikátor úspěchu */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/50 rounded-full text-green-400 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
               <CheckCircle className="w-3 h-3" /> Připraveno
            </div>
          </div>
        ) : (
          // --- STAV: ČEKÁ NA NAHRÁNÍ ---
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
            <div className={`p-4 rounded-full mb-4 transition-transform duration-300 ${isDragActive ? 'scale-110 bg-brand-accent text-brand-light' : 'bg-brand-panel border border-brand-light/10 text-brand-muted group-hover:text-brand-light group-hover:border-brand-accent'}`}>
              {isDragActive ? (
                <Upload className="w-8 h-8 animate-bounce" />
              ) : (
                <ImageIcon className="w-8 h-8" />
              )}
            </div>
            
            <h3 className="text-lg font-spartan font-bold text-brand-light mb-2">
              {isDragActive ? 'Pusťte soubor zde' : 'Nahrát obrázek'}
            </h3>
            
            <p className="text-sm text-brand-muted max-w-xs font-sans">
              Drag & drop nebo klikněte pro výběr
              <span className="block text-xs opacity-60 mt-1 font-mono">PNG, JPG, WEBP (Max 20MB)</span>
            </p>
          </div>
        )}

        {/* Rohové akcenty */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-brand-accent/30 rounded-tl-lg group-hover:border-brand-accent transition-colors pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-brand-accent/30 rounded-br-lg group-hover:border-brand-accent transition-colors pointer-events-none" />
      </div>

      {/* Chybová hláška */}
      {error && (
        <div className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20 animate-in slide-in-from-top-2">
           <FileWarning className="w-4 h-4" />
           {error}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
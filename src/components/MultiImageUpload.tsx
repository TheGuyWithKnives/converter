import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image as ImageIcon, X, Layers, Plus } from 'lucide-react';

interface MultiImageUploadProps {
  onImagesUpload: (files: File[], imageUrls: string[]) => void;
  disabled?: boolean;
}

const MultiImageUpload: React.FC<MultiImageUploadProps> = ({ onImagesUpload, disabled }) => {
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newPreviews = await Promise.all(
      acceptedFiles.map(async (file) => {
        const buffer = await file.arrayBuffer();
        const memoryFile = new File([buffer], file.name, { type: file.type });
        return {
          file: memoryFile,
          url: URL.createObjectURL(memoryFile),
        };
      })
    );

    setPreviews(prev => {
      const updated = [...prev, ...newPreviews];
      onImagesUpload(updated.map(p => p.file), updated.map(p => p.url));
      return updated;
    });
  }, [onImagesUpload]);

  const removeImage = (index: number) => {
    setPreviews(prev => {
      const updated = prev.filter((_, i) => i !== index);
      // Uvolníme paměť URL
      URL.revokeObjectURL(prev[index].url);
      onImagesUpload(updated.map(p => p.file), updated.map(p => p.url));
      return updated;
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    disabled
  });

  return (
    <div className="w-full space-y-4">
      {/* Dropzone Area */}
      <div
        {...getRootProps()}
        className={`relative w-full h-40 border-2 border-dashed rounded-xl transition-all duration-300 ease-out cursor-pointer overflow-hidden group flex flex-col items-center justify-center
          ${isDragActive 
            ? 'border-brand-accent bg-brand-accent/10 shadow-[0_0_30px_rgba(255,0,60,0.2)]' 
            : 'border-brand-light/10 bg-brand-dark/50 hover:border-brand-accent/50 hover:bg-brand-panel'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-brand-dark/80 pointer-events-none" />
        
        <div className="z-10 text-center p-4">
           <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3 transition-colors ${isDragActive ? 'bg-brand-accent text-white' : 'bg-brand-panel border border-brand-light/10 text-brand-muted group-hover:border-brand-accent group-hover:text-brand-light'}`}>
              <Layers className="w-6 h-6" />
           </div>
           <h3 className="text-sm font-spartan font-bold text-brand-light">
             {isDragActive ? 'Pusťte soubory zde' : 'Nahrát sérii fotek'}
           </h3>
           <p className="text-xs text-brand-muted mt-1 font-sans">
             Nahrajte více úhlů najednou
           </p>
        </div>
      </div>

      {/* Grid náhledů */}
      {previews.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 animate-in fade-in slide-in-from-bottom-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-brand-light/10 group">
              <img 
                src={preview.url} 
                alt={`Preview ${index}`} 
                className="w-full h-full object-cover transition-transform group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={() => removeImage(index)}
                  className="p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg transform hover:scale-110 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-brand-dark/80 rounded text-[10px] font-mono text-brand-accent border border-brand-accent/20">
                #{index + 1}
              </div>
            </div>
          ))}
          
          {/* Tlačítko "Přidat další" v gridu */}
          <div {...getRootProps()} className="aspect-square rounded-lg border border-dashed border-brand-light/10 flex flex-col items-center justify-center cursor-pointer hover:border-brand-accent hover:bg-brand-accent/5 transition-all text-brand-muted hover:text-brand-accent">
             <Plus className="w-6 h-6 mb-1" />
             <span className="text-[10px] uppercase font-bold">Add</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiImageUpload;
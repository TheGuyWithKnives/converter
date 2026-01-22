import React from 'react';
import { X, Check, Edit3, Image as ImageIcon } from 'lucide-react';

interface ProcessedImage {
  original: string;
  processed: string;
  file: File;
  hasChanges: boolean;
}

interface ImagePreviewGalleryProps {
  images: ProcessedImage[];
  onConfirm: () => void;
  onCancel: () => void;
  onEdit: () => void;
  isGenerating: boolean;
}

const ImagePreviewGallery: React.FC<ImagePreviewGalleryProps> = ({
  images,
  onConfirm,
  onCancel,
  onEdit,
  isGenerating
}) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-spartan font-bold text-brand-light flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-brand-accent" />
          Náhled ke zpracování
        </h3>
        <span className="text-xs bg-brand-panel px-2 py-1 rounded border border-brand-light/10 text-brand-muted">
          {images.length} snímků
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {images.map((img, idx) => (
          <div key={idx} className="group relative aspect-square bg-brand-dark rounded-xl overflow-hidden border border-brand-light/10 hover:border-brand-accent/50 transition-all shadow-lg">
            {/* Split view: Original vs Processed if changes exists */}
            {img.hasChanges ? (
               <div className="relative w-full h-full">
                  <img src={img.processed} className="w-full h-full object-cover" alt="Processed" />
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-brand-accent text-white text-[10px] font-bold uppercase rounded shadow-lg">
                     Edited
                  </div>
               </div>
            ) : (
               <img src={img.original} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Original" />
            )}
            
            <div className="absolute top-2 left-2 w-6 h-6 bg-brand-dark/80 rounded-full flex items-center justify-center text-xs font-mono text-brand-light border border-brand-light/10">
              {idx + 1}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          disabled={isGenerating}
          className="flex-1 py-3 bg-brand-dark border border-brand-light/10 rounded-xl text-brand-muted font-bold hover:text-brand-light hover:bg-brand-panel transition-all flex items-center justify-center gap-2"
        >
          <X className="w-4 h-4" /> Zrušit
        </button>
        
        <button
          onClick={onEdit}
          disabled={isGenerating}
          className="flex-1 py-3 bg-brand-dark border border-brand-light/10 rounded-xl text-brand-muted font-bold hover:text-brand-accent hover:border-brand-accent/30 transition-all flex items-center justify-center gap-2"
        >
          <Edit3 className="w-4 h-4" /> Upravit
        </button>

        <button
          onClick={onConfirm}
          disabled={isGenerating}
          className="flex-[2] py-3 bg-gradient-to-r from-brand-accent to-red-600 text-white rounded-xl font-bold shadow-glow hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" /> 
          {isGenerating ? 'Zpracovávám...' : 'Potvrdit a Generovat'}
        </button>
      </div>
    </div>
  );
};

export default ImagePreviewGallery;
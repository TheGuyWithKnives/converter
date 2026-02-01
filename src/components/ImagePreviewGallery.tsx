import React, { useState } from 'react';
import { X, ZoomIn } from 'lucide-react';

interface ImagePreviewGalleryProps {
  images: string[];
  onRemove?: (index: number) => void;
  selectedIndex?: number;
  onSelect?: (index: number) => void;
}

export function ImagePreviewGallery({ 
  images, 
  onRemove, 
  selectedIndex = 0, 
  onSelect 
}: ImagePreviewGalleryProps) {
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  if (images.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-3 gap-2 mt-4 sm:grid-cols-4 md:grid-cols-5">
        {images.map((img, index) => (
          <div 
            key={index} 
            className={`
              relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer group
              ${selectedIndex === index ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-gray-700 hover:border-gray-500'}
            `}
            onClick={() => onSelect && onSelect(index)}
          >
            <img 
              src={img} 
              alt={`Preview ${index + 1}`} 
              className="w-full h-full object-cover"
            />
            
            {/* Overlay pro mobil i desktop */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
               <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFullscreenImage(img);
                }}
                className="p-1.5 bg-black/60 rounded-full text-white hover:bg-blue-600 mr-2"
                title="Zvětšit"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              
              {onRemove && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(index);
                  }}
                  className="p-1.5 bg-red-500/80 rounded-full text-white hover:bg-red-600"
                  title="Odstranit"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Fullscreen Modal (Lightbox) */}
      {fullscreenImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm"
             onClick={() => setFullscreenImage(null)}>
          <button 
            className="absolute top-4 right-4 p-2 text-white hover:text-gray-300"
            onClick={() => setFullscreenImage(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img 
            src={fullscreenImage} 
            alt="Fullscreen preview" 
            className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </>
  );
}
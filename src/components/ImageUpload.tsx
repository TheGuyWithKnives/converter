import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image as ImageIcon, FileWarning } from 'lucide-react';

interface ImageUploadProps {
  onImageUpload: (file: File, imageUrl: string) => void;
  disabled?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImageUpload, disabled }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const imageUrl = URL.createObjectURL(file);
      onImageUpload(file, imageUrl);
    }
  }, [onImageUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxFiles: 1,
    disabled
  });

  return (
    <div
      {...getRootProps()}
      className={`relative w-full h-64 border-2 border-dashed rounded-xl transition-all duration-300 ease-out cursor-pointer overflow-hidden group
        ${isDragActive 
          ? 'border-brand-accent bg-brand-accent/10 shadow-[0_0_30px_rgba(255,0,60,0.2)]' 
          : 'border-brand-light/10 bg-brand-dark/50 hover:border-brand-accent/50 hover:bg-brand-panel'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />
      
      {/* Dekorativní prvky */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-brand-dark/80 pointer-events-none" />
      
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
        
        <p className="text-sm text-brand-muted max-w-xs">
          Drag & drop nebo klikněte pro výběr
          <span className="block text-xs opacity-60 mt-1 font-mono">PNG, JPG, WEBP (Max 20MB)</span>
        </p>
      </div>

      {/* Rohové akcenty */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-brand-accent/30 rounded-tl-lg group-hover:border-brand-accent transition-colors" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-brand-accent/30 rounded-br-lg group-hover:border-brand-accent transition-colors" />
    </div>
  );
};

export default ImageUpload;
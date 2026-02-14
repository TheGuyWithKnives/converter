import React, { useState, useCallback } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { meshyService } from '../services/meshyService';

interface ImageToImageGeneratorProps {
  onModelGenerated: (url: string) => void;
  onError: (error: string) => void;
  onSendToMultiView?: (file: File, url: string) => void;
}

export const ImageToImageGenerator: React.FC<ImageToImageGeneratorProps> = ({
  onModelGenerated,
  onError,
  onSendToMultiView
}) => {
  const [prompt, setPrompt] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxFiles: 1,
    multiple: false
  });

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

  const handleGenerate = async () => {
    // FIX: Povolit generování, pokud je obrázek NEBO prompt
    if (!selectedImage && !prompt) {
      onError("Please upload an image or enter a prompt.");
      return;
    }

    setIsGenerating(true);
    try {
      // Pokud máme obrázek, voláme Image-to-3D
      if (selectedImage) {
        // Pokud chybí prompt, pošleme undefined (Meshy si poradí, nebo použije default)
        const taskId = await meshyService.generateImageTo3D(
          selectedImage, 
          prompt || undefined 
        );
        
        const checkStatus = async () => {
          const task = await meshyService.getTaskStatus(taskId);
          
          if (task.status === 'SUCCEEDED' && task.model_urls?.glb) {
            onModelGenerated(task.model_urls.glb);
            setIsGenerating(false);
          } else if (task.status === 'FAILED') {
            onError(task.error || 'Generation failed');
            setIsGenerating(false);
          } else {
            setTimeout(checkStatus, 2000);
          }
        };
        
        checkStatus();
      } else {
        // Fallback logika, pokud by uživatel zadal jen text (pokud to vaše API podporuje v tomto komponentu)
        onError("Please upload an image for Image-to-3D generation.");
        setIsGenerating(false);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to start generation');
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-50/5'
            : 'border-white/20 hover:border-white/40'
        }`}
      >
        <input {...getInputProps()} />
        
        {imagePreview ? (
          <div className="relative group">
            <img
              src={imagePreview}
              alt="Preview"
              className="max-h-64 mx-auto rounded-lg shadow-lg"
            />
            <button
              onClick={clearImage}
              className="absolute top-2 right-2 p-1 bg-red-500/80 hover:bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
              <Upload className="w-8 h-8 text-white/60" />
            </div>
            <div>
              <p className="text-lg font-medium text-white">
                Drop your image here, or click to browse
              </p>
              <p className="text-sm text-white/40 mt-1">
                Supports JPG, PNG, WEBP (Max 20MB)
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-white/80">
          Optional Prompt
        </label>
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the object to help the AI (optional)..."
            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500 min-h-[80px]"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !selectedImage}
          className={`flex-1 py-4 rounded-xl font-medium text-lg flex items-center justify-center gap-2 transition-all ${
            isGenerating || !selectedImage
              ? 'bg-white/10 text-white/40 cursor-not-allowed'
              : 'bg-gradient-to-r from-brand-accent to-brand-accent/80 hover:from-brand-accent/90 hover:to-brand-accent/70 text-white shadow-lg hover:shadow-brand-accent/25'
          }`}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generuji 3D model...
            </>
          ) : (
            <>
              <ImageIcon className="w-5 h-5" />
              Generovat 3D
            </>
          )}
        </button>

        {onSendToMultiView && selectedImage && imagePreview && !isGenerating && (
          <button
            onClick={() => onSendToMultiView(selectedImage, imagePreview)}
            className="px-5 py-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all border-2 border-brand-accent/30 text-brand-accent hover:bg-brand-accent/10 hover:border-brand-accent/60"
          >
            <Upload className="w-4 h-4" />
            Multi-View
          </button>
        )}
      </div>
    </div>
  );
};

export default ImageToImageGenerator;
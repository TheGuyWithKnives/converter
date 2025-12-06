import { useCallback, useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  onImageUpload: (file: File, imageUrl: string) => void;
  disabled?: boolean;
}

export default function ImageUpload({ onImageUpload, disabled }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return 'Pouze JPG, PNG a WEBP formáty jsou podporovány';
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return 'Soubor je příliš velký. Maximální velikost je 10MB';
    }

    return null;
  };

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        setPreview(imageUrl);
        onImageUpload(file, imageUrl);
      };
      reader.readAsDataURL(file);
    },
    [onImageUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [disabled, handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const clearPreview = useCallback(() => {
    setPreview(null);
    setError(null);
  }, []);

  return (
    <div className="w-full">
      {!preview ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative border-2 border-dashed rounded-lg p-12 text-center transition-all
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'}
          `}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileInput}
            disabled={disabled}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />

          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
              <Upload className="w-8 h-8 text-blue-600" />
            </div>

            <div>
              <p className="text-lg font-semibold text-slate-700 mb-1">
                Přetáhněte obrázek sem
              </p>
              <p className="text-sm text-slate-500">
                nebo klikněte pro výběr souboru
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ImageIcon className="w-4 h-4" />
              <span>JPG, PNG, WEBP • Max 10MB</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative rounded-lg overflow-hidden bg-slate-100">
          <img
            src={preview}
            alt="Náhled"
            className="w-full h-auto max-h-96 object-contain"
          />

          {!disabled && (
            <button
              onClick={clearPreview}
              className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}

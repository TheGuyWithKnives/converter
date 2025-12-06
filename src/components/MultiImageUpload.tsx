import { useCallback, useState } from 'react';
import { Upload, X, Image as ImageIcon, Plus } from 'lucide-react';

interface MultiImageUploadProps {
  onImagesUpload: (files: File[], imageUrls: string[]) => void;
  disabled?: boolean;
}

export default function MultiImageUpload({ onImagesUpload, disabled }: MultiImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);
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

  const handleFiles = useCallback(
    (files: FileList) => {
      const newPreviews: { file: File; url: string }[] = [];
      const errors: string[] = [];

      Array.from(files).forEach((file) => {
        const validationError = validateFile(file);
        if (validationError) {
          errors.push(`${file.name}: ${validationError}`);
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const imageUrl = e.target?.result as string;
          newPreviews.push({ file, url: imageUrl });

          if (newPreviews.length === files.length - errors.length) {
            setPreviews((prev) => {
              const updated = [...prev, ...newPreviews];
              onImagesUpload(
                updated.map((p) => p.file),
                updated.map((p) => p.url)
              );
              return updated;
            });
          }
        };
        reader.readAsDataURL(file);
      });

      if (errors.length > 0) {
        setError(errors.join('\n'));
      } else {
        setError(null);
      }
    },
    [onImagesUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFiles(files);
      }
    },
    [disabled, handleFiles]
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
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles]
  );

  const removePreview = useCallback(
    (index: number) => {
      setPreviews((prev) => {
        const updated = prev.filter((_, i) => i !== index);
        onImagesUpload(
          updated.map((p) => p.file),
          updated.map((p) => p.url)
        );
        return updated;
      });
    },
    [onImagesUpload]
  );

  const clearAll = useCallback(() => {
    setPreviews([]);
    setError(null);
    onImagesUpload([], []);
  }, [onImagesUpload]);

  return (
    <div className="w-full">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'}
        `}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileInput}
          disabled={disabled}
          multiple
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />

        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            {previews.length === 0 ? (
              <Upload className="w-6 h-6 text-blue-600" />
            ) : (
              <Plus className="w-6 h-6 text-blue-600" />
            )}
          </div>

          <div>
            <p className="text-base font-semibold text-slate-700 mb-1">
              {previews.length === 0
                ? 'Přetáhněte obrázky sem nebo klikněte'
                : 'Přidat další obrázky'}
            </p>
            <p className="text-sm text-slate-500">
              Můžete nahrát více fotek z různých úhlů
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ImageIcon className="w-4 h-4" />
            <span>JPG, PNG, WEBP • Max 10MB každý</span>
          </div>
        </div>
      </div>

      {previews.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-600 font-medium">
              Nahráno {previews.length} {previews.length === 1 ? 'obrázek' : 'obrázků'}
            </p>
            {!disabled && (
              <button
                onClick={clearAll}
                className="text-xs text-red-600 hover:text-red-700 font-medium"
              >
                Odstranit vše
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {previews.map((preview, index) => (
              <div key={index} className="relative group rounded-lg overflow-hidden bg-slate-100">
                <img
                  src={preview.url}
                  alt={`Náhled ${index + 1}`}
                  className="w-full h-32 object-cover"
                />
                {!disabled && (
                  <button
                    onClick={() => removePreview(index)}
                    className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 text-center">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 whitespace-pre-line">{error}</p>
        </div>
      )}
    </div>
  );
}

import { Check, X, Edit3 } from 'lucide-react';

interface ProcessedImage {
  original: string;
  processed: string;
  hasChanges: boolean;
}

interface ImagePreviewGalleryProps {
  images: ProcessedImage[];
  onConfirm: () => void;
  onCancel: () => void;
  onEdit: () => void;
  isGenerating?: boolean;
}

export default function ImagePreviewGallery({
  images,
  onConfirm,
  onCancel,
  onEdit,
  isGenerating = false,
}: ImagePreviewGalleryProps) {
  const hasAnyChanges = images.some(img => img.hasChanges);

  return (
    <div className="bg-white rounded-lg shadow-xl p-6 border-2 border-blue-200">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-slate-800 mb-1">
          Náhled upravených fotek
        </h3>
        <p className="text-sm text-slate-600">
          {hasAnyChanges
            ? 'Zkontrolujte úpravy před generováním 3D modelu'
            : 'Žádné úpravy nebyly aplikovány - originální fotky'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 max-h-[500px] overflow-y-auto">
        {images.map((img, index) => (
          <div key={index} className="space-y-3">
            <div className="relative group">
              <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium z-10">
                Fotka {index + 1}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Originál
                  </p>
                  <div className="relative rounded-lg overflow-hidden border-2 border-slate-200">
                    <img
                      src={img.original}
                      alt={`Originál ${index + 1}`}
                      className="w-full h-48 object-cover"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wide flex items-center gap-1">
                    Upraveno
                    {img.hasChanges && (
                      <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    )}
                  </p>
                  <div className="relative rounded-lg overflow-hidden border-2 border-blue-400">
                    <img
                      src={img.processed}
                      alt={`Upraveno ${index + 1}`}
                      className="w-full h-48 object-cover"
                    />
                    {img.hasChanges && (
                      <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                        ✓
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t-2 border-slate-200">
        <button
          onClick={onCancel}
          disabled={isGenerating}
          className="flex-1 px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <X className="w-5 h-5" />
          Zrušit
        </button>

        {hasAnyChanges && (
          <button
            onClick={onEdit}
            disabled={isGenerating}
            className="flex-1 px-4 py-3 bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border-2 border-amber-300"
          >
            <Edit3 className="w-5 h-5" />
            Upravit instrukce
          </button>
        )}

        <button
          onClick={onConfirm}
          disabled={isGenerating}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-lg shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
        >
          <Check className="w-5 h-5" />
          Potvrdit a generovat 3D
        </button>
      </div>

      {hasAnyChanges && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-700">
            💡 <strong>Tip:</strong> Pokud nejste spokojeni s úpravami, klikněte na "Upravit
            instrukce" a zkuste jiné nastavení.
          </p>
        </div>
      )}
    </div>
  );
}

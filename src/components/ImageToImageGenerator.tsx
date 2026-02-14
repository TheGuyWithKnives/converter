import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { meshyService } from '../services/meshyService';
import { modelHistoryService } from '../services/modelHistoryService';
import { Wand2, Loader2, Upload, X, Download } from 'lucide-react';
import toast from 'react-hot-toast';

interface ImageToImageGeneratorProps {
  onImageReady?: (imageUrl: string) => void;
}

export const ImageToImageGenerator = ({ onImageReady }: ImageToImageGeneratorProps) => {
  const [prompt, setPrompt] = useState('');
  const [aiModel, setAiModel] = useState<'nano-banana' | 'nano-banana-pro'>('nano-banana-pro');
  const [multiView, setMultiView] = useState(false);
  const [referenceImages, setReferenceImages] = useState<{ url: string; dataUri: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [resultImages, setResultImages] = useState<string[]>([]);

  const onDrop = useCallback(async (files: File[]) => {
    const newImages = await Promise.all(
      files.slice(0, 5 - referenceImages.length).map(async (file) => {
        const dataUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        return { url: URL.createObjectURL(file), dataUri };
      })
    );
    setReferenceImages(prev => [...prev, ...newImages].slice(0, 5));
  }, [referenceImages.length]);

  const removeImage = (idx: number) => {
    setReferenceImages(prev => {
      URL.revokeObjectURL(prev[idx].url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg'] },
    maxFiles: 5,
    disabled: loading || referenceImages.length >= 5,
  });

  const handleGenerate = async () => {
    if (!prompt.trim() || referenceImages.length === 0) return;
    setLoading(true);
    setResultImages([]);
    setStatus('Odesilam zadani...');
    toast.loading('Transformuji obrazek...', { id: 'img-to-img' });

    try {
      const taskId = await meshyService.createImageToImage({
        ai_model: aiModel,
        prompt,
        reference_image_urls: referenceImages.map(r => r.dataUri),
        generate_multi_view: multiView,
      });

      const historyEntry = await modelHistoryService.createEntry({
        model_name: prompt.substring(0, 100),
        model_type: 'image-to-3d',
        status: 'processing',
        task_id: taskId,
        parameters: {
          prompt,
          ai_model: aiModel,
          multi_view: multiView,
          num_reference_images: referenceImages.length,
        },
        credits_used: 0,
      });

      const interval = setInterval(async () => {
        try {
          const task = await meshyService.getTaskStatus(taskId, 'image-to-image');
          setStatus(`Generuji: ${task.progress || 0}%`);

          if (task.status === 'SUCCEEDED') {
            clearInterval(interval);
            setLoading(false);
            setStatus('');

            const images: string[] = [];
            if (task.output?.image_urls && Array.isArray(task.output.image_urls)) {
              images.push(...task.output.image_urls);
            } else if (task.output?.image_url) {
              images.push(task.output.image_url);
            }

            setResultImages(images);
            toast.success('Obrazek transformovan!', { id: 'img-to-img' });

            if (historyEntry) {
              await modelHistoryService.updateEntry(historyEntry.id, {
                status: 'completed',
                thumbnail_url: images[0],
                metadata: { result_images: images },
              });
            }

            if (images.length > 0 && onImageReady) {
              onImageReady(images[0]);
            }
          } else if (task.status === 'FAILED') {
            clearInterval(interval);
            setLoading(false);
            setStatus('');
            toast.error('Transformace selhala.', { id: 'img-to-img' });

            if (historyEntry) {
              await modelHistoryService.updateEntry(historyEntry.id, {
                status: 'failed',
                error_message: 'Transformation failed',
              });
            }
          }
        } catch (error) {
          clearInterval(interval);
          setLoading(false);
          setStatus('');
          toast.error('Chyba pripojeni.', { id: 'img-to-img' });
        }
      }, 2000);
    } catch (error) {
      setLoading(false);
      setStatus('');
      toast.error('Chyba pri odesilani.', { id: 'img-to-img' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-8 h-8 rounded bg-brand-accent/20 flex items-center justify-center text-brand-accent border border-brand-accent/20">
          <Wand2 className="w-5 h-5" />
        </span>
        <div>
          <h2 className="text-lg font-spartan font-bold text-brand-light">Image to Image</h2>
          <p className="text-brand-muted text-xs">Transformace a editace obrazku pomoci AI</p>
        </div>
      </div>

      <div
        {...getRootProps()}
        className={`relative w-full h-28 border-2 border-dashed rounded-xl transition-all cursor-pointer flex items-center justify-center ${
          isDragActive
            ? 'border-brand-accent bg-brand-accent/10'
            : 'border-brand-light/10 bg-brand-dark/50 hover:border-brand-accent/50'
        } ${referenceImages.length >= 5 ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="text-center">
          <Upload className="w-6 h-6 text-brand-muted mx-auto mb-1" />
          <p className="text-xs text-brand-muted">
            {referenceImages.length >= 5 ? 'Max 5 obrazku' : 'Nahrajte referencni obrazky (1-5)'}
          </p>
        </div>
      </div>

      {referenceImages.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {referenceImages.map((img, idx) => (
            <div key={idx} className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-brand-light/10">
              <img src={img.url} alt={`Ref ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => removeImage(idx)}
                className="absolute top-0.5 right-0.5 p-0.5 bg-brand-dark/80 rounded-full text-brand-muted hover:text-brand-accent"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <textarea
        className="w-full p-3 rounded-xl bg-brand-dark border border-brand-light/10 text-brand-light text-sm placeholder-brand-muted-soft focus:border-brand-accent/50 focus:outline-none resize-none"
        placeholder="Popis transformace, napr: Make it more futuristic with metallic surfaces..."
        rows={2}
        maxLength={600}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <div className="flex items-center gap-4">
        <select
          value={aiModel}
          onChange={(e) => setAiModel(e.target.value as typeof aiModel)}
          className="flex-1 p-2 rounded-lg bg-brand-dark border border-brand-light/10 text-brand-light text-xs focus:border-brand-accent/50 focus:outline-none"
        >
          <option value="nano-banana">Nano Banana</option>
          <option value="nano-banana-pro">Nano Banana Pro</option>
        </select>
        <label className="flex items-center gap-2 text-xs text-brand-muted cursor-pointer">
          <input
            type="checkbox"
            checked={multiView}
            onChange={(e) => setMultiView(e.target.checked)}
            className="w-3.5 h-3.5 rounded accent-brand-accent"
          />
          Multi-View
        </label>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading || !prompt.trim() || referenceImages.length === 0}
        className="w-full py-3 bg-brand-accent hover:opacity-90 text-brand-light rounded-xl disabled:opacity-40 disabled:cursor-not-allowed font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-glow"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {status || 'Transformuji...'}
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4" />
            Transformovat
          </>
        )}
      </button>

      {resultImages.length > 0 && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-muted uppercase tracking-wider">Vysledky</span>
            <button onClick={() => setResultImages([])} className="text-brand-muted hover:text-brand-light">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className={`grid gap-3 ${resultImages.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {resultImages.map((url, idx) => (
              <div key={idx} className="relative group rounded-xl overflow-hidden border border-brand-light/10">
                <img src={url} alt={`Result ${idx + 1}`} className="w-full aspect-square object-cover" />
                <div className="absolute inset-0 bg-brand-dark/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <a href={url} download={`transformed-${idx + 1}.png`} className="p-2 bg-brand-accent rounded-lg text-white shadow-glow">
                    <Download className="w-4 h-4" />
                  </a>
                  {onImageReady && (
                    <button onClick={() => onImageReady(url)} className="px-3 py-2 bg-brand-panel border border-brand-light/20 rounded-lg text-xs font-bold text-brand-light">
                      Pouzit pro 3D
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

import { useState } from 'react';
import { meshyService, TextToImageOptions } from '../services/meshyService';
import { ImageIcon, Loader2, Sparkles, Download, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface TextToImageGeneratorProps {
  onImageReady?: (imageUrl: string) => void;
}

const ASPECT_RATIOS: Array<{ value: TextToImageOptions['aspect_ratio']; label: string }> = [
  { value: '1:1', label: '1:1' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
];

export const TextToImageGenerator = ({ onImageReady }: TextToImageGeneratorProps) => {
  const [prompt, setPrompt] = useState('');
  const [aiModel, setAiModel] = useState<'nano-banana' | 'nano-banana-pro'>('nano-banana-pro');
  const [aspectRatio, setAspectRatio] = useState<TextToImageOptions['aspect_ratio']>('1:1');
  const [multiView, setMultiView] = useState(false);
  const [poseMode, setPoseMode] = useState<'' | 'a-pose' | 't-pose'>('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [resultImages, setResultImages] = useState<string[]>([]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResultImages([]);
    setStatus('Odesilam zadani...');
    toast.loading('Generuji obrazek...', { id: 'text-to-image' });

    try {
      const options: TextToImageOptions = {
        ai_model: aiModel,
        prompt,
        generate_multi_view: multiView,
        ...(aspectRatio && !multiView && { aspect_ratio: aspectRatio }),
        ...(poseMode && { pose_mode: poseMode as 'a-pose' | 't-pose' }),
      };

      const taskId = await meshyService.createTextToImage(options);

      const interval = setInterval(async () => {
        try {
          const task = await meshyService.getTaskStatus(taskId, 'text-to-image');
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
            toast.success('Obrazek vygenerovan!', { id: 'text-to-image' });

            if (images.length > 0 && onImageReady) {
              onImageReady(images[0]);
            }
          } else if (task.status === 'FAILED') {
            clearInterval(interval);
            setLoading(false);
            setStatus('');
            toast.error('Generovani selhalo.', { id: 'text-to-image' });
          }
        } catch {
          clearInterval(interval);
          setLoading(false);
          setStatus('');
          toast.error('Chyba pripojeni.', { id: 'text-to-image' });
        }
      }, 2000);
    } catch {
      setLoading(false);
      setStatus('');
      toast.error('Chyba pri odesilani.', { id: 'text-to-image' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-8 h-8 rounded bg-brand-accent/20 flex items-center justify-center text-brand-accent border border-brand-accent/20">
          <ImageIcon className="w-5 h-5" />
        </span>
        <div>
          <h2 className="text-lg font-spartan font-bold text-brand-light">Text to Image</h2>
          <p className="text-brand-muted text-xs">AI generovani obrazku z textoveho popisu</p>
        </div>
      </div>

      <textarea
        className="w-full p-3 rounded-xl bg-brand-dark border border-brand-light/10 text-brand-light text-sm placeholder-brand-muted-soft focus:border-brand-accent/50 focus:outline-none resize-none"
        placeholder="Popis obrazku, napr: A futuristic helmet with neon blue lights, studio lighting..."
        rows={3}
        maxLength={600}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-brand-muted uppercase mb-2 tracking-wider">AI Model</label>
          <select
            value={aiModel}
            onChange={(e) => setAiModel(e.target.value as typeof aiModel)}
            className="w-full p-2.5 rounded-lg bg-brand-dark border border-brand-light/10 text-brand-light text-xs focus:border-brand-accent/50 focus:outline-none"
          >
            <option value="nano-banana">Nano Banana</option>
            <option value="nano-banana-pro">Nano Banana Pro</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-brand-muted uppercase mb-2 tracking-wider">Pomer stran</label>
          <div className="flex gap-1">
            {ASPECT_RATIOS.map((ar) => (
              <button
                key={ar.value}
                onClick={() => setAspectRatio(ar.value)}
                disabled={multiView}
                className={`flex-1 py-2 rounded-lg text-[11px] font-bold border transition-all ${
                  aspectRatio === ar.value && !multiView
                    ? 'border-brand-accent bg-brand-accent/10 text-brand-accent'
                    : 'border-brand-light/10 text-brand-muted hover:border-brand-light/30'
                } disabled:opacity-40`}
              >
                {ar.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-xs text-brand-muted cursor-pointer">
          <input
            type="checkbox"
            checked={multiView}
            onChange={(e) => setMultiView(e.target.checked)}
            className="w-3.5 h-3.5 rounded accent-brand-accent"
          />
          Multi-View
        </label>
        <select
          value={poseMode}
          onChange={(e) => setPoseMode(e.target.value as typeof poseMode)}
          className="p-1.5 rounded-lg bg-brand-dark border border-brand-light/10 text-brand-light text-xs focus:border-brand-accent/50 focus:outline-none"
        >
          <option value="">Bez pozy</option>
          <option value="a-pose">A-Pose</option>
          <option value="t-pose">T-Pose</option>
        </select>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading || !prompt.trim()}
        className="w-full py-3 bg-brand-accent hover:opacity-90 text-brand-light rounded-xl disabled:opacity-40 disabled:cursor-not-allowed font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-glow"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {status || 'Generuji...'}
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Generovat Obrazek
          </>
        )}
      </button>

      {resultImages.length > 0 && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-muted uppercase tracking-wider">Vysledky</span>
            <button
              onClick={() => setResultImages([])}
              className="text-brand-muted hover:text-brand-light transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className={`grid gap-3 ${resultImages.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {resultImages.map((url, idx) => (
              <div key={idx} className="relative group rounded-xl overflow-hidden border border-brand-light/10">
                <img src={url} alt={`Generated ${idx + 1}`} className="w-full aspect-square object-cover" />
                <div className="absolute inset-0 bg-brand-dark/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <a
                    href={url}
                    download={`generated-${idx + 1}.png`}
                    className="p-2 bg-brand-accent rounded-lg text-white shadow-glow"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  {onImageReady && (
                    <button
                      onClick={() => onImageReady(url)}
                      className="px-3 py-2 bg-brand-panel border border-brand-light/20 rounded-lg text-xs font-bold text-brand-light"
                    >
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

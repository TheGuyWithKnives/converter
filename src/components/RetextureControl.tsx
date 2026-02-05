import { useState } from 'react';
import { meshyService } from '../services/meshyService';
import { Paintbrush, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface RetextureControlProps {
  modelUrl: string;
  onRetextured: (url: string) => void;
}

export const RetextureControl = ({ modelUrl, onRetextured }: RetextureControlProps) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [enablePBR, setEnablePBR] = useState(true);
  const [keepOriginalUV, setKeepOriginalUV] = useState(false);

  const handleRetexture = async () => {
    if (!prompt.trim()) {
      toast.error('Zadejte popis textury.');
      return;
    }

    setLoading(true);
    toast.loading('Generuji novou texturu...', { id: 'retexture' });

    try {
      const taskId = await meshyService.createRetexture({
        model_url: modelUrl,
        text_style_prompt: prompt,
        enable_pbr: enablePBR,
        enable_original_uv: keepOriginalUV,
      });

      const interval = setInterval(async () => {
        try {
          const task = await meshyService.getTaskStatus(taskId, 'retexture');

          if (task.status === 'SUCCEEDED' && task.model_urls) {
            clearInterval(interval);
            setLoading(false);
            setDone(true);
            toast.success('Nová textura aplikována!', { id: 'retexture' });
            onRetextured(task.model_urls.glb);
          } else if (task.status === 'FAILED') {
            clearInterval(interval);
            setLoading(false);
            toast.error('Texturování selhalo.', { id: 'retexture' });
          }
        } catch {
          clearInterval(interval);
          setLoading(false);
          toast.error('Chyba připojení.', { id: 'retexture' });
        }
      }, 2500);
    } catch {
      setLoading(false);
      toast.error('Chyba serveru.', { id: 'retexture' });
    }
  };

  if (done) {
    return (
      <div className="space-y-2">
        <div className="w-full py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm font-bold flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4" /> Textura aplikována
        </div>
        <button
          onClick={() => { setDone(false); setPrompt(''); }}
          className="w-full py-2 text-xs text-gray-400 hover:text-white transition-colors"
        >
          Aplikovat další texturu
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Popište texturu, např: Worn leather with gold trim..."
        maxLength={600}
        className="w-full p-2 rounded-lg bg-brand-dark border border-white/10 text-white text-xs placeholder-gray-600 focus:border-brand-accent/50 focus:outline-none"
      />

      <div className="flex gap-3">
        <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={enablePBR}
            onChange={(e) => setEnablePBR(e.target.checked)}
            className="w-3 h-3 rounded"
          />
          PBR
        </label>
        <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={keepOriginalUV}
            onChange={(e) => setKeepOriginalUV(e.target.checked)}
            className="w-3 h-3 rounded"
          />
          Zachovat UV
        </label>
      </div>

      <button
        onClick={handleRetexture}
        disabled={loading || !prompt.trim()}
        className="w-full py-2.5 bg-brand-dark hover:bg-brand-panel text-brand-light border border-orange-500/50 hover:border-orange-500 rounded-xl transition-all flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wide"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
        ) : (
          <Paintbrush className="w-4 h-4 text-orange-400" />
        )}
        {loading ? 'Texturuji...' : 'AI Retexture'}
      </button>
    </div>
  );
};

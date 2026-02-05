import { useState } from 'react';
import { meshyService } from '../services/meshyService';
import { Loader2, Sparkles, ChevronDown, ChevronUp, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface TextTo3DGeneratorProps {
  onModelReady: (url: string) => void;
}

const ART_STYLES = [
  { value: 'realistic', label: 'Realistický' },
  { value: 'cartoon', label: 'Cartoon' },
  { value: 'low-poly', label: 'Low-Poly' },
  { value: 'sculpture', label: 'Skulptura' },
  { value: 'pbr', label: 'PBR' },
] as const;

const AI_MODELS = [
  { value: 'meshy-4', label: 'Meshy-4 (Rychlý)' },
  { value: 'meshy-5', label: 'Meshy-5 (Kvalitní)' },
  { value: 'meshy-6', label: 'Meshy-6 (Nejnovější)' },
] as const;

export const TextTo3DGenerator = ({ onModelReady }: TextTo3DGeneratorProps) => {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [artStyle, setArtStyle] = useState<string>('realistic');
  const [aiModel, setAiModel] = useState<string>('meshy-5');
  const [enablePBR, setEnablePBR] = useState(true);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [previewTaskId, setPreviewTaskId] = useState<string | null>(null);
  const [previewReady, setPreviewReady] = useState(false);
  const [refining, setRefining] = useState(false);
  const [texturePrompt, setTexturePrompt] = useState('');

  const pollTask = (taskId: string, type: 'text-to-3d', onSuccess: (task: any) => void) => {
    const interval = setInterval(async () => {
      try {
        const task = await meshyService.getTaskStatus(taskId, type);
        setStatus(`Generuji: ${task.progress || 0}%`);

        if (task.status === 'SUCCEEDED') {
          clearInterval(interval);
          onSuccess(task);
        } else if (task.status === 'FAILED') {
          clearInterval(interval);
          setLoading(false);
          setRefining(false);
          setStatus('');
          toast.error('Generování selhalo.');
        }
      } catch {
        clearInterval(interval);
        setLoading(false);
        setRefining(false);
        setStatus('');
        toast.error('Chyba připojení.');
      }
    }, 2000);
  };

  const handlePreview = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setPreviewReady(false);
    setPreviewTaskId(null);
    setStatus('Odesílám zadání...');
    toast.loading('Generuji Preview model...', { id: 'text3d' });

    try {
      const taskId = await meshyService.createTextTo3D(prompt, {
        mode: 'preview',
        art_style: artStyle as any,
        ai_model: aiModel,
        enable_pbr: enablePBR,
        ...(negativePrompt && { negative_prompt: negativePrompt }),
      });

      pollTask(taskId, 'text-to-3d', (task) => {
        setLoading(false);
        setPreviewTaskId(taskId);
        setPreviewReady(true);
        setStatus('');
        toast.success('Preview hotový! Můžete ho upřesnit nebo použít.', { id: 'text3d' });
        if (task.model_urls?.glb) {
          onModelReady(task.model_urls.glb);
        }
      });
    } catch {
      setLoading(false);
      setStatus('');
      toast.error('Chyba při odesílání.', { id: 'text3d' });
    }
  };

  const handleRefine = async () => {
    if (!previewTaskId) return;
    setRefining(true);
    setStatus('Upřesňuji textury...');
    toast.loading('Refine: Přidávám textury a detaily...', { id: 'text3d-refine' });

    try {
      const taskId = await meshyService.refineTextTo3D(
        previewTaskId,
        texturePrompt || undefined
      );

      pollTask(taskId, 'text-to-3d', (task) => {
        setRefining(false);
        setStatus('');
        toast.success('Refine dokončen! Model s texturami připraven.', { id: 'text3d-refine' });
        if (task.model_urls?.glb) {
          onModelReady(task.model_urls.glb);
        }
      });
    } catch {
      setRefining(false);
      setStatus('');
      toast.error('Chyba při Refine.', { id: 'text3d-refine' });
    }
  };

  return (
    <div className="space-y-3">
      <textarea
        className="w-full p-3 rounded-xl bg-brand-dark border border-white/10 text-white text-sm placeholder-gray-500 focus:border-brand-accent/50 focus:outline-none resize-none transition-colors"
        placeholder="Popište 3D objekt, např: A futuristic cyberpunk helmet with neon lights..."
        rows={3}
        maxLength={600}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <div className="flex gap-2">
        <select
          value={artStyle}
          onChange={(e) => setArtStyle(e.target.value)}
          className="flex-1 p-2 rounded-lg bg-brand-dark border border-white/10 text-white text-xs focus:border-brand-accent/50 focus:outline-none"
        >
          {ART_STYLES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={aiModel}
          onChange={(e) => setAiModel(e.target.value)}
          className="flex-1 p-2 rounded-lg bg-brand-dark border border-white/10 text-white text-xs focus:border-brand-accent/50 focus:outline-none"
        >
          {AI_MODELS.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
      >
        {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        Pokročilé nastavení
      </button>

      {showAdvanced && (
        <div className="space-y-2 p-3 bg-brand-dark/50 rounded-lg border border-white/5">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Negativní prompt</label>
            <input
              type="text"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="Co nechcete v modelu, např: blurry, low quality..."
              className="w-full p-2 rounded-lg bg-brand-dark border border-white/10 text-white text-xs placeholder-gray-600 focus:border-brand-accent/50 focus:outline-none"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={enablePBR}
              onChange={(e) => setEnablePBR(e.target.checked)}
              className="w-3.5 h-3.5 rounded"
            />
            PBR materiály (metallic, roughness, normal)
          </label>
        </div>
      )}

      <button
        onClick={handlePreview}
        disabled={loading || refining || !prompt.trim()}
        className="w-full py-3 bg-gradient-to-r from-brand-accent to-rose-600 hover:from-brand-accent/90 hover:to-rose-500 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-accent/20"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {status || 'Generuji...'}
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Generovat Preview
          </>
        )}
      </button>

      {previewReady && previewTaskId && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2">
          <p className="text-emerald-400 text-xs font-bold">Preview hotový -- Nyní můžete upřesnit textury:</p>
          <input
            type="text"
            value={texturePrompt}
            onChange={(e) => setTexturePrompt(e.target.value)}
            placeholder="Volitelně: Popište texturu, např: Metallic chrome with scratches..."
            className="w-full p-2 rounded-lg bg-brand-dark border border-white/10 text-white text-xs placeholder-gray-600 focus:border-emerald-500/50 focus:outline-none"
          />
          <button
            onClick={handleRefine}
            disabled={refining}
            className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl disabled:opacity-40 font-bold text-sm flex items-center justify-center gap-2 transition-all"
          >
            {refining ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {status || 'Upřesňuji...'}
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Refine (Přidat textury)
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

import { useState } from 'react';
import { meshyService } from '../services/meshyService';
import { modelHistoryService } from '../services/modelHistoryService';
import { Loader2, Sparkles, ChevronDown, ChevronUp, Wand2, Triangle, Square } from 'lucide-react';
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
  { value: 'meshy-4', label: 'Meshy-4', desc: 'Rychlý' },
  { value: 'meshy-5', label: 'Meshy-5', desc: 'Kvalitní' },
  { value: 'meshy-6', label: 'Meshy-6', desc: 'Nejnovější' },
] as const;

const MODEL_TYPES = [
  { value: 'standard', label: 'Standard', desc: 'Plné detaily' },
  { value: 'lowpoly', label: 'Low-Poly', desc: 'Čistá topologie' },
] as const;

const SYMMETRY_MODES = [
  { value: 'off', label: 'Vypnuto' },
  { value: 'auto', label: 'Auto' },
  { value: 'on', label: 'Zapnuto' },
] as const;

const POSE_MODES = [
  { value: '', label: 'Žádná' },
  { value: 'a-pose', label: 'A-Pose' },
  { value: 't-pose', label: 'T-Pose' },
] as const;

const TOPOLOGY_MODES = [
  { value: 'triangle', label: 'Trojúhelníky', icon: 'triangle' },
  { value: 'quad', label: 'Čtverce', icon: 'quad' },
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
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);

  const [modelType, setModelType] = useState<'standard' | 'lowpoly'>('standard');
  const [topology, setTopology] = useState<'triangle' | 'quad'>('triangle');
  const [symmetryMode, setSymmetryMode] = useState<'off' | 'auto' | 'on'>('auto');
  const [poseMode, setPoseMode] = useState<'' | 'a-pose' | 't-pose'>('');
  const [targetPolycount, setTargetPolycount] = useState<number>(30000);

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
        ...(aiModel !== 'meshy-4' && { enable_pbr: enablePBR }),
        topology,
        target_polycount: targetPolycount,
        symmetry_mode: symmetryMode,
        ...(poseMode && { pose_mode: poseMode }),
        ...(negativePrompt && { negative_prompt: negativePrompt }),
      });

      const historyEntry = await modelHistoryService.createEntry({
        model_name: prompt.substring(0, 100),
        model_type: 'text-to-3d',
        status: 'processing',
        task_id: taskId,
        parameters: {
          prompt,
          negative_prompt: negativePrompt,
          art_style: artStyle,
          ai_model: aiModel,
          enable_pbr: enablePBR,
          model_type: modelType,
          topology,
          symmetry_mode: symmetryMode,
          pose_mode: poseMode,
          mode: 'preview',
        },
        credits_used: 0,
      });

      if (historyEntry) {
        setCurrentHistoryId(historyEntry.id);
      }

      pollTask(taskId, 'text-to-3d', async (task) => {
        setLoading(false);
        setPreviewTaskId(taskId);
        setPreviewReady(true);
        setStatus('');
        toast.success('Preview hotový! Můžete ho upřesnit nebo použít.', { id: 'text3d' });

        if (historyEntry) {
          await modelHistoryService.updateEntry(historyEntry.id, {
            status: 'completed',
            model_url: task.model_urls?.glb,
            thumbnail_url: task.thumbnail_url,
          });
        }

        if (task.model_urls?.glb) {
          onModelReady(task.model_urls.glb);
        }
      });
    } catch (error) {
      setLoading(false);
      setStatus('');
      toast.error('Chyba při odesílání.', { id: 'text3d' });

      if (currentHistoryId) {
        await modelHistoryService.updateEntry(currentHistoryId, {
          status: 'failed',
          error_message: 'Failed to generate preview',
        });
      }
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

      const refineHistoryEntry = await modelHistoryService.createEntry({
        model_name: `${prompt.substring(0, 80)} (Refined)`,
        model_type: 'text-to-3d',
        status: 'processing',
        task_id: taskId,
        parameters: {
          prompt,
          texture_prompt: texturePrompt,
          preview_task_id: previewTaskId,
          mode: 'refine',
        },
        credits_used: 0,
      });

      pollTask(taskId, 'text-to-3d', async (task) => {
        setRefining(false);
        setStatus('');
        toast.success('Refine dokončen! Model s texturami připraven.', { id: 'text3d-refine' });

        if (refineHistoryEntry) {
          await modelHistoryService.updateEntry(refineHistoryEntry.id, {
            status: 'completed',
            model_url: task.model_urls?.glb,
            thumbnail_url: task.thumbnail_url,
          });
        }

        if (task.model_urls?.glb) {
          onModelReady(task.model_urls.glb);
        }
      });
    } catch (error) {
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
      <div className="flex justify-end">
        <span className="text-[10px] text-brand-muted">{prompt.length}/600</span>
      </div>

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
        <div className="flex-1 flex gap-1">
          {AI_MODELS.map(m => (
            <button
              key={m.value}
              onClick={() => setAiModel(m.value)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${
                aiModel === m.value
                  ? 'bg-brand-accent/15 border-brand-accent text-brand-accent'
                  : 'border-white/10 text-brand-muted hover:text-brand-light hover:border-white/20 bg-brand-dark'
              }`}
              title={m.desc}
            >
              {m.label.replace('meshy-', 'M')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-brand-muted uppercase tracking-wider block mb-1.5">Typ modelu</label>
          <div className="flex gap-1">
            {MODEL_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => setModelType(t.value as any)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${
                  modelType === t.value
                    ? 'bg-brand-accent/15 border-brand-accent text-brand-accent'
                    : 'border-white/10 text-brand-muted hover:text-brand-light hover:border-white/20 bg-brand-dark'
                }`}
                title={t.desc}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] text-brand-muted uppercase tracking-wider block mb-1.5">Topologie</label>
          <div className="flex gap-1">
            {TOPOLOGY_MODES.map(t => (
              <button
                key={t.value}
                onClick={() => setTopology(t.value as any)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1 ${
                  topology === t.value
                    ? 'bg-brand-accent/15 border-brand-accent text-brand-accent'
                    : 'border-white/10 text-brand-muted hover:text-brand-light hover:border-white/20 bg-brand-dark'
                }`}
              >
                {t.value === 'triangle' ? <Triangle className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
      >
        {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        Pokročilé nastavení
      </button>

      {showAdvanced && (
        <div className="space-y-3 p-3 bg-brand-dark/50 rounded-lg border border-white/5">
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-brand-muted uppercase tracking-wider block mb-1.5">Symetrie</label>
              <select
                value={symmetryMode}
                onChange={(e) => setSymmetryMode(e.target.value as any)}
                className="w-full p-2 rounded-lg bg-brand-dark border border-white/10 text-white text-xs focus:border-brand-accent/50 focus:outline-none"
              >
                {SYMMETRY_MODES.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-brand-muted uppercase tracking-wider block mb-1.5">Póza</label>
              <select
                value={poseMode}
                onChange={(e) => setPoseMode(e.target.value as any)}
                className="w-full p-2 rounded-lg bg-brand-dark border border-white/10 text-white text-xs focus:border-brand-accent/50 focus:outline-none"
              >
                {POSE_MODES.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-brand-muted uppercase tracking-wider block mb-1.5">
              Počet polygonů: <span className="text-brand-accent">{targetPolycount.toLocaleString()}</span>
            </label>
            <input
              type="range"
              min={1000}
              max={300000}
              step={1000}
              value={targetPolycount}
              onChange={(e) => setTargetPolycount(Number(e.target.value))}
              className="w-full accent-brand-accent"
            />
            <div className="flex justify-between text-[10px] text-brand-muted mt-0.5">
              <span>1K</span>
              <span>300K</span>
            </div>
          </div>

          {aiModel !== 'meshy-4' && (
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={enablePBR}
                onChange={(e) => setEnablePBR(e.target.checked)}
                className="w-3.5 h-3.5 rounded"
              />
              PBR materiály (metallic, roughness, normal)
            </label>
          )}
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

import { useState, useEffect } from 'react';
import { meshyService } from '../services/meshyService';
import { Play, Loader2, CheckCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface AnimationControlProps {
  rigTaskId: string;
  onAnimated: (url: string) => void;
}

interface AnimAction {
  action_id: string;
  name: string;
  category: string;
}

const FALLBACK_ANIMATIONS: AnimAction[] = [
  { action_id: 'walk', name: 'Walk', category: 'locomotion' },
  { action_id: 'run', name: 'Run', category: 'locomotion' },
  { action_id: 'idle', name: 'Idle', category: 'idle' },
  { action_id: 'jump', name: 'Jump', category: 'action' },
  { action_id: 'wave', name: 'Wave', category: 'gesture' },
  { action_id: 'dance', name: 'Dance', category: 'action' },
];

export const AnimationControl = ({ rigTaskId, onAnimated }: AnimationControlProps) => {
  const [animations, setAnimations] = useState<AnimAction[]>(FALLBACK_ANIMATIONS);
  const [selectedAction, setSelectedAction] = useState('');
  const [targetFps, setTargetFps] = useState<24 | 25 | 30 | 60>(30);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = async () => {
    setLoadingLibrary(true);
    try {
      const lib = await meshyService.listAnimationLibrary();
      if (Array.isArray(lib) && lib.length > 0) {
        setAnimations(lib);
      }
    } catch {
      // fallback already set
    }
    setLoadingLibrary(false);
  };

  const handleAnimate = async () => {
    if (!selectedAction) {
      toast.error('Vyberte animaci.');
      return;
    }

    setLoading(true);
    toast.loading('Aplikuji animaci...', { id: 'animate' });

    try {
      const taskId = await meshyService.createAnimation({
        rig_task_id: rigTaskId,
        action_id: selectedAction,
        post_process: { target_fps: targetFps },
      });

      const interval = setInterval(async () => {
        try {
          const task = await meshyService.getTaskStatus(taskId, 'animation');

          if (task.status === 'SUCCEEDED' && task.model_urls) {
            clearInterval(interval);
            setLoading(false);
            setDone(true);
            toast.success('Animace aplikována!', { id: 'animate' });
            onAnimated(task.model_urls.glb);
          } else if (task.status === 'FAILED') {
            clearInterval(interval);
            setLoading(false);
            toast.error('Animace selhala.', { id: 'animate' });
          }
        } catch {
          clearInterval(interval);
          setLoading(false);
          toast.error('Chyba připojení.', { id: 'animate' });
        }
      }, 2500);
    } catch {
      setLoading(false);
      toast.error('Chyba serveru.', { id: 'animate' });
    }
  };

  if (done) {
    return (
      <div className="space-y-2">
        <div className="w-full py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm font-bold flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4" /> Animace aplikována
        </div>
        <button
          onClick={() => { setDone(false); setSelectedAction(''); }}
          className="w-full py-2 text-xs text-gray-400 hover:text-white transition-colors"
        >
          Aplikovat další animaci
        </button>
      </div>
    );
  }

  const categories = [...new Set(animations.map(a => a.category))];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">Knihovna animací</span>
        <button
          onClick={loadLibrary}
          disabled={loadingLibrary}
          className="text-xs text-gray-500 hover:text-white transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${loadingLibrary ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <select
        value={selectedAction}
        onChange={(e) => setSelectedAction(e.target.value)}
        className="w-full p-2 rounded-lg bg-brand-dark border border-white/10 text-white text-xs focus:border-brand-accent/50 focus:outline-none"
      >
        <option value="">-- Vyberte animaci --</option>
        {categories.map(cat => (
          <optgroup key={cat} label={cat.charAt(0).toUpperCase() + cat.slice(1)}>
            {animations.filter(a => a.category === cat).map(a => (
              <option key={a.action_id} value={a.action_id}>{a.name}</option>
            ))}
          </optgroup>
        ))}
      </select>

      <select
        value={targetFps}
        onChange={(e) => setTargetFps(parseInt(e.target.value) as 24 | 25 | 30 | 60)}
        className="w-full p-2 rounded-lg bg-brand-dark border border-white/10 text-white text-xs focus:border-brand-accent/50 focus:outline-none"
      >
        <option value={24}>24 FPS</option>
        <option value={25}>25 FPS</option>
        <option value={30}>30 FPS</option>
        <option value={60}>60 FPS</option>
      </select>

      <button
        onClick={handleAnimate}
        disabled={loading || !selectedAction}
        className="w-full py-2.5 bg-brand-dark hover:bg-brand-panel text-brand-light border border-amber-500/50 hover:border-amber-500 rounded-xl transition-all flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wide disabled:opacity-40"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
        ) : (
          <Play className="w-4 h-4 text-amber-400" />
        )}
        {loading ? 'Animuji...' : 'Aplikovat animaci'}
      </button>
    </div>
  );
};

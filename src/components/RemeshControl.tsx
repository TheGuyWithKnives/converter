import { useState } from 'react';
import { meshyService } from '../services/meshyService';
import { Grid3x3, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface RemeshControlProps {
  modelUrl: string;
  onRemeshed: (url: string) => void;
}

export const RemeshControl = ({ modelUrl, onRemeshed }: RemeshControlProps) => {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [topology, setTopology] = useState<'quad' | 'triangle'>('quad');
  const [targetPolycount, setTargetPolycount] = useState(10000);

  const handleRemesh = async () => {
    setLoading(true);
    toast.loading('Remeshuji model...', { id: 'remesh' });

    try {
      const taskId = await meshyService.createRemesh({
        model_url: modelUrl,
        topology,
        target_polycount: targetPolycount,
        target_formats: ['glb'],
      });

      const interval = setInterval(async () => {
        try {
          const task = await meshyService.getTaskStatus(taskId, 'remesh');

          if (task.status === 'SUCCEEDED' && task.model_urls) {
            clearInterval(interval);
            setLoading(false);
            setDone(true);
            toast.success('Remesh dokončen!', { id: 'remesh' });
            onRemeshed(task.model_urls.glb);
          } else if (task.status === 'FAILED') {
            clearInterval(interval);
            setLoading(false);
            toast.error('Remesh selhal.', { id: 'remesh' });
          }
        } catch {
          clearInterval(interval);
          setLoading(false);
          toast.error('Chyba připojení.', { id: 'remesh' });
        }
      }, 2500);
    } catch {
      setLoading(false);
      toast.error('Chyba serveru.', { id: 'remesh' });
    }
  };

  if (done) {
    return (
      <div className="space-y-2">
        <div className="w-full py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm font-bold flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4" /> Remesh dokončen
        </div>
        <button
          onClick={() => setDone(false)}
          className="w-full py-2 text-xs text-gray-400 hover:text-white transition-colors"
        >
          Remeshovat znovu
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <select
          value={topology}
          onChange={(e) => setTopology(e.target.value as 'quad' | 'triangle')}
          className="flex-1 p-2 rounded-lg bg-brand-dark border border-white/10 text-white text-xs focus:border-brand-accent/50 focus:outline-none"
        >
          <option value="quad">Quad</option>
          <option value="triangle">Triangle</option>
        </select>
        <div className="flex-1">
          <input
            type="number"
            value={targetPolycount}
            onChange={(e) => setTargetPolycount(Math.max(100, parseInt(e.target.value) || 10000))}
            min={100}
            max={200000}
            className="w-full p-2 rounded-lg bg-brand-dark border border-white/10 text-white text-xs focus:border-brand-accent/50 focus:outline-none"
          />
          <span className="text-[10px] text-gray-500 mt-0.5 block">Polygon count</span>
        </div>
      </div>

      <button
        onClick={handleRemesh}
        disabled={loading}
        className="w-full py-2.5 bg-brand-dark hover:bg-brand-panel text-brand-light border border-cyan-500/50 hover:border-cyan-500 rounded-xl transition-all flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wide"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
        ) : (
          <Grid3x3 className="w-4 h-4 text-cyan-400" />
        )}
        {loading ? 'Remeshuji...' : 'Remesh'}
      </button>
    </div>
  );
};

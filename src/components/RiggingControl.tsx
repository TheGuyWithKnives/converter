import React, { useState } from 'react';
import { meshyService } from '../services/meshyService';
import { Bone, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export const RiggingControl = ({ modelUrl, onRigged }: { modelUrl: string, onRigged: (url: string) => void }) => {
  const [loading, setLoading] = useState(false);
  const [isRigged, setIsRigged] = useState(false);

  const handleRig = async () => {
    setLoading(true);
    toast.loading('Analyzuji geometrii pro kostru...', { id: 'rigging' });
    
    try {
      const taskId = await meshyService.createRigging(modelUrl);
      
      const interval = setInterval(async () => {
        try {
          const task = await meshyService.getTaskStatus(taskId, 'rigging');
          
          if (task.status === 'SUCCEEDED' && task.model_urls) {
            clearInterval(interval);
            setLoading(false);
            setIsRigged(true);
            toast.success('Kostra úspěšně přidána!', { id: 'rigging' });
            onRigged(task.model_urls.glb);
          } else if (task.status === 'FAILED') {
            clearInterval(interval);
            setLoading(false);
            toast.error('Nelze vytvořit kostru.', { id: 'rigging' });
          }
        } catch (err) { }
      }, 2500);
    } catch (e) {
      console.error(e);
      setLoading(false);
      toast.error('Chyba serveru.', { id: 'rigging' });
    }
  };

  if (isRigged) {
    return (
      <div className="w-full py-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm font-bold flex items-center justify-center gap-2">
        <CheckCircle className="w-4 h-4" /> Model má kostru
      </div>
    );
  }

  return (
    <button 
      onClick={handleRig}
      disabled={loading}
      className="w-full py-3 bg-brand-dark hover:bg-brand-panel text-brand-light border border-brand-accent/50 hover:border-brand-accent rounded-xl transition-all shadow-[0_0_15px_rgba(255,0,60,0.1)] flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wide group"
    >
      {loading ? (
         <Loader2 className="w-4 h-4 animate-spin text-brand-accent" />
      ) : (
         <Bone className="w-4 h-4 text-brand-accent group-hover:scale-110 transition-transform" />
      )}
      {loading ? 'Přidávám kosti...' : 'Auto-Rig (Přidat kostru)'}
    </button>
  );
};
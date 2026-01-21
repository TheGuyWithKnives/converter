import React, { useState } from 'react';
import { meshyService } from '../services/meshyService';

export const RiggingControl = ({ modelUrl, onRigged }: { modelUrl: string, onRigged: (url: string) => void }) => {
  const [loading, setLoading] = useState(false);

  const handleRig = async () => {
    setLoading(true);
    try {
      const taskId = await meshyService.createRigging(modelUrl);
      
      const interval = setInterval(async () => {
        const task = await meshyService.getTaskStatus(taskId, 'rigging');
        
        if (task.status === 'SUCCEEDED') {
          clearInterval(interval);
          setLoading(false);
          onRigged(task.model_urls.glb); // Vrací narigovaný model
        }
      }, 2000);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <div className="mt-4">
      <button 
        onClick={handleRig}
        disabled={loading}
        className="w-full py-2 bg-green-600 hover:bg-green-500 text-white rounded flex items-center justify-center gap-2"
      >
        {loading ? 'Přidávám kostru...' : '🦴 Automaticky Narigovat (Přidat kostru)'}
      </button>
    </div>
  );
};
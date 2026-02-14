import React, { useState } from 'react';
import { Box, Loader2, RefreshCw } from 'lucide-react';
import { meshyService } from '../services/meshyService';

interface RemeshControlProps {
  modelUrl: string | null;
  onRemeshComplete: (url: string) => void;
}

export const RemeshControl: React.FC<RemeshControlProps> = ({
  modelUrl,
  onRemeshComplete
}) => {
  const [isRemeshing, setIsRemeshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRemesh = async () => {
    if (!modelUrl) return;

    setIsRemeshing(true);
    setError(null);

    try {
      const taskId = await meshyService.remeshModel(modelUrl);
      
      const checkStatus = async () => {
        const task = await meshyService.getTaskStatus(taskId);
        
        if (task.status === 'SUCCEEDED' && task.model_urls?.glb) {
          onRemeshComplete(task.model_urls.glb);
          setIsRemeshing(false);
        } else if (task.status === 'FAILED') {
          setError(task.error || 'Remeshing failed');
          setIsRemeshing(false);
        } else {
          setTimeout(checkStatus, 2000);
        }
      };
      
      checkStatus();
    } catch (err) {
      setError("Remeshing requires specific API support or original task ID.");
      setIsRemeshing(false);
    }
  };

  if (!modelUrl) return null;

  return (
    // FIX: Přidán margin-top a explicitní background pro viditelnost
    <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/10 mt-4 relative z-10">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Box className="w-5 h-5 text-purple-400" />
          Smart Remesh
        </h3>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-900/20 p-2 rounded">
          {error}
        </p>
      )}

      <button
        onClick={handleRemesh}
        disabled={isRemeshing}
        className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
          isRemeshing
            ? 'bg-purple-500/20 text-white/40 cursor-not-allowed'
            : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20'
        }`}
      >
        {isRemeshing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Optimizing Topology...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            Remesh to Quads
          </>
        )}
      </button>
      
      <p className="text-xs text-white/40">
        Converts triangles to clean quads for better editing.
      </p>
    </div>
  );
};
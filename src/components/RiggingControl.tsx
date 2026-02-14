import React, { useState } from 'react';
import { PersonStanding, Download, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { meshyService } from '../services/meshyService';

interface RiggingControlProps {
  modelUrl: string | null;
  onRiggingComplete: (url: string | null) => void; // Update type to allow null
}

export const RiggingControl: React.FC<RiggingControlProps> = ({
  modelUrl,
  onRiggingComplete
}) => {
  const [isRigging, setIsRigging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [riggedModelUrl, setRiggedModelUrl] = useState<string | null>(null);

  const handleRigging = async () => {
    if (!modelUrl) return;

    setIsRigging(true);
    setError(null);

    try {
      const taskId = await meshyService.rigModel(modelUrl);
      
      const checkStatus = async () => {
        const task = await meshyService.getTaskStatus(taskId);
        
        if (task.status === 'SUCCEEDED' && task.model_urls?.glb) {
          setRiggedModelUrl(task.model_urls.glb);
          onRiggingComplete(task.model_urls.glb);
          setIsRigging(false);
        } else if (task.status === 'FAILED') {
          setError(task.error || 'Rigging failed');
          setIsRigging(false);
        } else {
          setTimeout(checkStatus, 2000);
        }
      };
      
      checkStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start rigging');
      setIsRigging(false);
    }
  };

  // FIX: Funkce pro odstranění kostry
  const handleRemoveRigging = () => {
      setRiggedModelUrl(null);
      onRiggingComplete(null);
  };

  if (!modelUrl) return null;

  return (
    <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <PersonStanding className="w-5 h-5 text-blue-400" />
          Auto-Rigging
        </h3>
        {/* FIX: Tlačítko pro smazání */}
        {riggedModelUrl && (
            <button
                onClick={handleRemoveRigging}
                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                title="Remove Skeleton"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {riggedModelUrl ? (
        <div className="space-y-3">
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-200">
            Model successfully rigged!
          </div>
          <a
            href={riggedModelUrl}
            download="rigged-model.glb"
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Rigged Model
          </a>
        </div>
      ) : (
        <button
          onClick={handleRigging}
          disabled={isRigging}
          className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
            isRigging
              ? 'bg-white/10 text-white/40 cursor-not-allowed'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
          }`}
        >
          {isRigging ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Rigging Character...
            </Loader2>
          ) : (
            'Generate Skeleton (Rig)'
          )}
        </button>
      )}
      
      <p className="text-xs text-white/40">
        Best results with T-pose or A-pose humanoid characters.
      </p>
    </div>
  );
};
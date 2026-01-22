import React from 'react';
import { Settings, Download, Share2, Layers, Box, Activity } from 'lucide-react';

interface ParameterControlsProps {
  params: {
    resolution: number;
    depthScale: number;
    smoothness: number;
  };
  onParamsChange: (params: any) => void;
  onRegenerate: () => void;
  onExport: (format: 'obj' | 'stl' | 'ply' | 'fbx') => void;
  disabled: boolean;
  showParams?: boolean;
  aiModelUrl?: string | null;
}

const ParameterControls: React.FC<ParameterControlsProps> = ({
  params,
  onParamsChange,
  onRegenerate,
  onExport,
  disabled,
  showParams = true,
  aiModelUrl
}) => {
  const handleChange = (key: string, value: number) => {
    onParamsChange({ ...params, [key]: value });
  };

  return (
    <div className="space-y-6">
      {!aiModelUrl && showParams && (
        <div className="space-y-5">
           <div className="flex items-center gap-2 mb-2">
              <Settings className="w-4 h-4 text-brand-accent" />
              <h3 className="text-sm font-bold text-brand-light font-spartan uppercase">Parametry Meshe</h3>
           </div>
           
           {/* Resolution Slider */}
           <div className="space-y-2">
             <div className="flex justify-between text-xs">
               <span className="text-brand-muted flex items-center gap-1"><Box className="w-3 h-3"/> Rozlišení</span>
               <span className="text-brand-light font-mono">{params.resolution}</span>
             </div>
             <input
               type="range"
               min="1"
               max="10"
               step="1"
               value={params.resolution}
               onChange={(e) => handleChange('resolution', parseFloat(e.target.value))}
               disabled={disabled}
               className="w-full h-2 bg-brand-dark rounded-lg appearance-none cursor-pointer accent-brand-accent hover:accent-red-500"
             />
           </div>

           {/* Depth Scale */}
           <div className="space-y-2">
             <div className="flex justify-between text-xs">
               <span className="text-brand-muted flex items-center gap-1"><Layers className="w-3 h-3"/> Hloubka</span>
               <span className="text-brand-light font-mono">{params.depthScale.toFixed(1)}</span>
             </div>
             <input
               type="range"
               min="1"
               max="10"
               step="0.1"
               value={params.depthScale}
               onChange={(e) => handleChange('depthScale', parseFloat(e.target.value))}
               disabled={disabled}
               className="w-full h-2 bg-brand-dark rounded-lg appearance-none cursor-pointer accent-brand-accent"
             />
           </div>
        </div>
      )}

      {/* Export Sekce - Vždy viditelná */}
      <div>
        <h3 className="text-xs font-bold text-brand-muted uppercase mb-3 flex items-center gap-2">
           <Share2 className="w-3 h-3 text-brand-accent" /> Export & Download
        </h3>
        
        {aiModelUrl ? (
          <a
            href={aiModelUrl}
            download="model.glb"
            className="w-full flex items-center justify-center gap-2 bg-brand-accent hover:bg-red-600 text-white py-3 rounded-xl font-bold shadow-glow transition-all"
          >
            <Download className="w-4 h-4" />
            Stáhnout .GLB
          </a>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {['obj', 'stl', 'ply', 'fbx'].map((fmt) => (
              <button
                key={fmt}
                onClick={() => onExport(fmt as any)}
                disabled={disabled}
                className="flex items-center justify-center gap-2 bg-brand-dark border border-brand-light/10 hover:border-brand-accent hover:text-brand-accent text-brand-muted py-2.5 rounded-lg text-xs font-bold uppercase transition-all"
              >
                {fmt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParameterControls;
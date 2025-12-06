import { Settings, Download } from 'lucide-react';
import { MeshGenerationParams } from '../services/meshGenerator';

interface ParameterControlsProps {
  params: MeshGenerationParams;
  onParamsChange: (params: MeshGenerationParams) => void;
  onRegenerate: () => void;
  onExport: (format: 'obj' | 'stl' | 'ply' | 'fbx') => void;
  disabled?: boolean;
  showParams?: boolean;
  aiModelUrl?: string | null;
}

export default function ParameterControls({
  params,
  onParamsChange,
  onRegenerate,
  onExport,
  disabled,
  showParams = true,
  aiModelUrl,
}: ParameterControlsProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      {showParams && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-slate-700" />
            <h3 className="text-lg font-semibold text-slate-800">Parametry generování</h3>
          </div>

          <div className="space-y-4">
        <div>
          <label className="flex justify-between text-sm font-medium text-slate-700 mb-2">
            <span>Rozlišení meshe</span>
            <span className="text-blue-600">{params.resolution}px</span>
          </label>
          <input
            type="range"
            min="1"
            max="20"
            step="1"
            value={params.resolution}
            onChange={(e) =>
              onParamsChange({ ...params, resolution: parseInt(e.target.value) })
            }
            disabled={disabled}
            className="w-full accent-blue-600"
          />
          <p className="text-xs text-slate-500 mt-1">
            Nižší hodnota = vyšší detail (pomalejší zpracování)
          </p>
        </div>

        <div>
          <label className="flex justify-between text-sm font-medium text-slate-700 mb-2">
            <span>Hloubka extruze</span>
            <span className="text-blue-600">{params.depthScale.toFixed(1)}</span>
          </label>
          <input
            type="range"
            min="0.1"
            max="10"
            step="0.1"
            value={params.depthScale}
            onChange={(e) =>
              onParamsChange({ ...params, depthScale: parseFloat(e.target.value) })
            }
            disabled={disabled}
            className="w-full accent-blue-600"
          />
          <p className="text-xs text-slate-500 mt-1">
            Určuje výšku 3D reliéfu
          </p>
        </div>

        <div>
          <label className="flex justify-between text-sm font-medium text-slate-700 mb-2">
            <span>Vyhlazení</span>
            <span className="text-blue-600">{(params.smoothness * 100).toFixed(0)}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={params.smoothness}
            onChange={(e) =>
              onParamsChange({ ...params, smoothness: parseFloat(e.target.value) })
            }
            disabled={disabled}
            className="w-full accent-blue-600"
          />
          <p className="text-xs text-slate-500 mt-1">
            Vyšší hodnota = hladší povrch
          </p>
        </div>
          </div>

          <button
            onClick={onRegenerate}
            disabled={disabled}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium rounded-lg transition-colors"
          >
            Regenerovat 3D model
          </button>
        </>
      )}

      <div className={showParams ? "pt-4 border-t border-slate-200" : ""}>
        <div className="flex items-center gap-2 mb-3">
          <Download className="w-5 h-5 text-slate-700" />
          <h4 className="text-sm font-semibold text-slate-800">Export</h4>
        </div>

        {aiModelUrl ? (
          <a
            href={aiModelUrl}
            download="model.glb"
            className="block w-full py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors text-center"
          >
            Stáhnout GLB Model
          </a>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onExport('obj')}
              disabled={disabled}
              className="py-2 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-400 text-slate-700 font-medium rounded-lg transition-colors"
            >
              .OBJ
            </button>
            <button
              onClick={() => onExport('stl')}
              disabled={disabled}
              className="py-2 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-400 text-slate-700 font-medium rounded-lg transition-colors"
            >
              .STL
            </button>
            <button
              onClick={() => onExport('ply')}
              disabled={disabled}
              className="py-2 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-400 text-slate-700 font-medium rounded-lg transition-colors"
            >
              .PLY
            </button>
            <button
              onClick={() => onExport('fbx')}
              disabled={disabled}
              className="py-2 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-400 text-slate-700 font-medium rounded-lg transition-colors"
            >
              .FBX
            </button>
          </div>
        )}

        {!aiModelUrl && (
          <p className="text-xs text-slate-500 mt-3">
            Kompatibilní s Blender, Maya, 3ds Max a dalšími
          </p>
        )}
      </div>
    </div>
  );
}

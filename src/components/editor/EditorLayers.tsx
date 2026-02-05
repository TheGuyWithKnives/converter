import { Eye, EyeOff, Lock, Unlock, Plus, Trash2, ChevronUp, ChevronDown, Copy } from 'lucide-react';
import type { Layer, BlendMode } from './editorTypes';

interface EditorLayersProps {
  layers: Layer[];
  activeLayerId: string;
  onSelectLayer: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onOpacityChange: (id: string, opacity: number) => void;
  onBlendModeChange: (id: string, mode: BlendMode) => void;
  onAddLayer: () => void;
  onDeleteLayer: (id: string) => void;
  onDuplicateLayer: (id: string) => void;
  onMoveLayer: (id: string, direction: 'up' | 'down') => void;
  onMergeDown: (id: string) => void;
}

const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
];

export function EditorLayers({
  layers, activeLayerId,
  onSelectLayer, onToggleVisibility, onToggleLock, onOpacityChange,
  onBlendModeChange, onAddLayer, onDeleteLayer, onDuplicateLayer,
  onMoveLayer, onMergeDown,
}: EditorLayersProps) {
  return (
    <div className="bg-[#252526] border-t border-[#333] flex flex-col" style={{ height: '240px' }}>
      <div className="px-3 py-2 border-b border-[#333] flex items-center justify-between shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#999]">Vrstvy</span>
        <div className="flex gap-1">
          <button
            onClick={onAddLayer}
            className="w-6 h-6 flex items-center justify-center rounded text-[#999] hover:text-white hover:bg-[#333] transition-colors"
            title="Pridat vrstvu"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {[...layers].reverse().map((layer, idx) => {
          const isActive = layer.id === activeLayerId;
          const realIdx = layers.length - 1 - idx;
          return (
            <div
              key={layer.id}
              onClick={() => onSelectLayer(layer.id)}
              className={`flex items-center gap-2 px-2 py-1.5 border-b border-[#333] cursor-pointer transition-colors ${
                isActive ? 'bg-[#0078d4]/20 border-l-2 border-l-[#0078d4]' : 'hover:bg-[#2a2a2a]'
              }`}
            >
              <button
                onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id); }}
                className="text-[#888] hover:text-white transition-colors shrink-0"
              >
                {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-[#555]" />}
              </button>

              <div className="w-8 h-8 border border-[#444] rounded overflow-hidden bg-[#1a1a1a] shrink-0">
                <canvas
                  ref={(el) => {
                    if (el && layer.canvas) {
                      const ctx = el.getContext('2d');
                      if (ctx) {
                        el.width = 32;
                        el.height = 32;
                        ctx.clearRect(0, 0, 32, 32);
                        ctx.drawImage(layer.canvas, 0, 0, 32, 32);
                      }
                    }
                  }}
                  className="w-full h-full"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-white truncate">{layer.name}</div>
                <div className="text-[9px] text-[#888]">{Math.round(layer.opacity * 100)}%</div>
              </div>

              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleLock(layer.id); }}
                  className="text-[#666] hover:text-white transition-colors"
                >
                  {layer.locked ? <Lock className="w-3 h-3 text-[#ff6600]" /> : <Unlock className="w-3 h-3" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {activeLayerId && (
        <div className="px-3 py-2 border-t border-[#333] space-y-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#888] w-14">Opacita</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round((layers.find(l => l.id === activeLayerId)?.opacity ?? 1) * 100)}
              onChange={(e) => onOpacityChange(activeLayerId, Number(e.target.value) / 100)}
              className="flex-1 accent-[#0078d4] h-1"
            />
            <span className="text-[10px] text-white font-mono w-10 text-right">
              {Math.round((layers.find(l => l.id === activeLayerId)?.opacity ?? 1) * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#888] w-14">Rezim</span>
            <select
              value={layers.find(l => l.id === activeLayerId)?.blendMode ?? 'normal'}
              onChange={(e) => onBlendModeChange(activeLayerId, e.target.value as BlendMode)}
              className="flex-1 bg-[#1e1e1e] border border-[#444] rounded px-1 py-0.5 text-[10px] text-white"
            >
              {BLEND_MODES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-1">
            <button
              onClick={() => onDuplicateLayer(activeLayerId)}
              className="flex-1 py-1 rounded text-[10px] border border-[#444] text-[#999] hover:text-white hover:bg-[#333] flex items-center justify-center gap-1"
            >
              <Copy className="w-3 h-3" /> Duplikovat
            </button>
            <button
              onClick={() => onMoveLayer(activeLayerId, 'up')}
              className="px-2 py-1 rounded border border-[#444] text-[#999] hover:text-white hover:bg-[#333]"
            >
              <ChevronUp className="w-3 h-3" />
            </button>
            <button
              onClick={() => onMoveLayer(activeLayerId, 'down')}
              className="px-2 py-1 rounded border border-[#444] text-[#999] hover:text-white hover:bg-[#333]"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
            <button
              onClick={() => onMergeDown(activeLayerId)}
              className="px-2 py-1 rounded border border-[#444] text-[10px] text-[#999] hover:text-white hover:bg-[#333]"
              title="Slouci dolu"
            >
              M
            </button>
            <button
              onClick={() => onDeleteLayer(activeLayerId)}
              disabled={layers.length <= 1}
              className="px-2 py-1 rounded border border-[#444] text-[#999] hover:text-red-400 hover:bg-red-900/20 disabled:opacity-30"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

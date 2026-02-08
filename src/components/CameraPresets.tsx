import { Camera, Eye, Maximize2 } from 'lucide-react';

interface CameraPresetsProps {
  onPresetSelect: (preset: CameraPreset) => void;
}

export interface CameraPreset {
  name: string;
  position: [number, number, number];
  target: [number, number, number];
}

export default function CameraPresets({ onPresetSelect }: CameraPresetsProps) {
  const presets: CameraPreset[] = [
    { name: 'Front', position: [0, 0, 5], target: [0, 0, 0] },
    { name: 'Back', position: [0, 0, -5], target: [0, 0, 0] },
    { name: 'Left', position: [-5, 0, 0], target: [0, 0, 0] },
    { name: 'Right', position: [5, 0, 0], target: [0, 0, 0] },
    { name: 'Top', position: [0, 5, 0], target: [0, 0, 0] },
    { name: 'Bottom', position: [0, -5, 0], target: [0, 0, 0] },
    { name: 'Iso', position: [3, 3, 3], target: [0, 0, 0] },
    { name: 'Perspective', position: [4, 2, 4], target: [0, 0, 0] },
  ];

  return (
    <div className="bg-brand-surface rounded-xl p-4 border border-brand-border">
      <div className="flex items-center gap-2 mb-4">
        <Camera className="w-4 h-4 text-amber-400" />
        <h3 className="text-brand-light font-bold text-sm">Camera Presets</h3>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {presets.map((preset) => (
          <button
            key={preset.name}
            onClick={() => onPresetSelect(preset)}
            className="px-3 py-2 bg-brand-dark hover:bg-brand-border text-brand-muted hover:text-brand-light text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 border border-brand-border hover:border-brand-muted-soft"
          >
            {preset.name === 'Iso' && <Maximize2 className="w-3 h-3" />}
            {preset.name === 'Perspective' && <Eye className="w-3 h-3" />}
            {preset.name}
          </button>
        ))}
      </div>
    </div>
  );
}

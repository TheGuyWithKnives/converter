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
    <div className="bg-slate-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Camera className="w-5 h-5 text-purple-400" />
        <h3 className="text-white font-semibold">Camera Presets</h3>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {presets.map((preset) => (
          <button
            key={preset.name}
            onClick={() => onPresetSelect(preset)}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors flex items-center justify-center gap-2"
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

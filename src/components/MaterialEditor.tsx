import { useState } from 'react';
import { Palette, Sparkles, Sun, Droplets } from 'lucide-react';

export interface MaterialSettings {
  color: string;
  metalness: number;
  roughness: number;
  emissive: string;
  emissiveIntensity: number;
}

interface MaterialEditorProps {
  onApply: (settings: MaterialSettings) => void;
  currentSettings?: MaterialSettings;
}

export default function MaterialEditor({ onApply, currentSettings }: MaterialEditorProps) {
  const [settings, setSettings] = useState<MaterialSettings>(
    currentSettings || {
      color: '#ffffff',
      metalness: 0.5,
      roughness: 0.5,
      emissive: '#000000',
      emissiveIntensity: 0,
    }
  );

  const handleApply = () => {
    onApply(settings);
  };

  const presets = [
    { name: 'Plastic', color: '#ffffff', metalness: 0, roughness: 0.5 },
    { name: 'Metal', color: '#c0c0c0', metalness: 1, roughness: 0.2 },
    { name: 'Glass', color: '#e0f7fa', metalness: 0, roughness: 0.1 },
    { name: 'Gold', color: '#ffd700', metalness: 1, roughness: 0.3 },
    { name: 'Wood', color: '#8b4513', metalness: 0, roughness: 0.8 },
    { name: 'Stone', color: '#808080', metalness: 0, roughness: 0.9 },
  ];

  const applyPreset = (preset: typeof presets[0]) => {
    setSettings({
      ...settings,
      color: preset.color,
      metalness: preset.metalness,
      roughness: preset.roughness,
    });
  };

  return (
    <div className="bg-brand-surface rounded-xl p-4 space-y-4 border border-brand-border">
      <div className="flex items-center gap-2 mb-4">
        <Palette className="w-4 h-4 text-blue-400" />
        <h3 className="text-brand-light font-bold text-sm">Material Editor</h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-brand-muted mb-2 block font-bold uppercase tracking-wider">Base Color</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={settings.color}
              onChange={(e) => setSettings({ ...settings, color: e.target.value })}
              className="w-12 h-10 rounded-lg cursor-pointer border border-brand-border"
            />
            <input
              type="text"
              value={settings.color}
              onChange={(e) => setSettings({ ...settings, color: e.target.value })}
              className="flex-1 px-3 py-2 bg-brand-dark text-brand-light rounded-lg text-sm font-mono border border-brand-border focus:border-brand-accent/50 focus:outline-none"
              placeholder="#ffffff"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-brand-muted mb-2 flex items-center gap-2 font-bold">
            <Sparkles className="w-3 h-3" />
            Metalness: {settings.metalness.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={settings.metalness}
            onChange={(e) => setSettings({ ...settings, metalness: parseFloat(e.target.value) })}
            className="w-full accent-brand-accent"
          />
        </div>

        <div>
          <label className="text-xs text-brand-muted mb-2 flex items-center gap-2 font-bold">
            <Droplets className="w-3 h-3" />
            Roughness: {settings.roughness.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={settings.roughness}
            onChange={(e) => setSettings({ ...settings, roughness: parseFloat(e.target.value) })}
            className="w-full accent-brand-accent"
          />
        </div>

        <div>
          <label className="text-xs text-brand-muted mb-2 flex items-center gap-2 font-bold">
            <Sun className="w-3 h-3" />
            Emissive Color
          </label>
          <div className="flex gap-2">
            <input
              type="color"
              value={settings.emissive}
              onChange={(e) => setSettings({ ...settings, emissive: e.target.value })}
              className="w-12 h-10 rounded-lg cursor-pointer border border-brand-border"
            />
            <input
              type="text"
              value={settings.emissive}
              onChange={(e) => setSettings({ ...settings, emissive: e.target.value })}
              className="flex-1 px-3 py-2 bg-brand-dark text-brand-light rounded-lg text-sm font-mono border border-brand-border focus:border-brand-accent/50 focus:outline-none"
              placeholder="#000000"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-brand-muted mb-2 block font-bold">
            Emissive Intensity: {settings.emissiveIntensity.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.01"
            value={settings.emissiveIntensity}
            onChange={(e) =>
              setSettings({ ...settings, emissiveIntensity: parseFloat(e.target.value) })
            }
            className="w-full accent-brand-accent"
          />
        </div>

        <div className="pt-2">
          <label className="text-xs text-brand-muted mb-2 block font-bold uppercase tracking-wider">Material Presets</label>
          <div className="grid grid-cols-3 gap-2">
            {presets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="px-3 py-2 bg-brand-dark hover:bg-brand-border text-brand-muted hover:text-brand-light text-xs font-bold rounded-lg transition-all border border-brand-border"
                style={{ backgroundColor: preset.color + '15' }}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleApply}
          className="w-full px-4 py-2.5 bg-brand-accent hover:opacity-90 text-brand-light font-bold rounded-xl transition-all shadow-glow"
        >
          Apply Material
        </button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { X, SlidersHorizontal } from 'lucide-react';
import type { FilterType, ColorAdjustments } from './editorTypes';

interface EditorFiltersProps {
  onApplyFilter: (filter: FilterType, intensity: number) => void;
  onApplyAdjustments: (adj: ColorAdjustments) => void;
  onClose: () => void;
}

const FILTERS: { id: FilterType; label: string; defaultIntensity: number }[] = [
  { id: 'blur', label: 'Rozmazani', defaultIntensity: 50 },
  { id: 'sharpen', label: 'Doostreni', defaultIntensity: 50 },
  { id: 'grayscale', label: 'Cernobile', defaultIntensity: 100 },
  { id: 'sepia', label: 'Sepia', defaultIntensity: 100 },
  { id: 'invert', label: 'Inverze', defaultIntensity: 100 },
  { id: 'vignette', label: 'Vinetace', defaultIntensity: 60 },
  { id: 'noise', label: 'Sum', defaultIntensity: 30 },
  { id: 'emboss', label: 'Relief', defaultIntensity: 50 },
  { id: 'posterize', label: 'Posterizace', defaultIntensity: 50 },
];

export function EditorFilters({ onApplyFilter, onApplyAdjustments, onClose }: EditorFiltersProps) {
  const [activeTab, setActiveTab] = useState<'filters' | 'adjust'>('filters');
  const [selectedFilter, setSelectedFilter] = useState<FilterType | null>(null);
  const [intensity, setIntensity] = useState(50);
  const [adjustments, setAdjustments] = useState<ColorAdjustments>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    hue: 0,
    exposure: 100,
    highlights: 0,
    shadows: 0,
  });

  const handleApplyFilter = () => {
    if (selectedFilter) {
      onApplyFilter(selectedFilter, intensity);
      setSelectedFilter(null);
    }
  };

  const handleApplyAdjustments = () => {
    onApplyAdjustments(adjustments);
    setAdjustments({
      brightness: 100, contrast: 100, saturation: 100,
      hue: 0, exposure: 100, highlights: 0, shadows: 0,
    });
  };

  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 flex items-center justify-center">
      <div className="bg-[#1e1e1e] border border-[#444] rounded-xl shadow-2xl w-[480px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#333]">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#0078d4]" />
            <span className="text-sm font-bold text-white">Filtry & Upravy</span>
          </div>
          <button onClick={onClose} className="text-[#888] hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex border-b border-[#333]">
          <button
            onClick={() => setActiveTab('filters')}
            className={`flex-1 py-2 text-xs font-bold ${
              activeTab === 'filters'
                ? 'text-[#0078d4] border-b-2 border-[#0078d4]'
                : 'text-[#888] hover:text-white'
            }`}
          >
            Filtry
          </button>
          <button
            onClick={() => setActiveTab('adjust')}
            className={`flex-1 py-2 text-xs font-bold ${
              activeTab === 'adjust'
                ? 'text-[#0078d4] border-b-2 border-[#0078d4]'
                : 'text-[#888] hover:text-white'
            }`}
          >
            Upravy barev
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'filters' && (
            <>
              <div className="grid grid-cols-3 gap-2">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setSelectedFilter(f.id);
                      setIntensity(f.defaultIntensity);
                    }}
                    className={`py-3 rounded-lg text-xs font-bold border transition-all ${
                      selectedFilter === f.id
                        ? 'bg-[#0078d4] border-[#0078d4] text-white'
                        : 'border-[#444] text-[#999] hover:text-white hover:border-[#666]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {selectedFilter && (
                <div className="space-y-3 pt-2 border-t border-[#333]">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#888] w-16">Intenzita</span>
                    <input
                      type="range"
                      min={1}
                      max={100}
                      value={intensity}
                      onChange={(e) => setIntensity(Number(e.target.value))}
                      className="flex-1 accent-[#0078d4]"
                    />
                    <span className="text-xs text-white font-mono w-10 text-right">{intensity}%</span>
                  </div>
                  <button
                    onClick={handleApplyFilter}
                    className="w-full py-2 bg-[#0078d4] hover:bg-[#006abc] text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Aplikovat filtr
                  </button>
                </div>
              )}
            </>
          )}

          {activeTab === 'adjust' && (
            <>
              <AdjSlider
                label="Jas" value={adjustments.brightness}
                min={0} max={200} unit="%"
                onChange={(v) => setAdjustments(prev => ({ ...prev, brightness: v }))}
              />
              <AdjSlider
                label="Kontrast" value={adjustments.contrast}
                min={0} max={200} unit="%"
                onChange={(v) => setAdjustments(prev => ({ ...prev, contrast: v }))}
              />
              <AdjSlider
                label="Sytost" value={adjustments.saturation}
                min={0} max={200} unit="%"
                onChange={(v) => setAdjustments(prev => ({ ...prev, saturation: v }))}
              />
              <AdjSlider
                label="Odstin" value={adjustments.hue}
                min={-180} max={180} unit="°"
                onChange={(v) => setAdjustments(prev => ({ ...prev, hue: v }))}
              />
              <AdjSlider
                label="Expozice" value={adjustments.exposure}
                min={50} max={150} unit="%"
                onChange={(v) => setAdjustments(prev => ({ ...prev, exposure: v }))}
              />

              <button
                onClick={handleApplyAdjustments}
                className="w-full py-2 bg-[#0078d4] hover:bg-[#006abc] text-white rounded-lg text-xs font-bold transition-colors mt-2"
              >
                Aplikovat upravy
              </button>
              <button
                onClick={() => setAdjustments({
                  brightness: 100, contrast: 100, saturation: 100,
                  hue: 0, exposure: 100, highlights: 0, shadows: 0,
                })}
                className="w-full py-2 border border-[#444] text-[#999] hover:text-white rounded-lg text-xs font-bold transition-colors"
              >
                Resetovat
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AdjSlider({
  label, value, min, max, unit, onChange,
}: {
  label: string; value: number; min: number; max: number; unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#888] w-16 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-[#0078d4]"
      />
      <span className="text-xs text-white font-mono w-12 text-right">{value}{unit}</span>
    </div>
  );
}

import { useState } from 'react';
import type { ToolType, BrushSettings, TextSettings, ShapeSettings, ShapeType } from './editorTypes';

interface EditorPropertiesProps {
  tool: ToolType;
  brush: BrushSettings;
  textSettings: TextSettings;
  shapeSettings: ShapeSettings;
  onBrushChange: (brush: Partial<BrushSettings>) => void;
  onTextChange: (text: Partial<TextSettings>) => void;
  onShapeChange: (shape: Partial<ShapeSettings>) => void;
}

const FONTS = [
  'Arial', 'Helvetica', 'Georgia', 'Times New Roman',
  'Courier New', 'Verdana', 'Impact', 'Comic Sans MS',
];

const SHAPES: { id: ShapeType; label: string }[] = [
  { id: 'rectangle', label: 'Obdelnik' },
  { id: 'circle', label: 'Kruh' },
  { id: 'line', label: 'Cara' },
  { id: 'arrow', label: 'Sipka' },
];

export function EditorProperties({
  tool, brush, textSettings, shapeSettings,
  onBrushChange, onTextChange, onShapeChange,
}: EditorPropertiesProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);

  const PRESET_COLORS = [
    '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff',
    '#ffff00', '#ff00ff', '#00ffff', '#ff6600', '#9900ff',
    '#ff3366', '#33cc33', '#3399ff', '#ff9900', '#cc66ff',
    '#66cccc', '#993333', '#336633', '#333399', '#996633',
  ];

  return (
    <div className="w-64 bg-[#252526] border-l border-[#333] flex flex-col overflow-hidden shrink-0">
      <div className="px-3 py-2 border-b border-[#333] text-[10px] font-bold uppercase tracking-wider text-[#999]">
        Vlastnosti
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
        {(tool === 'brush' || tool === 'eraser' || tool === 'blur-brush' || tool === 'clone') && (
          <>
            <PropSection title="Stetec">
              <SliderProp
                label="Velikost"
                value={brush.size}
                min={1}
                max={200}
                unit="px"
                onChange={(v) => onBrushChange({ size: v })}
              />
              <SliderProp
                label="Opacita"
                value={brush.opacity}
                min={1}
                max={100}
                unit="%"
                onChange={(v) => onBrushChange({ opacity: v })}
              />
              <SliderProp
                label="Tvrdost"
                value={brush.hardness}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => onBrushChange({ hardness: v })}
              />
            </PropSection>

            {tool !== 'eraser' && (
              <PropSection title="Barva">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      className="w-8 h-8 rounded border-2 border-[#555] shadow-inner"
                      style={{ backgroundColor: brush.color }}
                    />
                    <input
                      type="text"
                      value={brush.color}
                      onChange={(e) => onBrushChange({ color: e.target.value })}
                      className="flex-1 bg-[#1e1e1e] border border-[#444] rounded px-2 py-1 text-xs text-white font-mono"
                    />
                  </div>
                  <input
                    type="color"
                    value={brush.color}
                    onChange={(e) => onBrushChange({ color: e.target.value })}
                    className="w-full h-8 cursor-pointer rounded border border-[#444]"
                  />
                  <div className="grid grid-cols-5 gap-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => onBrushChange({ color: c })}
                        className={`w-full aspect-square rounded border transition-all ${
                          brush.color === c ? 'border-white scale-110' : 'border-[#444] hover:border-[#666]'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </PropSection>
            )}

            <PropSection title="Nahled">
              <div className="bg-[#1e1e1e] rounded-lg p-3 flex items-center justify-center h-16">
                <div
                  className="rounded-full"
                  style={{
                    width: Math.min(brush.size, 56),
                    height: Math.min(brush.size, 56),
                    backgroundColor: tool === 'eraser' ? '#666' : brush.color,
                    opacity: brush.opacity / 100,
                    boxShadow: brush.hardness < 50
                      ? `0 0 ${(100 - brush.hardness) / 5}px ${tool === 'eraser' ? '#666' : brush.color}`
                      : 'none',
                  }}
                />
              </div>
            </PropSection>
          </>
        )}

        {tool === 'text' && (
          <>
            <PropSection title="Text">
              <textarea
                value={textSettings.content}
                onChange={(e) => onTextChange({ content: e.target.value })}
                placeholder="Zadejte text..."
                className="w-full bg-[#1e1e1e] border border-[#444] rounded px-2 py-1.5 text-xs text-white resize-none h-16"
              />
            </PropSection>

            <PropSection title="Pismo">
              <select
                value={textSettings.fontFamily}
                onChange={(e) => onTextChange({ fontFamily: e.target.value })}
                className="w-full bg-[#1e1e1e] border border-[#444] rounded px-2 py-1.5 text-xs text-white"
              >
                {FONTS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>

              <SliderProp
                label="Velikost"
                value={textSettings.fontSize}
                min={8}
                max={200}
                unit="px"
                onChange={(v) => onTextChange({ fontSize: v })}
              />

              <div className="flex gap-1">
                <button
                  onClick={() => onTextChange({ fontWeight: textSettings.fontWeight === 'bold' ? 'normal' : 'bold' })}
                  className={`flex-1 py-1 rounded text-xs font-bold border ${
                    textSettings.fontWeight === 'bold'
                      ? 'bg-[#0078d4] border-[#0078d4] text-white'
                      : 'border-[#444] text-[#999] hover:text-white'
                  }`}
                >
                  B
                </button>
                <button
                  onClick={() => onTextChange({ fontStyle: textSettings.fontStyle === 'italic' ? 'normal' : 'italic' })}
                  className={`flex-1 py-1 rounded text-xs italic border ${
                    textSettings.fontStyle === 'italic'
                      ? 'bg-[#0078d4] border-[#0078d4] text-white'
                      : 'border-[#444] text-[#999] hover:text-white'
                  }`}
                >
                  I
                </button>
              </div>

              <div className="flex gap-1">
                {(['left', 'center', 'right'] as const).map((a) => (
                  <button
                    key={a}
                    onClick={() => onTextChange({ align: a })}
                    className={`flex-1 py-1 rounded text-[10px] border ${
                      textSettings.align === a
                        ? 'bg-[#0078d4] border-[#0078d4] text-white'
                        : 'border-[#444] text-[#999] hover:text-white'
                    }`}
                  >
                    {a === 'left' ? 'Vlevo' : a === 'center' ? 'Stred' : 'Vpravo'}
                  </button>
                ))}
              </div>
            </PropSection>

            <PropSection title="Barva textu">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={textSettings.color}
                  onChange={(e) => onTextChange({ color: e.target.value })}
                  className="w-8 h-8 cursor-pointer rounded border border-[#444]"
                />
                <span className="text-xs text-[#999] font-mono">{textSettings.color}</span>
              </div>
            </PropSection>
          </>
        )}

        {tool === 'shape' && (
          <>
            <PropSection title="Tvar">
              <div className="grid grid-cols-2 gap-1">
                {SHAPES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onShapeChange({ type: s.id })}
                    className={`py-1.5 rounded text-xs font-bold border ${
                      shapeSettings.type === s.id
                        ? 'bg-[#0078d4] border-[#0078d4] text-white'
                        : 'border-[#444] text-[#999] hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </PropSection>

            <PropSection title="Obrys">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={shapeSettings.strokeColor}
                  onChange={(e) => onShapeChange({ strokeColor: e.target.value })}
                  className="w-8 h-8 cursor-pointer rounded border border-[#444]"
                />
                <span className="text-xs text-[#999] font-mono">{shapeSettings.strokeColor}</span>
              </div>
              <SliderProp
                label="Sirka"
                value={shapeSettings.strokeWidth}
                min={1}
                max={20}
                unit="px"
                onChange={(v) => onShapeChange({ strokeWidth: v })}
              />
            </PropSection>

            <PropSection title="Vypln">
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => onShapeChange({ filled: !shapeSettings.filled })}
                  className={`px-3 py-1 rounded text-xs font-bold border ${
                    shapeSettings.filled
                      ? 'bg-[#0078d4] border-[#0078d4] text-white'
                      : 'border-[#444] text-[#999]'
                  }`}
                >
                  {shapeSettings.filled ? 'Zapnuto' : 'Vypnuto'}
                </button>
              </div>
              {shapeSettings.filled && (
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={shapeSettings.fillColor}
                    onChange={(e) => onShapeChange({ fillColor: e.target.value })}
                    className="w-8 h-8 cursor-pointer rounded border border-[#444]"
                  />
                  <span className="text-xs text-[#999] font-mono">{shapeSettings.fillColor}</span>
                </div>
              )}
            </PropSection>
          </>
        )}

        {tool === 'fill' && (
          <PropSection title="Vyplneni">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={brush.color}
                onChange={(e) => onBrushChange({ color: e.target.value })}
                className="w-8 h-8 cursor-pointer rounded border border-[#444]"
              />
              <span className="text-xs text-[#999] font-mono">{brush.color}</span>
            </div>
            <div className="grid grid-cols-5 gap-1 mt-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => onBrushChange({ color: c })}
                  className={`w-full aspect-square rounded border transition-all ${
                    brush.color === c ? 'border-white scale-110' : 'border-[#444] hover:border-[#666]'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </PropSection>
        )}

        {tool === 'eyedropper' && (
          <PropSection title="Kapetka">
            <p className="text-[10px] text-[#888] leading-relaxed">
              Kliknete na platno pro zachyceni barvy. Barva se automaticky prenese do stetce.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div
                className="w-10 h-10 rounded border-2 border-[#555]"
                style={{ backgroundColor: brush.color }}
              />
              <span className="text-xs text-white font-mono">{brush.color}</span>
            </div>
          </PropSection>
        )}

        {(tool === 'move' || tool === 'selection' || tool === 'crop') && (
          <PropSection title="Info">
            <p className="text-[10px] text-[#888] leading-relaxed">
              {tool === 'move' && 'Tahnem mysi presunete platno. Koleckem mysi zoomujte.'}
              {tool === 'selection' && 'Tahnem vytvorite vyber. Oznacena oblast bude zvyraznena.'}
              {tool === 'crop' && 'Tahnem na platne oznacite oblast pro orezani.'}
            </p>
          </PropSection>
        )}
      </div>
    </div>
  );
}

function PropSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#888] mb-2">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function SliderProp({
  label, value, min, max, unit, onChange,
}: {
  label: string; value: number; min: number; max: number; unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-[#888] w-14 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-[#0078d4] h-1"
      />
      <span className="text-[10px] text-white font-mono w-12 text-right">
        {value}{unit}
      </span>
    </div>
  );
}

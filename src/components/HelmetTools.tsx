import { useState, useEffect } from 'react';
import { Info, RefreshCw, Check, HardHat, Ruler, ChevronDown, ChevronUp } from 'lucide-react';
import * as THREE from 'three';

interface HelmetToolsProps {
  mesh: THREE.Mesh | null;
  onScaleChange?: (scale: [number, number, number]) => void;
}

const SIZE_CHART = [
  { label: 'XS', circumference: 52, range: '51-52' },
  { label: 'S', circumference: 54, range: '53-54' },
  { label: 'M', circumference: 56, range: '55-56' },
  { label: 'L', circumference: 58, range: '57-58' },
  { label: 'XL', circumference: 60, range: '59-60' },
  { label: 'XXL', circumference: 62, range: '61-62' },
];

export function HelmetTools({ mesh, onScaleChange }: HelmetToolsProps) {
  const [headCircumference, setHeadCircumference] = useState<number>(58);
  const [wallThickness, setWallThickness] = useState<number>(3);
  const [paddingThickness, setPaddingThickness] = useState<number>(5);
  const [dims, setDims] = useState({ x: 0, y: 0, z: 0 });
  const [isHelmetMode, setIsHelmetMode] = useState(false);
  const [suggestedScale, setSuggestedScale] = useState<number | null>(null);
  const [showMeasureTip, setShowMeasureTip] = useState(false);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [measureMethod, setMeasureMethod] = useState<'tape' | 'pot'>('tape');

  useEffect(() => {
    if (mesh) updateDimensions();
  }, [mesh]);

  const updateDimensions = () => {
    if (!mesh) return;
    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    setDims({ x: size.x, y: size.y, z: size.z });
  };

  const calculateHelmetScale = () => {
    if (!mesh) return;

    const paddingReserveCm = paddingThickness / 10;
    const wallReserveCm = wallThickness / 10;
    const targetInnerCircumference = headCircumference + paddingReserveCm * 2 * Math.PI;
    const targetInnerDiameter = targetInnerCircumference / Math.PI;
    const targetOuterDiameter = targetInnerDiameter + wallReserveCm * 2;
    const targetOuterDiameterMM = targetOuterDiameter * 10;

    const currentScale = mesh.scale.x;
    const rawWidth = dims.x / currentScale;
    const newScale = targetOuterDiameterMM / rawWidth;

    setSuggestedScale(newScale);
  };

  const applyScale = () => {
    if (suggestedScale && onScaleChange) {
      onScaleChange([suggestedScale, suggestedScale, suggestedScale]);
      setTimeout(updateDimensions, 100);
    }
  };

  const innerCircumference = suggestedScale
    ? ((dims.x / mesh!.scale.x * suggestedScale - wallThickness * 2) * Math.PI / 10).toFixed(1)
    : null;

  if (!mesh) return null;

  return (
    <div className="bg-brand-panel/90 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-2xl">
      <button
        onClick={() => setIsHelmetMode(!isHelmetMode)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <HardHat className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-brand-light">
            Kalkulator helmy
          </span>
        </div>
        <div className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
          isHelmetMode ? 'bg-cyan-500/20 text-cyan-400' : 'bg-brand-dark text-brand-muted'
        }`}>
          {isHelmetMode ? 'AKTIVNI' : 'VYP'}
        </div>
      </button>

      {isHelmetMode && (
        <div className="px-4 pb-4 space-y-3">
          <button
            onClick={() => setShowMeasureTip(!showMeasureTip)}
            className="w-full text-left bg-cyan-500/5 border border-cyan-500/15 rounded-lg p-2.5 hover:bg-cyan-500/10 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                  Jak zmerit obvod hlavy?
                </span>
              </div>
              {showMeasureTip ? (
                <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
              )}
            </div>
          </button>

          {showMeasureTip && (
            <div className="bg-brand-dark/50 border border-white/5 rounded-lg p-3 space-y-3">
              <div className="flex gap-2">
                {(['tape', 'pot'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setMeasureMethod(m)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      measureMethod === m
                        ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400'
                        : 'border-white/10 text-brand-muted hover:text-brand-light'
                    }`}
                  >
                    {m === 'tape' ? 'Krejcovsky metr' : 'Metoda s hrncem'}
                  </button>
                ))}
              </div>

              {measureMethod === 'tape' ? (
                <div className="text-[10px] text-brand-muted leading-relaxed space-y-1.5">
                  <p>1. Vezmate krejcovsky metr a omotejte ho kolem hlavy.</p>
                  <p>2. Vedte ho tesne nad obocim a kolem nejsirsiho mista zadni casti hlavy.</p>
                  <p>3. Metr by mel byt tesny, ale ne pritazeny.</p>
                  <p>4. Odectete hodnotu v centimetrech.</p>
                </div>
              ) : (
                <div className="text-[10px] text-brand-muted leading-relaxed space-y-1.5">
                  <p className="font-bold text-cyan-400">Nemam krejcovsky metr - co ted?</p>
                  <p>1. Vezmente hrnec nebo misku, ktera vam sedne na hlavu.</p>
                  <p>2. Zmerdte obvod hrnce pravitkem nebo provazkem.</p>
                  <p>3. Obvod hrnce = priblizny VNEJSI obvod.</p>
                  <p>4. <span className="text-cyan-400 font-bold">Odectete 2-4 cm</span> pro ziskani obvodu hlavy (hrnec je vetsi nez hlava).</p>
                  <p className="italic text-brand-muted/70 pt-1">
                    Priklad: Hrnec ma obvod 62 cm. Odectu 3 cm presah = obvod hlavy cca 59 cm.
                  </p>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setShowSizeChart(!showSizeChart)}
            className="w-full flex items-center justify-between text-[10px] text-brand-muted hover:text-brand-light transition-colors"
          >
            <span className="font-bold uppercase tracking-wider">Tabulka velikosti</span>
            {showSizeChart ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {showSizeChart && (
            <div className="grid grid-cols-6 gap-1">
              {SIZE_CHART.map(s => (
                <button
                  key={s.label}
                  onClick={() => setHeadCircumference(s.circumference)}
                  className={`py-1.5 rounded text-center transition-all ${
                    headCircumference === s.circumference
                      ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-400'
                      : 'bg-brand-dark/50 border border-white/5 text-brand-muted hover:text-brand-light'
                  }`}
                >
                  <span className="block text-[10px] font-bold">{s.label}</span>
                  <span className="block text-[9px]">{s.range}</span>
                </button>
              ))}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-brand-muted mb-1.5 uppercase tracking-wider">
              Obvod hlavy (cm)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  value={headCircumference}
                  onChange={(e) => setHeadCircumference(Number(e.target.value))}
                  className="w-full bg-brand-dark border border-white/10 rounded-lg px-3 py-2 text-brand-light text-sm focus:border-cyan-500 focus:outline-none"
                  min={44}
                  max={70}
                />
                <span className="absolute right-3 top-2 text-brand-muted text-xs">cm</span>
              </div>
              <button
                onClick={calculateHelmetScale}
                className="px-3 py-2 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
                title="Vypocitat"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-brand-muted mb-1 uppercase tracking-wider">
                Stena (mm)
              </label>
              <input
                type="number"
                value={wallThickness}
                onChange={(e) => setWallThickness(Math.max(1, Number(e.target.value)))}
                className="w-full bg-brand-dark border border-white/10 rounded-lg px-3 py-1.5 text-brand-light text-sm focus:border-cyan-500 focus:outline-none"
                min={1}
                max={10}
                step={0.5}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-brand-muted mb-1 uppercase tracking-wider">
                Polstrovani (mm)
              </label>
              <input
                type="number"
                value={paddingThickness}
                onChange={(e) => setPaddingThickness(Math.max(0, Number(e.target.value)))}
                className="w-full bg-brand-dark border border-white/10 rounded-lg px-3 py-1.5 text-brand-light text-sm focus:border-cyan-500 focus:outline-none"
                min={0}
                max={20}
                step={1}
              />
            </div>
          </div>

          {suggestedScale && (
            <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-[10px] text-emerald-400 font-bold">Vypocitane meritko</span>
                  <span className="text-sm font-mono text-emerald-300">
                    {(suggestedScale * 100).toFixed(1)}%
                  </span>
                </div>
                <button
                  onClick={applyScale}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg"
                >
                  <Check className="w-3 h-3" /> Aplikovat
                </button>
              </div>

              {innerCircumference && (
                <div className="flex justify-between text-[10px] pt-1 border-t border-emerald-500/10">
                  <span className="text-brand-muted">Vnitrni obvod helmy:</span>
                  <span className="text-emerald-400 font-mono font-bold">{innerCircumference} cm</span>
                </div>
              )}

              <div className="flex justify-between text-[10px]">
                <span className="text-brand-muted">Cilovy obvod hlavy:</span>
                <span className="text-brand-light font-mono">{headCircumference} cm</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-brand-muted">Rezerva (polstrovani):</span>
                <span className="text-brand-light font-mono">{paddingThickness} mm</span>
              </div>
            </div>
          )}

          <div className="bg-brand-dark/50 border border-white/5 rounded-lg p-2.5 mt-1">
            <div className="flex items-center gap-1.5 mb-1">
              <Ruler className="w-3 h-3 text-brand-accent" />
              <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">
                Aktualni rozmery
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="block text-[9px] text-brand-muted">X</span>
                <span className="text-xs text-brand-light font-mono">{dims.x.toFixed(1)}</span>
              </div>
              <div>
                <span className="block text-[9px] text-brand-muted">Y</span>
                <span className="text-xs text-brand-light font-mono">{dims.y.toFixed(1)}</span>
              </div>
              <div>
                <span className="block text-[9px] text-brand-muted">Z</span>
                <span className="text-xs text-brand-light font-mono">{dims.z.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

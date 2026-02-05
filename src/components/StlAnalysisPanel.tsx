import { useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import {
  Ruler, Layers, Triangle, AlertTriangle, Scissors,
  ChevronDown, ChevronUp, Shield, Maximize2
} from 'lucide-react';
import {
  analyzeStlMesh,
  getSupportRecommendation,
  getDefaultSupportConfig,
  type StlAnalysis,
  type SupportConfig,
} from '../services/stlAnalyzer';

interface StlAnalysisPanelProps {
  mesh: THREE.Mesh;
  onScaleChange?: (scale: [number, number, number]) => void;
}

export function StlAnalysisPanel({ mesh, onScaleChange }: StlAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<StlAnalysis | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('dimensions');
  const [supportConfig, setSupportConfig] = useState<SupportConfig>(getDefaultSupportConfig());
  const [customScale, setCustomScale] = useState(100);

  useEffect(() => {
    if (mesh) {
      const result = analyzeStlMesh(mesh);
      setAnalysis(result);
    }
  }, [mesh]);

  const supportTips = useMemo(() => {
    if (!analysis) return [];
    return getSupportRecommendation(analysis);
  }, [analysis]);

  const toggleSection = (key: string) => {
    setExpandedSection(prev => prev === key ? null : key);
  };

  const handleScaleApply = () => {
    if (onScaleChange) {
      const factor = customScale / 100;
      onScaleChange([factor, factor, factor]);
    }
  };

  if (!analysis) {
    return (
      <div className="bg-brand-panel/90 backdrop-blur-md border border-white/10 rounded-xl p-4">
        <div className="flex items-center gap-2 text-brand-muted text-sm">
          <div className="w-4 h-4 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
          Analyzuji model...
        </div>
      </div>
    );
  }

  const difficultyColors = {
    easy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    hard: 'text-red-400 bg-red-500/10 border-red-500/20',
  };

  const difficultyLabels = {
    easy: 'Snadny',
    medium: 'Stredni',
    hard: 'Narocny',
  };

  return (
    <div className="space-y-3">
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold ${difficultyColors[analysis.printDifficulty]}`}>
        <Shield className="w-3.5 h-3.5" />
        Obtiznost tisku: {difficultyLabels[analysis.printDifficulty]}
      </div>

      <SectionHeader
        icon={<Ruler className="w-4 h-4 text-cyan-400" />}
        title="Rozmery & Meritko"
        sectionKey="dimensions"
        expanded={expandedSection === 'dimensions'}
        onToggle={toggleSection}
      >
        <div className="grid grid-cols-3 gap-2 mb-3">
          <DimBox label="Sirka (X)" value={`${analysis.dimensions.x.toFixed(1)} mm`} />
          <DimBox label="Vyska (Y)" value={`${analysis.dimensions.y.toFixed(1)} mm`} />
          <DimBox label="Hloubka (Z)" value={`${analysis.dimensions.z.toFixed(1)} mm`} />
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <DimBox label="Objem" value={`${analysis.volume.toFixed(1)} cm3`} />
          <DimBox label="Povrch" value={`${analysis.surfaceArea.toFixed(1)} cm2`} />
        </div>

        <div className="flex items-end gap-2 mt-3 pt-3 border-t border-white/5">
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-brand-muted mb-1 uppercase tracking-wider">Meritko (%)</label>
            <input
              type="number"
              value={customScale}
              onChange={(e) => setCustomScale(Math.max(1, Number(e.target.value)))}
              className="w-full bg-brand-dark border border-white/10 rounded-lg px-3 py-1.5 text-brand-light text-sm focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <button
            onClick={handleScaleApply}
            className="px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-lg text-xs font-bold hover:bg-cyan-500/30 transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </SectionHeader>

      <SectionHeader
        icon={<Triangle className="w-4 h-4 text-blue-400" />}
        title="Geometrie"
        sectionKey="geometry"
        expanded={expandedSection === 'geometry'}
        onToggle={toggleSection}
      >
        <div className="grid grid-cols-2 gap-2">
          <DimBox label="Trojuhelniky" value={analysis.triangleCount.toLocaleString()} />
          <DimBox label="Vrcholy" value={analysis.vertexCount.toLocaleString()} />
          <DimBox label="Vyplneni" value={`${(analysis.fillRatio * 100).toFixed(0)}%`} />
          <DimBox
            label="Kvalita"
            value={analysis.triangleCount < 10000 ? 'Low' : analysis.triangleCount < 50000 ? 'Medium' : 'High'}
          />
        </div>
      </SectionHeader>

      <SectionHeader
        icon={<Layers className="w-4 h-4 text-emerald-400" />}
        title="Doporuceni vrstvy"
        sectionKey="layer"
        expanded={expandedSection === 'layer'}
        onToggle={toggleSection}
      >
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-brand-muted">Minimalni</span>
            <span className="font-mono text-brand-light">{analysis.recommendedLayerHeight.min} mm</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-brand-muted font-bold">Optimalni</span>
            <span className="font-mono text-emerald-400 font-bold">{analysis.recommendedLayerHeight.optimal} mm</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-brand-muted">Maximalni</span>
            <span className="font-mono text-brand-light">{analysis.recommendedLayerHeight.max} mm</span>
          </div>

          <div className="mt-2 pt-2 border-t border-white/5">
            <div className="w-full h-2 bg-brand-dark rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all"
                style={{
                  width: `${((analysis.recommendedLayerHeight.optimal - 0.04) / (0.32 - 0.04)) * 100}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-brand-muted mt-1">
              <span>0.04 mm (detail)</span>
              <span>0.32 mm (rychlost)</span>
            </div>
          </div>

          <p className="text-[10px] text-brand-muted/70 mt-2 italic leading-relaxed">
            {analysis.dimensions.y > 200
              ? 'Velky model - vyssi vrstva (0.2-0.28mm) usetri cas bez vyrazne ztraty kvality.'
              : analysis.triangleCount > 50000
              ? 'Detailni model - nizsi vrstva (0.08-0.12mm) zachova jemne detaily.'
              : 'Standardni model - optimalni vrstva nabizi dobry kompromis mezi rychlosti a kvalitou.'}
          </p>
        </div>
      </SectionHeader>

      <SectionHeader
        icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
        title={`Previsy & Podpory (${analysis.overhangs.length})`}
        sectionKey="supports"
        expanded={expandedSection === 'supports'}
        onToggle={toggleSection}
      >
        {analysis.overhangs.length === 0 ? (
          <div className="text-xs text-emerald-400 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" />
            Zadne vyrazne previsy - podpory nejsou nutne.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2 text-[10px]">
              {analysis.overhangs.filter(o => o.severity === 'severe').length > 0 && (
                <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                  {analysis.overhangs.filter(o => o.severity === 'severe').length} kriticke
                </span>
              )}
              {analysis.overhangs.filter(o => o.severity === 'moderate').length > 0 && (
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {analysis.overhangs.filter(o => o.severity === 'moderate').length} stredni
                </span>
              )}
              {analysis.overhangs.filter(o => o.severity === 'mild').length > 0 && (
                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {analysis.overhangs.filter(o => o.severity === 'mild').length} mirne
                </span>
              )}
            </div>

            {analysis.estimatedSupportVolume > 0 && (
              <div className="text-xs text-brand-muted">
                Odhadovany objem podpor: <span className="text-brand-light font-mono">{analysis.estimatedSupportVolume.toFixed(1)} cm3</span>
              </div>
            )}

            <div className="space-y-2 pt-2 border-t border-white/5">
              <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Typ podpor</label>
              <div className="grid grid-cols-2 gap-2">
                {(['linear', 'tree'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setSupportConfig(prev => ({ ...prev, type }))}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      supportConfig.type === type
                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                        : 'border-white/10 text-brand-muted hover:text-brand-light'
                    }`}
                  >
                    {type === 'linear' ? 'Linearni' : 'Stromove'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Hustota</label>
              <div className="grid grid-cols-3 gap-2">
                {(['low', 'medium', 'high'] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setSupportConfig(prev => ({ ...prev, density: d }))}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      supportConfig.density === d
                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                        : 'border-white/10 text-brand-muted hover:text-brand-light'
                    }`}
                  >
                    {d === 'low' ? 'Nizka' : d === 'medium' ? 'Stredni' : 'Vysoka'}
                  </button>
                ))}
              </div>
            </div>

            {supportConfig.type === 'tree' && (
              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex justify-between text-xs">
                  <span className="text-brand-muted">Smery vetvi</span>
                  <span className="text-brand-light font-mono">{supportConfig.treeDirections}</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={8}
                  value={supportConfig.treeDirections}
                  onChange={(e) => setSupportConfig(prev => ({ ...prev, treeDirections: Number(e.target.value) }))}
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-xs">
                  <span className="text-brand-muted">Mezera mezi vetvemi</span>
                  <span className="text-brand-light font-mono">{supportConfig.branchGap} mm</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={5}
                  step={0.5}
                  value={supportConfig.branchGap}
                  onChange={(e) => setSupportConfig(prev => ({ ...prev, branchGap: Number(e.target.value) }))}
                  className="w-full accent-amber-500"
                />
                <p className="text-[10px] text-brand-muted/60 italic">
                  Stromove podpory rozdelene do {supportConfig.treeDirections} smeru s mezirou {supportConfig.branchGap}mm mezi vetvemi minimalizuji kontaktni plochu.
                </p>
              </div>
            )}

            <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-2.5 mt-2">
              <p className="text-[10px] font-bold text-amber-400 mb-1">Doporuceni:</p>
              <ul className="space-y-1">
                {supportTips.map((tip, i) => (
                  <li key={i} className="text-[10px] text-brand-muted leading-relaxed flex gap-1.5">
                    <span className="text-amber-500 mt-0.5 shrink-0">-</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </SectionHeader>

      {analysis.splitSuggestions.length > 0 && (
        <SectionHeader
          icon={<Scissors className="w-4 h-4 text-red-400" />}
          title={`Rozdeleni modelu (${analysis.splitSuggestions.length})`}
          sectionKey="split"
          expanded={expandedSection === 'split'}
          onToggle={toggleSection}
        >
          <div className="space-y-2">
            {analysis.splitSuggestions.map((s, i) => (
              <div key={i} className="bg-brand-dark/50 border border-white/5 rounded-lg p-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                    s.axis === 'x' ? 'bg-red-500/20 text-red-400' :
                    s.axis === 'y' ? 'bg-emerald-500/20 text-emerald-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {s.axis.toUpperCase()}
                  </span>
                  <span className="text-xs text-brand-light font-mono">
                    {s.position.toFixed(1)} mm
                  </span>
                </div>
                <p className="text-[10px] text-brand-muted leading-relaxed">{s.reason}</p>
              </div>
            ))}
            <p className="text-[10px] text-brand-muted/60 italic mt-2">
              Pro rozdeleni pouzijte slicer software (PrusaSlicer, Cura) s funkci "Cut" na navrhovanych pozicich.
            </p>
          </div>
        </SectionHeader>
      )}
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  sectionKey,
  expanded,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  sectionKey: string;
  expanded: boolean;
  onToggle: (key: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-brand-panel/90 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-xl">
      <button
        onClick={() => onToggle(sectionKey)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-light">
          {icon}
          {title}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-brand-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-brand-muted" />
        )}
      </button>
      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function DimBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-brand-dark/50 border border-white/5 rounded-lg px-2.5 py-1.5">
      <span className="block text-[10px] text-brand-muted uppercase tracking-wider">{label}</span>
      <span className="text-sm text-brand-light font-mono">{value}</span>
    </div>
  );
}

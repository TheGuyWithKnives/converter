import React, { useState, useEffect } from 'react';
import { Info, RefreshCw, Box, Ruler, Check } from 'lucide-react';
import * as THREE from 'three';

interface HelmetToolsProps {
  mesh: THREE.Mesh | null;
  onScaleChange?: (scale: [number, number, number]) => void;
}

export function HelmetTools({ mesh, onScaleChange }: HelmetToolsProps) {
  const [headCircumference, setHeadCircumference] = useState<number>(58); // Default 58cm
  const [dims, setDims] = useState({ x: 0, y: 0, z: 0 });
  const [isHelmetMode, setIsHelmetMode] = useState(false);
  const [suggestedScale, setSuggestedScale] = useState<number | null>(null);

  // Aktualizace rozměrů při změně meshe
  useEffect(() => {
    if (mesh) {
      updateDimensions();
    }
  }, [mesh]);

  const updateDimensions = () => {
    if (!mesh) return;
    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    // Převod na milimetry (předpokládáme základní jednotky)
    // Pokud je model v metrech, bude to malé, pokud v mm, bude to ok.
    // Zde zobrazujeme raw hodnoty z Three.js
    setDims({ x: size.x, y: size.y, z: size.z });
  };

  const calculateHelmetScale = () => {
    if (!mesh) return;

    // Matematika: Obvod = PI * Průměr
    // Cíl: Vnitřní obvod + vůle = Zadaný obvod
    // Vůle pro polstrování a pohodlí cca 2-3 cm na obvod
    const targetCircumference = headCircumference + 3; // +3cm rezerva
    const targetDiameter = targetCircumference / Math.PI; // v cm
    const targetDiameterMM = targetDiameter * 10; // v mm

    // Předpoklad: Model helmy je orientován tak, že X je šířka (od ucha k uchu)
    // A že vnější šířka je cca o 40mm větší než vnitřní (stěny helmy 2cm na každou stranu)
    // Toto je HRUBÝ ODHAD, pro přesnost by se musely měřit vnitřní vertexy
    
    // Získáme aktuální scale
    const currentScale = mesh.scale.x;
    // Získáme "raw" velikost modelu (velikost při scale 1)
    const rawWidth = dims.x / currentScale;

    // Kolik musí být finální vnější šířka?
    const requiredOuterWidth = targetDiameterMM + 40; // mm

    // Nový scale
    const newScale = requiredOuterWidth / rawWidth;
    
    setSuggestedScale(newScale);
  };

  const applyScale = () => {
    if (suggestedScale && onScaleChange) {
      onScaleChange([suggestedScale, suggestedScale, suggestedScale]);
      // Po chvilce aktualizujeme zobrazené rozměry
      setTimeout(updateDimensions, 100);
    }
  };

  if (!mesh) return null;

  return (
    <div className="bg-brand-panel border border-brand-light/10 rounded-xl p-4 mt-4 space-y-4 shadow-lg">
      <div className="flex items-center justify-between border-b border-brand-light/5 pb-2">
        <h3 className="text-brand-light font-bold font-spartan flex items-center gap-2">
          <Box className="w-4 h-4 text-blue-400" />
          Analýza & Tisk
        </h3>
        <button 
          onClick={() => setIsHelmetMode(!isHelmetMode)}
          className={`px-3 py-1 rounded text-xs font-bold uppercase transition-all ${
            isHelmetMode 
              ? 'bg-blue-500 text-white shadow-glow-blue' 
              : 'bg-brand-dark text-brand-muted hover:text-brand-light'
          }`}
        >
          {isHelmetMode ? 'Režim Helmy' : 'Aktivovat'}
        </button>
      </div>

      {/* Informace o rozměrech */}
      <div className="grid grid-cols-3 gap-2 text-xs font-mono bg-brand-dark/50 p-2 rounded-lg border border-brand-light/5">
        <div>
          <span className="block text-brand-muted">Šířka (X)</span>
          <span className="text-brand-light">{dims.x.toFixed(1)}</span>
        </div>
        <div>
          <span className="block text-brand-muted">Výška (Y)</span>
          <span className="text-brand-light">{dims.y.toFixed(1)}</span>
        </div>
        <div>
          <span className="block text-brand-muted">Hloubka (Z)</span>
          <span className="text-brand-light">{dims.z.toFixed(1)}</span>
        </div>
      </div>

      {/* HELMET WIZARD */}
      {isHelmetMode && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 pt-2">
          <div className="bg-blue-900/20 border border-blue-500/20 p-3 rounded-lg flex gap-3">
            <Info className="w-5 h-5 text-blue-400 shrink-0" />
            <div className="text-xs text-blue-200">
              <p className="font-bold mb-1">Kalkulátor velikosti helmy</p>
              <p className="opacity-80">Zadejte obvod hlavy. Systém automaticky připočítá rezervu pro polstrování a upraví měřítko modelu.</p>
            </div>
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-bold text-brand-muted mb-1 ml-1">Obvod hlavy (cm)</label>
              <div className="relative">
                <input 
                  type="number" 
                  value={headCircumference}
                  onChange={(e) => setHeadCircumference(Number(e.target.value))}
                  className="w-full bg-brand-dark border border-brand-light/10 rounded-lg px-3 py-2 text-brand-light focus:border-blue-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2 text-brand-muted text-sm">cm</span>
              </div>
            </div>
            
            <button 
              onClick={calculateHelmetScale}
              className="px-4 py-2 bg-brand-dark border border-brand-light/10 hover:border-blue-500 text-blue-400 rounded-lg transition-colors mb-[1px]"
              title="Vypočítat měřítko"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {suggestedScale && (
            <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 p-3 rounded-lg">
              <div className="text-xs text-green-400">
                <span className="block font-bold">Vypočítané měřítko:</span>
                {(suggestedScale * 100).toFixed(1)}% původní velikosti
              </div>
              <button 
                onClick={applyScale}
                className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs font-bold flex items-center gap-1 transition-colors shadow-lg"
              >
                <Check className="w-3 h-3" /> Aplikovat
              </button>
            </div>
          )}

          {/* Martinova poznámka o výšce vrstvy */}
          <div className="pt-2 border-t border-brand-light/5 mt-2">
             <div className="flex justify-between items-center text-xs">
                <span className="text-brand-muted">Doporučená výška vrstvy:</span>
                <span className="font-mono text-brand-accent font-bold">
                  {dims.y > 200 ? '0.20 - 0.28 mm' : '0.12 - 0.16 mm'}
                </span>
             </div>
             <p className="text-[10px] text-brand-muted/60 mt-1 italic">
               Pro větší modely (helmy) použijte větší trysku nebo vyšší vrstvu pro rychlejší tisk.
             </p>
          </div>
        </div>
      )}
    </div>
  );
}
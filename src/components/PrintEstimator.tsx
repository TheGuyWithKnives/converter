import React, { useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { 
  Clock, 
  Weight, 
  BadgeDollarSign, 
  Printer as PrinterIcon, 
  Box, 
  Layers, 
  Settings, 
  Plus, 
  Trash2, 
  X, 
  Calculator, 
  Cuboid,
  Zap,
  Loader2
} from 'lucide-react';

// Import služeb a typů
import { 
  MATERIALS as DEFAULT_MATERIALS, 
  PRINTERS as DEFAULT_PRINTERS, 
  calculateGeometryStats, 
  estimatePrint, 
  type Material, 
  type Printer,
  type GeometryStats
} from '../services/printCalculator';

import { 
  getCustomMaterials, 
  getCustomPrinters, 
  addCustomMaterial, 
  addCustomPrinter 
} from '../services/customPrintSettings';

// --- POMOCNÉ KOMPONENTY ---

const FloatingButton = ({ onClick }: { onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="fixed bottom-8 right-8 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg transition-all transform hover:scale-110 z-50 flex items-center justify-center group"
    title="Otevřít kalkulačku"
  >
    <Calculator className="w-8 h-8" />
    <span className="absolute right-full mr-3 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
      Kalkulačka tisku
    </span>
  </button>
);

const SettingsPanel = ({ 
  materials, 
  printers, 
  onAddMaterial, 
  onAddPrinter, 
  onClose 
}: {
  materials: Material[];
  printers: Printer[];
  onAddMaterial: (m: Omit<Material, 'id'>) => void;
  onAddPrinter: (p: Omit<Printer, 'id'>) => void;
  onClose: () => void;
}) => {
  const [newMat, setNewMat] = useState<Omit<Material, 'id'>>({ name: '', type: 'FDM', density: 1.24, pricePerKg: 450 });
  const [newPrn, setNewPrn] = useState<Omit<Printer, 'id'>>({ 
    name: '', type: 'FDM', power: 150, layerHeight: 0.2, nozzleDiameter: 0.4, volumetricSpeed: 6.0 
  });
  const [activeTab, setActiveTab] = useState<'materials' | 'printers'>('materials');

  const handleAddMat = () => {
    if(!newMat.name) return;
    onAddMaterial(newMat);
    setNewMat({ name: '', type: 'FDM', density: 1.24, pricePerKg: 450 });
  };

  const handleAddPrn = () => {
    if(!newPrn.name) return;
    onAddPrinter(newPrn);
    setNewPrn({ name: '', type: 'FDM', power: 150, layerHeight: 0.2, nozzleDiameter: 0.4, volumetricSpeed: 6.0 });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-700 pb-3">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" />
          <h3 className="text-white font-semibold text-lg">Správa Vlastních Dat</h3>
        </div>
        <button onClick={onClose} className="text-sm text-blue-400 hover:text-blue-300">Zpět ke kalkulačce</button>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setActiveTab('materials')} className={`flex-1 py-2 rounded text-sm font-medium ${activeTab === 'materials' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>Materiály</button>
        <button onClick={() => setActiveTab('printers')} className={`flex-1 py-2 rounded text-sm font-medium ${activeTab === 'printers' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>Tiskárny</button>
      </div>

      <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {activeTab === 'materials' ? (
          <div className="space-y-4">
            <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600 space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase">Přidat nový materiál</h4>
              <input type="text" placeholder="Název (např. Prusament PLA)" value={newMat.name} onChange={e => setNewMat({...newMat, name: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm" />
              <div className="grid grid-cols-3 gap-2">
                <select value={newMat.type} onChange={e => setNewMat({...newMat, type: e.target.value as 'FDM' | 'SLA'})} className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm">
                  <option value="FDM">FDM</option><option value="SLA">SLA</option>
                </select>
                <input type="number" placeholder="Hustota" value={newMat.density} onChange={e => setNewMat({...newMat, density: parseFloat(e.target.value)})} className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm" />
                <input type="number" placeholder="Cena Kč/kg" value={newMat.pricePerKg} onChange={e => setNewMat({...newMat, pricePerKg: parseFloat(e.target.value)})} className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm" />
              </div>
              <button onClick={handleAddMat} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1 rounded text-sm flex items-center justify-center gap-1"><Plus className="w-3 h-3" /> Přidat</button>
            </div>
            {materials.map(m => (
              <div key={m.id} className="flex justify-between items-center bg-slate-700 p-2 rounded border border-slate-600">
                <div>
                  <p className="text-white text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-slate-400">{m.type} | {m.density} g/cm³ | {m.pricePerKg} Kč</p>
                </div>
                <button className="text-slate-600 cursor-not-allowed p-1" title="Nelze smazat výchozí data"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600 space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase">Přidat novou tiskárnu</h4>
              <input type="text" placeholder="Název (např. MK4)" value={newPrn.name} onChange={e => setNewPrn({...newPrn, name: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <select value={newPrn.type} onChange={e => setNewPrn({...newPrn, type: e.target.value as 'FDM' | 'SLA'})} className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm">
                  <option value="FDM">FDM</option><option value="SLA">SLA</option>
                </select>
                <input type="number" placeholder="Příkon (W)" value={newPrn.power} onChange={e => setNewPrn({...newPrn, power: parseFloat(e.target.value)})} className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm" />
              </div>
              {newPrn.type === 'FDM' ? (
                 <input type="number" placeholder="Vol. Speed (cm³/h)" value={newPrn.volumetricSpeed} onChange={e => setNewPrn({...newPrn, volumetricSpeed: parseFloat(e.target.value)})} className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm" />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                     <input type="number" placeholder="Lift (s)" value={newPrn.liftTime} onChange={e => setNewPrn({...newPrn, liftTime: parseFloat(e.target.value)})} className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm" />
                     <input type="number" placeholder="Exposure (s)" value={newPrn.exposureTime} onChange={e => setNewPrn({...newPrn, exposureTime: parseFloat(e.target.value)})} className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm" />
                </div>
              )}
              <button onClick={handleAddPrn} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1 rounded text-sm flex items-center justify-center gap-1"><Plus className="w-3 h-3" /> Přidat</button>
            </div>
            {printers.map(p => (
              <div key={p.id} className="flex justify-between items-center bg-slate-700 p-2 rounded border border-slate-600">
                <div>
                  <p className="text-white text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.type} | {p.power}W</p>
                </div>
                <button className="text-slate-600 cursor-not-allowed p-1"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- HLAVNÍ KOMPONENTA ---

interface PrintEstimatorProps {
  modelUrl?: string | null;
}

export default function PrintEstimator({ modelUrl }: PrintEstimatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Stavy pro data
  const [materials, setMaterials] = useState<Material[]>(DEFAULT_MATERIALS);
  const [printers, setPrinters] = useState<Printer[]>(DEFAULT_PRINTERS);
  
  // Stavy pro výpočet
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>('');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [infill, setInfill] = useState(20);
  const [electricityPrice, setElectricityPrice] = useState(6.0);
  
  // Geometrie
  const [geoStats, setGeoStats] = useState<GeometryStats>({ volume: 50, surfaceArea: 150, modelHeight: 8 });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Načtení dat při startu
  useEffect(() => {
    async function loadData() {
      const customMaterials = await getCustomMaterials();
      const customPrinters = await getCustomPrinters();
      
      const allMaterials = [...DEFAULT_MATERIALS, ...customMaterials];
      const allPrinters = [...DEFAULT_PRINTERS, ...customPrinters];
      
      setMaterials(allMaterials);
      setPrinters(allPrinters);
      
      if (!selectedPrinterId && allPrinters.length > 0) setSelectedPrinterId(allPrinters[0].id);
      if (!selectedMaterialId && allMaterials.length > 0) setSelectedMaterialId(allMaterials[0].id);
    }
    loadData();
  }, []);

  // Automatická analýza modelu
  useEffect(() => {
    if (!modelUrl || !isOpen) return;

    setIsAnalyzing(true);
    const loader = new GLTFLoader();
    
    loader.load(
      modelUrl,
      (gltf) => {
        try {
          const stats = calculateGeometryStats(gltf.scene);
          if (stats.volume > 0) {
            setGeoStats(stats);
          }
        } catch (e) {
          console.error("Chyba při analýze geometrie:", e);
        } finally {
          setIsAnalyzing(false);
        }
      },
      undefined,
      (err) => {
        console.error("Nelze načíst model pro analýzu:", err);
        setIsAnalyzing(false);
      }
    );
  }, [modelUrl, isOpen]);

  const selectedPrinter = printers.find(p => p.id === selectedPrinterId) || printers[0];
  const availableMaterials = materials.filter(m => m.type === selectedPrinter?.type);
  
  useEffect(() => {
    const currentMat = materials.find(m => m.id === selectedMaterialId);
    if (!currentMat || currentMat.type !== selectedPrinter?.type) {
      if (availableMaterials.length > 0) {
        setSelectedMaterialId(availableMaterials[0].id);
      }
    }
  }, [selectedPrinter, materials, availableMaterials, selectedMaterialId]);

  const selectedMaterial = materials.find(m => m.id === selectedMaterialId) || availableMaterials[0] || materials[0];

  const handleAddMaterial = async (m: Omit<Material, 'id'>) => {
    const newMat = await addCustomMaterial(m);
    if (newMat) {
      setMaterials(prev => [...prev, newMat]);
      setSelectedMaterialId(newMat.id);
    }
  };

  const handleAddPrinter = async (p: Omit<Printer, 'id'>) => {
    const newPrn = await addCustomPrinter(p);
    if (newPrn) {
      setPrinters(prev => [...prev, newPrn]);
      setSelectedPrinterId(newPrn.id);
    }
  };

  const result = useMemo(() => {
    if (!selectedPrinter || !selectedMaterial) return null;

    const estimate = estimatePrint(geoStats, selectedPrinter, selectedMaterial, infill);
    
    const powerConsumptionW = selectedPrinter.power || (selectedPrinter.type === 'FDM' ? 150 : 60);
    const hours = estimate.printTime / 60;
    const energyKWh = (powerConsumptionW / 1000) * hours;
    const electricityCost = energyKWh * electricityPrice;

    return {
      ...estimate,
      electricityCost,
      totalCost: estimate.cost + electricityCost,
      hours: Math.floor(hours),
      minutes: Math.round(estimate.printTime % 60)
    };
  }, [geoStats, selectedPrinter, selectedMaterial, infill, electricityPrice]);

  if (!isOpen) return <FloatingButton onClick={() => setIsOpen(true)} />;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-800 w-full max-w-2xl rounded-xl shadow-2xl border border-slate-700 max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        <div className="p-6">
          
          {showSettings ? (
            <SettingsPanel 
              materials={materials} 
              printers={printers}
              onAddMaterial={handleAddMaterial}
              onAddPrinter={handleAddPrinter}
              onClose={() => setShowSettings(false)}
            />
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <PrinterIcon className="w-5 h-5 text-blue-400" />
                  <h3 className="text-white font-semibold text-lg">Kalkulace Tisku & Nákladů</h3>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowSettings(true)} className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors" title="Nastavení">
                    <Settings className="w-4 h-4" />
                  </button>
                  <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-white text-sm font-medium mb-2 flex items-center gap-2"><PrinterIcon className="w-4 h-4" /> Tiskárna</label>
                  <select value={selectedPrinterId} onChange={e => setSelectedPrinterId(e.target.value)} className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 border border-slate-600 focus:border-blue-500 focus:outline-none">
                    {printers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-white text-sm font-medium mb-2 flex items-center gap-2"><Box className="w-4 h-4" /> Materiál</label>
                  <select value={selectedMaterialId} onChange={e => setSelectedMaterialId(e.target.value)} className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 border border-slate-600 focus:border-blue-500 focus:outline-none">
                    {availableMaterials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>

              {selectedPrinter?.type === 'FDM' && (
                <div>
                  <label className="text-white text-sm font-medium mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2"><Layers className="w-4 h-4" /> Infill (Výplň)</span>
                    <span className="text-blue-400 font-bold">{infill}%</span>
                  </label>
                  <input type="range" min="0" max="100" step="5" value={infill} onChange={e => setInfill(parseInt(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                </div>
              )}

              <div className="bg-slate-700/50 rounded-lg p-4 space-y-3 border border-slate-600 relative">
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-slate-800/80 flex items-center justify-center rounded-lg z-10">
                    <div className="flex items-center gap-2 text-blue-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Analyzuji model...</span>
                    </div>
                  </div>
                )}
                
                <h4 className="text-white font-medium text-sm mb-3 border-b border-slate-600 pb-2 flex items-center gap-2">
                  <Cuboid className="w-4 h-4 text-blue-400" /> Statistiky Modelu
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-800 rounded p-2">
                    <label className="text-slate-400 text-xs mb-1 block">Objem (cm³)</label>
                    <input type="number" value={geoStats.volume.toFixed(2)} onChange={e => setGeoStats({...geoStats, volume: parseFloat(e.target.value)})} className="w-full bg-transparent text-white font-semibold border-b border-slate-600 focus:border-blue-500 outline-none" />
                  </div>
                  <div className="bg-slate-800 rounded p-2">
                    <label className="text-slate-400 text-xs mb-1 block">Plocha (cm²)</label>
                    <input type="number" value={geoStats.surfaceArea.toFixed(2)} onChange={e => setGeoStats({...geoStats, surfaceArea: parseFloat(e.target.value)})} className="w-full bg-transparent text-white font-semibold border-b border-slate-600 focus:border-blue-500 outline-none" />
                  </div>
                  <div className="bg-slate-800 rounded p-2">
                    <label className="text-slate-400 text-xs mb-1 block">Výška (cm)</label>
                    <input type="number" value={geoStats.modelHeight.toFixed(2)} onChange={e => setGeoStats({...geoStats, modelHeight: parseFloat(e.target.value)})} className="w-full bg-transparent text-white font-semibold border-b border-slate-600 focus:border-blue-500 outline-none" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="bg-slate-800 rounded p-2 flex items-center justify-between">
                        <label className="text-slate-400 text-xs flex items-center gap-1"><Zap className="w-3 h-3 text-yellow-500"/> Cena el. (Kč/kWh)</label>
                        <input type="number" step="0.1" value={electricityPrice} onChange={e => setElectricityPrice(parseFloat(e.target.value))} className="w-16 bg-transparent text-right text-white font-semibold border-b border-slate-600 focus:border-blue-500 outline-none text-sm" />
                    </div>
                </div>
              </div>

              {result && (
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-5 space-y-4 shadow-lg">
                  <h4 className="text-white font-semibold text-base mb-3 flex items-center gap-2">
                    <BadgeDollarSign className="w-5 h-5" />
                    Odhadované Náklady
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                      <Clock className="w-6 h-6 text-white mx-auto mb-2" />
                      <p className="text-blue-100 text-xs mb-1">Čas tisku</p>
                      <p className="text-white font-bold text-xl">{result.hours}h {result.minutes}m</p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                      <Weight className="w-6 h-6 text-white mx-auto mb-2" />
                      <p className="text-blue-100 text-xs mb-1">Váha materiálu</p>
                      <p className="text-white font-bold text-xl">{result.weight.toFixed(1)}g</p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center border-2 border-white/20">
                      <BadgeDollarSign className="w-6 h-6 text-white mx-auto mb-2" />
                      <p className="text-blue-100 text-xs mb-1">Celková Cena</p>
                      <p className="text-white font-bold text-xl">{result.totalCost.toFixed(0)} Kč</p>
                    </div>
                  </div>

                  <div className="flex justify-between text-xs text-blue-100 px-4 pt-2 border-t border-white/20">
                    <span>Materiál: {result.cost.toFixed(1)} Kč</span>
                    <span>Elektřina: {result.electricityCost.toFixed(1)} Kč</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
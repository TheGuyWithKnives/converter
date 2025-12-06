import { useState, useEffect, useMemo } from 'react';
import { Clock, Weight, DollarSign, Printer as PrinterIcon, Box, Layers, Settings } from 'lucide-react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import {
  MATERIALS,
  PRINTERS,
  calculateGeometryStats,
  estimatePrint,
  formatPrintTime,
  type Material,
  type Printer,
  type GeometryStats
} from '../services/printCalculator';
import { getCustomMaterials, getCustomPrinters } from '../services/customPrintSettings';
import { CustomMaterialForm } from './CustomMaterialForm';
import { CustomPrinterForm } from './CustomPrinterForm';

interface PrintEstimatorProps {
  modelUrl: string;
}

export function PrintEstimator({ modelUrl }: PrintEstimatorProps) {
  const [selectedPrinter, setSelectedPrinter] = useState<Printer>(PRINTERS[0]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material>(MATERIALS[0]);
  const [infillPercentage, setInfillPercentage] = useState<number>(20);
  const [geometryStats, setGeometryStats] = useState<GeometryStats | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showCustomSettings, setShowCustomSettings] = useState<boolean>(false);

  const [allMaterials, setAllMaterials] = useState<Material[]>(MATERIALS);
  const [allPrinters, setAllPrinters] = useState<Printer[]>(PRINTERS);

  useEffect(() => {
    loadCustomData();
  }, []);

  const loadCustomData = async () => {
    const customMaterials = await getCustomMaterials();
    const customPrinters = await getCustomPrinters();

    setAllMaterials([...MATERIALS, ...customMaterials]);
    setAllPrinters([...PRINTERS, ...customPrinters]);
  };

  const availableMaterials = useMemo(() => {
    return allMaterials.filter(m => m.type === selectedPrinter.type);
  }, [selectedPrinter, allMaterials]);

  useEffect(() => {
    if (availableMaterials.length > 0 && !availableMaterials.find(m => m.id === selectedMaterial.id)) {
      setSelectedMaterial(availableMaterials[0]);
    }
  }, [availableMaterials, selectedMaterial]);

  useEffect(() => {
    let cancelled = false;

    const calculateStats = async () => {
      if (!modelUrl) return;

      setIsCalculating(true);
      setError(null);

      try {
        const loader = new GLTFLoader();

        await new Promise<void>((resolve, reject) => {
          loader.load(
            modelUrl,
            (gltf) => {
              if (cancelled) return;

              try {
                const stats = calculateGeometryStats(gltf.scene);
                setGeometryStats(stats);
                resolve();
              } catch (err) {
                reject(err);
              }
            },
            undefined,
            (err) => reject(err)
          );
        });
      } catch (err) {
        if (!cancelled) {
          console.error('Error calculating geometry:', err);
          setError('Failed to analyze model geometry');
        }
      } finally {
        if (!cancelled) {
          setIsCalculating(false);
        }
      }
    };

    calculateStats();

    return () => {
      cancelled = true;
    };
  }, [modelUrl]);

  const estimate = useMemo(() => {
    if (!geometryStats) return null;

    try {
      return estimatePrint(geometryStats, selectedPrinter, selectedMaterial, infillPercentage);
    } catch (err) {
      console.error('Error estimating print:', err);
      return null;
    }
  }, [geometryStats, selectedPrinter, selectedMaterial, infillPercentage]);

  if (isCalculating) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 shadow-xl">
        <div className="flex items-center justify-center gap-3">
          <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white">Analyzing model geometry...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 shadow-xl">
        <div className="text-red-400 text-center">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (showCustomSettings) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 shadow-xl space-y-6 max-w-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 pb-3">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" />
            <h3 className="text-white font-semibold text-lg">Custom Settings</h3>
          </div>
          <button
            onClick={() => setShowCustomSettings(false)}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Back to Calculator
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-white font-medium mb-3">Materials</h4>
            <CustomMaterialForm
              onMaterialAdded={(material) => {
                setAllMaterials([...allMaterials, material]);
              }}
            />
          </div>

          <div>
            <h4 className="text-white font-medium mb-3">Printers</h4>
            <CustomPrinterForm
              onPrinterAdded={(printer) => {
                setAllPrinters([...allPrinters, printer]);
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-6 shadow-xl space-y-6 max-w-2xl">
      <div className="flex items-center justify-between border-b border-slate-700 pb-3">
        <div className="flex items-center gap-2">
          <PrinterIcon className="w-5 h-5 text-blue-400" />
          <h3 className="text-white font-semibold text-lg">Print Cost & Time Estimation</h3>
        </div>
        <button
          onClick={() => setShowCustomSettings(true)}
          className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          title="Custom Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-white text-sm font-medium mb-2 flex items-center gap-2">
            <PrinterIcon className="w-4 h-4" />
            Printer
          </label>
          <select
            value={selectedPrinter.id}
            onChange={(e) => {
              const printer = allPrinters.find(p => p.id === e.target.value);
              if (printer) setSelectedPrinter(printer);
            }}
            className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 border border-slate-600 focus:border-blue-500 focus:outline-none"
          >
            {allPrinters.map(printer => (
              <option key={printer.id} value={printer.id}>
                {printer.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-white text-sm font-medium mb-2 flex items-center gap-2">
            <Box className="w-4 h-4" />
            Material
          </label>
          <select
            value={selectedMaterial.id}
            onChange={(e) => {
              const material = availableMaterials.find(m => m.id === e.target.value);
              if (material) setSelectedMaterial(material);
            }}
            className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 border border-slate-600 focus:border-blue-500 focus:outline-none"
          >
            {availableMaterials.map(material => (
              <option key={material.id} value={material.id}>
                {material.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedPrinter.type === 'FDM' && (
        <div>
          <label className="text-white text-sm font-medium mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Infill Percentage
            </span>
            <span className="text-blue-400 font-bold">{infillPercentage}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={infillPercentage}
            onChange={(e) => setInfillPercentage(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      )}

      {geometryStats && (
        <div className="bg-slate-700 rounded-lg p-4 space-y-3">
          <h4 className="text-white font-medium text-sm mb-3 border-b border-slate-600 pb-2">
            Model Statistics
          </h4>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-slate-800 rounded p-3">
              <p className="text-slate-400 mb-1">Volume</p>
              <p className="text-white font-semibold">{geometryStats.volume.toFixed(2)} cm³</p>
            </div>
            <div className="bg-slate-800 rounded p-3">
              <p className="text-slate-400 mb-1">Surface Area</p>
              <p className="text-white font-semibold">{geometryStats.surfaceArea.toFixed(2)} cm²</p>
            </div>
            <div className="bg-slate-800 rounded p-3">
              <p className="text-slate-400 mb-1">Height</p>
              <p className="text-white font-semibold">{geometryStats.modelHeight.toFixed(2)} cm</p>
            </div>
          </div>
        </div>
      )}

      {estimate && (
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-5 space-y-4">
          <h4 className="text-white font-semibold text-base mb-3 flex items-center gap-2">
            <PrinterIcon className="w-5 h-5" />
            Estimated Results
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
              <Clock className="w-6 h-6 text-white mx-auto mb-2" />
              <p className="text-blue-100 text-xs mb-1">Print Time</p>
              <p className="text-white font-bold text-xl">{formatPrintTime(estimate.printTime)}</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
              <Weight className="w-6 h-6 text-white mx-auto mb-2" />
              <p className="text-blue-100 text-xs mb-1">Material Weight</p>
              <p className="text-white font-bold text-xl">{estimate.weight.toFixed(1)}g</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
              <DollarSign className="w-6 h-6 text-white mx-auto mb-2" />
              <p className="text-blue-100 text-xs mb-1">Material Cost</p>
              <p className="text-white font-bold text-xl">{estimate.cost.toFixed(0)} Kč</p>
            </div>
          </div>

          <div className="text-xs text-blue-100 text-center pt-2 border-t border-white/20">
            Estimates are approximate and may vary based on actual print settings
          </div>
        </div>
      )}
    </div>
  );
}

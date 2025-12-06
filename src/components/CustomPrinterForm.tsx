import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { addCustomPrinter } from '../services/customPrintSettings';
import type { Printer } from '../services/printCalculator';

interface CustomPrinterFormProps {
  onPrinterAdded: (printer: Printer) => void;
}

export function CustomPrinterForm({ onPrinterAdded }: CustomPrinterFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'FDM' as 'FDM' | 'SLA',
    speedMultiplier: '1.0',
    layerHeight: '0.2',
    nozzleDiameter: '0.04',
    volumetricSpeed: '6.0',
    exposureTime: '2.5',
    liftTime: '4.0'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const printerData: Omit<Printer, 'id'> = {
      name: formData.name,
      type: formData.type,
      speedMultiplier: parseFloat(formData.speedMultiplier),
      layerHeight: parseFloat(formData.layerHeight)
    };

    if (formData.type === 'FDM') {
      printerData.nozzleDiameter = parseFloat(formData.nozzleDiameter);
      printerData.volumetricSpeed = parseFloat(formData.volumetricSpeed);
    } else {
      printerData.exposureTime = parseFloat(formData.exposureTime);
      printerData.liftTime = parseFloat(formData.liftTime);
    }

    const printer = await addCustomPrinter(printerData);

    setIsSubmitting(false);

    if (printer) {
      onPrinterAdded(printer);
      setShowForm(false);
      setFormData({
        name: '',
        type: 'FDM',
        speedMultiplier: '1.0',
        layerHeight: '0.2',
        nozzleDiameter: '0.04',
        volumetricSpeed: '6.0',
        exposureTime: '2.5',
        liftTime: '4.0'
      });
    }
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="w-full py-2 px-3 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
      >
        <Plus className="w-4 h-4" />
        Add Custom Printer
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-white font-medium text-sm">Add Custom Printer</h4>
        <button
          type="button"
          onClick={() => setShowForm(false)}
          className="text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <label className="text-white text-xs mb-1 block">Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="e.g., My Ender 3 Pro"
          className="w-full bg-slate-600 text-white rounded px-3 py-2 text-sm border border-slate-500 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="text-white text-xs mb-1 block">Type</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value as 'FDM' | 'SLA' })}
          className="w-full bg-slate-600 text-white rounded px-3 py-2 text-sm border border-slate-500 focus:border-blue-500 focus:outline-none"
        >
          <option value="FDM">FDM</option>
          <option value="SLA">SLA</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-white text-xs mb-1 block">Speed Multiplier</label>
          <input
            type="number"
            step="0.1"
            value={formData.speedMultiplier}
            onChange={(e) => setFormData({ ...formData, speedMultiplier: e.target.value })}
            required
            className="w-full bg-slate-600 text-white rounded px-3 py-2 text-sm border border-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-white text-xs mb-1 block">Layer Height (cm)</label>
          <input
            type="number"
            step="0.01"
            value={formData.layerHeight}
            onChange={(e) => setFormData({ ...formData, layerHeight: e.target.value })}
            required
            className="w-full bg-slate-600 text-white rounded px-3 py-2 text-sm border border-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {formData.type === 'FDM' ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-white text-xs mb-1 block">Nozzle Ø (cm)</label>
            <input
              type="number"
              step="0.01"
              value={formData.nozzleDiameter}
              onChange={(e) => setFormData({ ...formData, nozzleDiameter: e.target.value })}
              required
              className="w-full bg-slate-600 text-white rounded px-3 py-2 text-sm border border-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-white text-xs mb-1 block">Vol. Speed (cm³/h)</label>
            <input
              type="number"
              step="0.1"
              value={formData.volumetricSpeed}
              onChange={(e) => setFormData({ ...formData, volumetricSpeed: e.target.value })}
              required
              className="w-full bg-slate-600 text-white rounded px-3 py-2 text-sm border border-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-white text-xs mb-1 block">Exposure (s)</label>
            <input
              type="number"
              step="0.1"
              value={formData.exposureTime}
              onChange={(e) => setFormData({ ...formData, exposureTime: e.target.value })}
              required
              className="w-full bg-slate-600 text-white rounded px-3 py-2 text-sm border border-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-white text-xs mb-1 block">Lift Time (s)</label>
            <input
              type="number"
              step="0.1"
              value={formData.liftTime}
              onChange={(e) => setFormData({ ...formData, liftTime: e.target.value })}
              required
              className="w-full bg-slate-600 text-white rounded px-3 py-2 text-sm border border-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg transition-colors text-sm"
      >
        {isSubmitting ? 'Adding...' : 'Add Printer'}
      </button>
    </form>
  );
}

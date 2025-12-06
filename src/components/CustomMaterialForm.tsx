import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { addCustomMaterial } from '../services/customPrintSettings';
import type { Material } from '../services/printCalculator';

interface CustomMaterialFormProps {
  onMaterialAdded: (material: Material) => void;
}

export function CustomMaterialForm({ onMaterialAdded }: CustomMaterialFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    density: '1.24',
    pricePerKg: '450',
    type: 'FDM' as 'FDM' | 'SLA'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const material = await addCustomMaterial({
      name: formData.name,
      density: parseFloat(formData.density),
      pricePerKg: parseFloat(formData.pricePerKg),
      type: formData.type
    });

    setIsSubmitting(false);

    if (material) {
      onMaterialAdded(material);
      setShowForm(false);
      setFormData({
        name: '',
        density: '1.24',
        pricePerKg: '450',
        type: 'FDM'
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
        Add Custom Material
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-white font-medium text-sm">Add Custom Material</h4>
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
          placeholder="e.g., My Custom PLA"
          className="w-full bg-slate-600 text-white rounded px-3 py-2 text-sm border border-slate-500 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-white text-xs mb-1 block">Density (g/cm³)</label>
          <input
            type="number"
            step="0.01"
            value={formData.density}
            onChange={(e) => setFormData({ ...formData, density: e.target.value })}
            required
            className="w-full bg-slate-600 text-white rounded px-3 py-2 text-sm border border-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-white text-xs mb-1 block">Price (Kč/kg)</label>
          <input
            type="number"
            step="1"
            value={formData.pricePerKg}
            onChange={(e) => setFormData({ ...formData, pricePerKg: e.target.value })}
            required
            className="w-full bg-slate-600 text-white rounded px-3 py-2 text-sm border border-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
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

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg transition-colors text-sm"
      >
        {isSubmitting ? 'Adding...' : 'Add Material'}
      </button>
    </form>
  );
}

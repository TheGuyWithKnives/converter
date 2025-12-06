import { Material, Printer } from './printCalculator';

// Klíče pro LocalStorage
const STORAGE_KEYS = {
  MATERIALS: 'calc_custom_materials',
  PRINTERS: 'calc_custom_printers'
};

// --- MATERIÁLY ---

export async function getCustomMaterials(): Promise<Material[]> {
  // Simulace asynchronního volání (pro budoucí kompatibilitu s API/Supabase)
  return new Promise((resolve) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.MATERIALS);
      if (stored) {
        resolve(JSON.parse(stored));
      } else {
        resolve([]);
      }
    } catch (e) {
      console.warn('LocalStorage error:', e);
      resolve([]);
    }
  });
}

export async function addCustomMaterial(material: Omit<Material, 'id'>): Promise<Material | null> {
  return new Promise((resolve) => {
    try {
      const newMaterial: Material = {
        ...material,
        id: `custom_mat_${Date.now()}`
      };
      
      const stored = localStorage.getItem(STORAGE_KEYS.MATERIALS);
      const current = stored ? JSON.parse(stored) : [];
      const updated = [...current, newMaterial];
      
      localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(updated));
      resolve(newMaterial);
    } catch (e) {
      console.error('Failed to add material:', e);
      resolve(null);
    }
  });
}

// --- TISKÁRNY ---

export async function getCustomPrinters(): Promise<Printer[]> {
  return new Promise((resolve) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PRINTERS);
      if (stored) {
        resolve(JSON.parse(stored));
      } else {
        resolve([]);
      }
    } catch (e) {
      resolve([]);
    }
  });
}

export async function addCustomPrinter(printer: Omit<Printer, 'id'>): Promise<Printer | null> {
  return new Promise((resolve) => {
    try {
      const newPrinter: Printer = {
        ...printer,
        id: `custom_prn_${Date.now()}`
      };
      
      const stored = localStorage.getItem(STORAGE_KEYS.PRINTERS);
      const current = stored ? JSON.parse(stored) : [];
      const updated = [...current, newPrinter];
      
      localStorage.setItem(STORAGE_KEYS.PRINTERS, JSON.stringify(updated));
      resolve(newPrinter);
    } catch (e) {
      console.error('Failed to add printer:', e);
      resolve(null);
    }
  });
}
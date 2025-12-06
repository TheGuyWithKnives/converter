import { supabase } from './supabaseClient';
import type { Material, Printer } from './printCalculator';

interface CustomMaterialRow {
  id: string;
  name: string;
  density: number;
  price_per_kg: number;
  type: 'FDM' | 'SLA';
  created_at: string;
}

interface CustomPrinterRow {
  id: string;
  name: string;
  type: 'FDM' | 'SLA';
  speed_multiplier: number;
  layer_height: number;
  nozzle_diameter: number | null;
  volumetric_speed: number | null;
  exposure_time: number | null;
  lift_time: number | null;
  created_at: string;
}

export async function getCustomMaterials(): Promise<Material[]> {
  const { data, error } = await supabase
    .from('custom_materials')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching custom materials:', error);
    return [];
  }

  return (data as CustomMaterialRow[]).map(row => ({
    id: `custom-${row.id}`,
    name: row.name,
    density: row.density,
    pricePerKg: row.price_per_kg,
    type: row.type
  }));
}

export async function getCustomPrinters(): Promise<Printer[]> {
  const { data, error } = await supabase
    .from('custom_printers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching custom printers:', error);
    return [];
  }

  return (data as CustomPrinterRow[]).map(row => ({
    id: `custom-${row.id}`,
    name: row.name,
    type: row.type,
    speedMultiplier: row.speed_multiplier,
    layerHeight: row.layer_height,
    nozzleDiameter: row.nozzle_diameter ?? undefined,
    volumetricSpeed: row.volumetric_speed ?? undefined,
    exposureTime: row.exposure_time ?? undefined,
    liftTime: row.lift_time ?? undefined
  }));
}

export async function addCustomMaterial(material: Omit<Material, 'id'>): Promise<Material | null> {
  const { data, error } = await supabase
    .from('custom_materials')
    .insert({
      name: material.name,
      density: material.density,
      price_per_kg: material.pricePerKg,
      type: material.type
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error adding custom material:', error);
    return null;
  }

  if (!data) return null;

  const row = data as CustomMaterialRow;
  return {
    id: `custom-${row.id}`,
    name: row.name,
    density: row.density,
    pricePerKg: row.price_per_kg,
    type: row.type
  };
}

export async function addCustomPrinter(printer: Omit<Printer, 'id'>): Promise<Printer | null> {
  const { data, error } = await supabase
    .from('custom_printers')
    .insert({
      name: printer.name,
      type: printer.type,
      speed_multiplier: printer.speedMultiplier,
      layer_height: printer.layerHeight,
      nozzle_diameter: printer.nozzleDiameter ?? null,
      volumetric_speed: printer.volumetricSpeed ?? null,
      exposure_time: printer.exposureTime ?? null,
      lift_time: printer.liftTime ?? null
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error adding custom printer:', error);
    return null;
  }

  if (!data) return null;

  const row = data as CustomPrinterRow;
  return {
    id: `custom-${row.id}`,
    name: row.name,
    type: row.type,
    speedMultiplier: row.speed_multiplier,
    layerHeight: row.layer_height,
    nozzleDiameter: row.nozzle_diameter ?? undefined,
    volumetricSpeed: row.volumetric_speed ?? undefined,
    exposureTime: row.exposure_time ?? undefined,
    liftTime: row.lift_time ?? undefined
  };
}

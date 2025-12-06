import * as THREE from 'three';

// --- TYPY ---

export interface Material {
  id: string;
  name: string;
  type: 'FDM' | 'SLA';
  density: number; // g/cm3
  pricePerKg: number; // CZK
}

export interface Printer {
  id: string;
  name: string;
  type: 'FDM' | 'SLA';
  // FDM specific
  nozzleDiameter?: number; // mm
  layerHeight?: number; // mm
  speedMultiplier?: number;
  volumetricSpeed?: number; // cm3/h - zjednodušený parametr pro rychlost
  // SLA specific
  exposureTime?: number; // s
  liftTime?: number; // s
  // Power
  power?: number; // Watts
}

export interface GeometryStats {
  volume: number; // cm3
  surfaceArea: number; // cm2
  modelHeight: number; // cm
}

export interface PrintEstimate {
  printTime: number; // minutes
  weight: number; // g
  cost: number; // CZK
}

// --- VÝCHOZÍ DATA ---

export const MATERIALS: Material[] = [
  { id: 'mat_pla', name: 'PLA (Generic)', type: 'FDM', density: 1.24, pricePerKg: 450 },
  { id: 'mat_petg', name: 'PETG (Generic)', type: 'FDM', density: 1.27, pricePerKg: 500 },
  { id: 'mat_abs', name: 'ABS (Generic)', type: 'FDM', density: 1.04, pricePerKg: 550 },
  { id: 'mat_tpu', name: 'TPU (Flex)', type: 'FDM', density: 1.21, pricePerKg: 850 },
  { id: 'mat_resin_std', name: 'Standard Resin', type: 'SLA', density: 1.10, pricePerKg: 800 },
  { id: 'mat_resin_tough', name: 'Tough Resin', type: 'SLA', density: 1.15, pricePerKg: 1200 },
];

export const PRINTERS: Printer[] = [
  { 
    id: 'prn_ender3', 
    name: 'Standard FDM (Ender 3)', 
    type: 'FDM', 
    nozzleDiameter: 0.4, 
    layerHeight: 0.2, 
    volumetricSpeed: 6.0, // Conservative ~6 cm3/h
    power: 150 
  },
  { 
    id: 'prn_bambu', 
    name: 'Fast FDM (Bambu/Voron)', 
    type: 'FDM', 
    nozzleDiameter: 0.4, 
    layerHeight: 0.2, 
    volumetricSpeed: 20.0, // Fast ~20 cm3/h
    power: 300 
  },
  { 
    id: 'prn_sla_mars', 
    name: 'Standard SLA (Mars/Photon)', 
    type: 'SLA', 
    exposureTime: 2.5, 
    liftTime: 4.0,
    layerHeight: 0.05,
    power: 60 
  },
];

// --- LOGIKA VÝPOČTŮ ---

export function calculateGeometryStats(scene: THREE.Object3D): GeometryStats {
  let volume = 0;
  let area = 0;
  
  // Bounding box pro výšku
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  box.getSize(size);
  
  // Převod jednotek: Three.js jednotky jsou obvykle metry nebo libovolné. 
  // Zde předpokládáme, že model je v měřítku, kde 1 jednotka = 1 mm nebo 1 cm?
  // Většina 3D tiskových GLB souborů je v metrech (standard glTF) nebo milimetrech.
  // Pro účely kalkulace budeme předpokládat převod na cm.
  // Pokud je model malý (< 1), je pravděpodobně v metrech -> převést na cm (* 100).
  // Pokud je model velký (> 10), je pravděpodobně v mm -> převést na cm (/ 10).
  
  let scaleFactor = 1.0;
  const maxDim = Math.max(size.x, size.y, size.z);
  
  if (maxDim < 2.0) {
    scaleFactor = 100.0; // Metry na cm
  } else if (maxDim > 50.0) {
    scaleFactor = 0.1; // mm na cm
  }
  
  // Procházení meshů pro výpočet objemu a plochy
  // Poznámka: Přesný výpočet objemu uzavřeného meshe je složitý (signed volume).
  // Zde použijeme aproximaci pomocí bounding boxu a faktoru zaplnění pro hrubý odhad,
  // protože přesný výpočet na klientovi může být náročný.
  // Pro přesnější výsledek bychom museli iterovat přes geometrii (geometry.index).
  
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const geometry = mesh.geometry;
      
      if (geometry) {
        // Výpočet povrchu
        if (!geometry.getAttribute('position')) return;
        
        // Jednoduchý odhad plochy z bounding boxu geometrie, pokud index chybí,
        // nebo použití utils, pokud jsou dostupné. 
        // Pro jednoduchost zde použijeme škálovaný odhad z bounding boxu
        // (V reálné aplikaci by se použil geometryUtils nebo iterace trojúhelníků)
        
        // Zde použijeme bounding box aproximaci pro demo:
        geometry.computeBoundingBox();
        if (geometry.boundingBox) {
          const s = new THREE.Vector3();
          geometry.boundingBox.getSize(s);
          const partVol = (s.x * scaleFactor) * (s.y * scaleFactor) * (s.z * scaleFactor);
          // Předpokládáme, že model není plná kostka, ale organický tvar -> cca 40% objemu boxu
          volume += partVol * 0.4; 
          
          const partArea = 2 * (s.x*s.y + s.x*s.z + s.y*s.z) * (scaleFactor * scaleFactor);
          area += partArea * 0.6;
        }
      }
    }
  });

  return {
    volume: Math.max(volume, 1), // Minimálně 1 cm3
    surfaceArea: Math.max(area, 10),
    modelHeight: size.y * scaleFactor
  };
}

export function estimatePrint(
  stats: GeometryStats, 
  printer: Printer, 
  material: Material, 
  infillPercentage: number // 0-100
): PrintEstimate {
  const infillDec = infillPercentage / 100;
  let totalVolume = 0;
  let printTimeMinutes = 0;

  if (printer.type === 'FDM') {
    // --- FDM VÝPOČET ---
    const nozzle = printer.nozzleDiameter || 0.4;
    // Převod mm na cm: 0.4mm = 0.04cm
    const nozzleCm = nozzle / 10;
    
    // Objem stěn (Shells): Předpokládáme 3 stěny
    const shellThickness = 3 * nozzleCm;
    let shellVolume = stats.surfaceArea * shellThickness;
    
    // Korekce, aby stěny nebyly větší než objem
    if (shellVolume > stats.volume) shellVolume = stats.volume;
    
    const interiorVolume = stats.volume - shellVolume;
    const infillVolume = interiorVolume * infillDec;
    
    totalVolume = shellVolume + infillVolume;
    
    // Čas: Objem / Rychlost průtoku
    const speed = printer.volumetricSpeed || 6.0; // cm3/h
    const extrusionTimeHours = totalVolume / speed;
    
    // Čas na pohyb Z (vrstvy)
    const layerH = (printer.layerHeight || 0.2) / 10; // cm
    const layers = stats.modelHeight / layerH;
    const movementTimeHours = (layers * 3) / 3600; // 3 sekundy na vrstvu penalizace
    
    printTimeMinutes = (extrusionTimeHours + movementTimeHours) * 60 + 10; // +10 min warmup
    
  } else {
    // --- SLA VÝPOČET ---
    // U SLA je objem dán modelem (pokud je dutý, měl by to reflektovat vstupní model, nebo infill=100)
    totalVolume = stats.volume * (infillDec > 0.9 ? 1 : infillDec); // SLA modely jsou často plné nebo duté s dírami
    
    const layerH = (printer.layerHeight || 0.05) / 10; // cm
    const layers = stats.modelHeight / layerH;
    
    const exposure = printer.exposureTime || 2.5; // s
    const lift = printer.liftTime || 4.0; // s
    const timePerLayer = exposure + lift;
    
    printTimeMinutes = ((layers * timePerLayer) / 60) + 15; // +15 min base layers & setup
  }

  const weight = totalVolume * material.density;
  const cost = (weight / 1000) * material.pricePerKg;

  return {
    printTime: printTimeMinutes,
    weight: weight,
    cost: cost
  };
}
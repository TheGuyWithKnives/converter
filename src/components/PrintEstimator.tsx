<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>3D Print Calculator</title>
    
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- React & ReactDOM -->
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    
    <!-- Babel (pro JSX) -->
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

    <style>
        body { background-color: #f8fafc; }
        /* Animace pro modal */
        .fade-in { animation: fadeIn 0.2s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        
        /* Custom scrollbar pro tmavý režim */
        .dark-scroll::-webkit-scrollbar { width: 8px; }
        .dark-scroll::-webkit-scrollbar-track { background: #1e293b; }
        .dark-scroll::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }
        .dark-scroll::-webkit-scrollbar-thumb:hover { background: #64748b; }
    </style>
</head>
<body>

    <div id="root"></div>

    <script type="text/babel">
        const { useState, useEffect, useMemo } = React;

        // --- 1. DEFINICE IKON (INLINED) ---
        // Vloženo přímo pro odstranění závislosti na externím skriptu Lucide a vyřešení chyb s typy.
        const ICON_DEFS = {
            Calculator: ['svg', { "xmlns": "http://www.w3.org/2000/svg", "width": "24", "height": "24", "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, [
                ['rect', { "width": "16", "height": "20", "x": "4", "y": "2", "rx": "2" }],
                ['line', { "x1": "8", "x2": "16", "y1": "6", "y2": "6" }],
                ['line', { "x1": "16", "x2": "16", "y1": "14", "y2": "18" }],
                ['path', { "d": "M16 10h.01" }],
                ['path', { "d": "M12 10h.01" }],
                ['path', { "d": "M8 10h.01" }],
                ['path', { "d": "M12 14h.01" }],
                ['path', { "d": "M8 14h.01" }],
                ['path', { "d": "M12 18h.01" }],
                ['path', { "d": "M8 18h.01" }]
            ]],
            Printer: ['svg', { "xmlns": "http://www.w3.org/2000/svg", "width": "24", "height": "24", "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, [
                ['polyline', { "points": "6 9 6 2 18 2 18 9" }],
                ['path', { "d": "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" }],
                ['rect', { "width": "12", "height": "8", "x": "6", "y": "14" }]
            ]],
            Box: ['svg', { "xmlns": "http://www.w3.org/2000/svg", "width": "24", "height": "24", "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, [
                ['path', { "d": "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" }],
                ['path', { "d": "m3.3 7 8.7 5 8.7-5" }],
                ['path', { "d": "M12 22V12" }]
            ]],
            Layers: ['svg', { "xmlns": "http://www.w3.org/2000/svg", "width": "24", "height": "24", "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, [
                ['path', { "d": "m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" }],
                ['path', { "d": "m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" }],
                ['path', { "d": "m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" }]
            ]],
            Settings: ['svg', { "xmlns": "http://www.w3.org/2000/svg", "width": "24", "height": "24", "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, [
                ['path', { "d": "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.39a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" }],
                ['circle', { "cx": "12", "cy": "12", "r": "3" }]
            ]],
            Plus: ['svg', { "xmlns": "http://www.w3.org/2000/svg", "width": "24", "height": "24", "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, [
                ['path', { "d": "M5 12h14" }],
                ['path', { "d": "M12 5v14" }]
            ]],
            Trash2: ['svg', { "xmlns": "http://www.w3.org/2000/svg", "width": "24", "height": "24", "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, [
                ['path', { "d": "M3 6h18" }],
                ['path', { "d": "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" }],
                ['path', { "d": "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }],
                ['line', { "x1": "10", "x2": "10", "y1": "11", "y2": "17" }],
                ['line', { "x1": "14", "x2": "14", "y1": "11", "y2": "17" }]
            ]],
            X: ['svg', { "xmlns": "http://www.w3.org/2000/svg", "width": "24", "height": "24", "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, [
                ['path', { "d": "M18 6 6 18" }],
                ['path', { "d": "m6 6 12 12" }]
            ]],
            Cuboid: ['svg', { "xmlns": "http://www.w3.org/2000/svg", "width": "24", "height": "24", "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, [
                ['path', { "d": "m21.12 6.4-6.05-4.06a2 2 0 0 0-2.17-.05L2.95 8.41a2 2 0 0 0-.95 1.7v5.82a2 2 0 0 0 .88 1.66l6.05 4.07a2 2 0 0 0 2.17.05l9.95-6.12a2 2 0 0 0 .95-1.7V8.06a2 2 0 0 0-.88-1.66Z" }],
                ['path', { "d": "M10 22v-8" }],
                ['path', { "d": "M10 14l11.38-6.78" }],
                ['path', { "d": "M10 14L2.95 8.41" }]
            ]],
            Clock: ['svg', { "xmlns": "http://www.w3.org/2000/svg", "width": "24", "height": "24", "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, [
                ['circle', { "cx": "12", "cy": "12", "r": "10" }],
                ['polyline', { "points": "12 6 12 12 16 14" }]
            ]],
            Weight: ['svg', { "xmlns": "http://www.w3.org/2000/svg", "width": "24", "height": "24", "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, [
                ['circle', { "cx": "12", "cy": "5", "r": "3" }],
                ['path', { "d": "M6.5 8h11a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z" }],
                ['path', { "d": "M6 19h12" }]
            ]],
            BadgeDollarSign: ['svg', { "xmlns": "http://www.w3.org/2000/svg", "width": "24", "height": "24", "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, [
               ['circle', { "cx": "12", "cy": "12", "r": "10" }],
               ['path', { "d": "M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" }],
               ['path', { "d": "M12 18V6" }]
            ]]
        };

        // --- 2. KOMPONENTA PRO IKONY ---
        
        const createLucideComponent = (name, iconDef) => {
            return ({ color = "currentColor", size = 24, strokeWidth = 2, className, ...props }) => {
                const tag = iconDef[0];
                const attrs = iconDef[1];
                const children = iconDef[2];
                
                // Atributy na camelCase
                const toCamelCase = (str) => str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                
                const processAttrs = (a) => {
                    const res = {};
                    Object.keys(a || {}).forEach(key => {
                        if (key === 'class') return; 
                        res[toCamelCase(key)] = a[key];
                    });
                    return res;
                };

                const defaultAttrs = {
                    ...processAttrs(attrs),
                    width: size,
                    height: size,
                    stroke: color,
                    strokeWidth: strokeWidth,
                    ...props,
                    className: `lucide lucide-${name.toLowerCase()} ${className || ''}`.trim()
                };

                return React.createElement(
                    tag,
                    defaultAttrs,
                    children.map((child, index) => {
                        const childTag = child[0];
                        const childAttrs = child[1];
                        return React.createElement(childTag, { 
                            ...processAttrs(childAttrs), 
                            key: index 
                        });
                    })
                );
            };
        };

        // Vytvoření komponent ikon
        const Icons = {};
        Object.keys(ICON_DEFS).forEach(name => {
            Icons[name] = createLucideComponent(name, ICON_DEFS[name]);
        });
        
        // Destrukturalizace pro použití v kódu
        const { Clock, Weight, BadgeDollarSign, Printer, Box, Layers, Settings, Plus, Trash2, X, Calculator, Cuboid } = Icons;


        // --- 3. DATOVÉ STRUKTURY ---
        
        const DEFAULT_MATERIALS = [
            { id: 'mat_1', name: 'PLA (Generic)', type: 'FDM', density: 1.24, price: 450 },
            { id: 'mat_2', name: 'PETG (Generic)', type: 'FDM', density: 1.27, price: 500 },
            { id: 'mat_3', name: 'ABS (Generic)', type: 'FDM', density: 1.04, price: 550 },
            { id: 'mat_4', name: 'TPU (Flex)', type: 'FDM', density: 1.21, price: 850 },
            { id: 'mat_5', name: 'Standard Resin', type: 'SLA', density: 1.10, price: 800 },
            { id: 'mat_6', name: 'Tough Resin', type: 'SLA', density: 1.15, price: 1200 },
        ];

        const DEFAULT_PRINTERS = [
            { id: 'prn_1', name: 'Standard FDM (Ender 3)', type: 'FDM', speedBase: 6.0, power: 150 },
            { id: 'prn_2', name: 'Fast FDM (Bambu/Voron)', type: 'FDM', speedBase: 24.0, power: 300 },
            { id: 'prn_3', name: 'Standard SLA (Mars)', type: 'SLA', liftTime: 4, exposureTime: 2.5, power: 60 },
        ];

        // --- 4. APLIKAČNÍ KOMPONENTY ---

        const FloatingButton = ({ onClick }) => (
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

        const SettingsPanel = ({ materials, printers, onAddMaterial, onAddPrinter, onDeleteMaterial, onDeletePrinter, onClose }) => {
            const [newMat, setNewMat] = useState({ name: '', type: 'FDM', density: 1.24, price: 500 });
            const [newPrn, setNewPrn] = useState({ name: '', type: 'FDM', speedBase: 10, power: 150, liftTime: 4, exposureTime: 2.5 });
            const [activeTab, setActiveTab] = useState('materials');

            const handleAddMat = () => {
                if(!newMat.name) return;
                onAddMaterial({ ...newMat, id: Date.now().toString() });
                setNewMat({ name: '', type: 'FDM', density: 1.24, price: 500 });
            };

            const handleAddPrn = () => {
                if(!newPrn.name) return;
                onAddPrinter({ ...newPrn, id: Date.now().toString() });
                setNewPrn({ name: '', type: 'FDM', speedBase: 10, power: 150, liftTime: 4, exposureTime: 2.5 });
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

                    <div className="max-h-[400px] overflow-y-auto dark-scroll pr-2">
                        {activeTab === 'materials' ? (
                            <div className="space-y-4">
                                <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600 space-y-3">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase">Přidat nový materiál</h4>
                                    <input type="text" placeholder="Název (např. Prusament PLA)" value={newMat.name} onChange={e => setNewMat({...newMat, name: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm" />
                                    <div className="grid grid-cols-3 gap-2">
                                        <select value={newMat.type} onChange={e => setNewMat({...newMat, type: e.target.value})} className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm">
                                            <option value="FDM">FDM</option><option value="SLA">SLA</option>
                                        </select>
                                        <input type="number" placeholder="Hustota" value={newMat.density} onChange={e => setNewMat({...newMat, density: parseFloat(e.target.value)})} className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm" />
                                        <input type="number" placeholder="Cena Kč/kg" value={newMat.price} onChange={e => setNewMat({...newMat, price: parseFloat(e.target.value)})} className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm" />
                                    </div>
                                    <button onClick={handleAddMat} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1 rounded text-sm flex items-center justify-center gap-1"><Plus className="w-3 h-3" /> Přidat</button>
                                </div>
                                {materials.map(m => (
                                    <div key={m.id} className="flex justify-between items-center bg-slate-700 p-2 rounded border border-slate-600">
                                        <div>
                                            <p className="text-white text-sm font-medium">{m.name}</p>
                                            <p className="text-xs text-slate-400">{m.type} | {m.density} g/cm³ | {m.price} Kč</p>
                                        </div>
                                        <button onClick={() => onDeleteMaterial(m.id)} className="text-red-400 hover:text-red-300 p-1"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600 space-y-3">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase">Přidat novou tiskárnu</h4>
                                    <input type="text" placeholder="Název (např. MK4)" value={newPrn.name} onChange={e => setNewPrn({...newPrn, name: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm" />
                                    <div className="grid grid-cols-2 gap-2">
                                        <select value={newPrn.type} onChange={e => setNewPrn({...newPrn, type: e.target.value})} className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm">
                                            <option value="FDM">FDM</option><option value="SLA">SLA</option>
                                        </select>
                                        <input type="number" placeholder="Waty (W)" value={newPrn.power} onChange={e => setNewPrn({...newPrn, power: parseFloat(e.target.value)})} className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm" />
                                    </div>
                                    {newPrn.type === 'FDM' ? (
                                         <input type="number" placeholder="Rychlost (cm³/h)" value={newPrn.speedBase} onChange={e => setNewPrn({...newPrn, speedBase: parseFloat(e.target.value)})} className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm" />
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
                                        <button onClick={() => onDeletePrinter(p.id)} className="text-red-400 hover:text-red-300 p-1"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            );
        };

        const CalculatorApp = () => {
            const [isOpen, setIsOpen] = useState(false);
            const [showSettings, setShowSettings] = useState(false);

            const [materials, setMaterials] = useState(() => {
                const saved = localStorage.getItem('calc_materials');
                return saved ? JSON.parse(saved) : DEFAULT_MATERIALS;
            });
            const [printers, setPrinters] = useState(() => {
                const saved = localStorage.getItem('calc_printers');
                return saved ? JSON.parse(saved) : DEFAULT_PRINTERS;
            });

            useEffect(() => { localStorage.setItem('calc_materials', JSON.stringify(materials)); }, [materials]);
            useEffect(() => { localStorage.setItem('calc_printers', JSON.stringify(printers)); }, [printers]);

            const [selectedPrinterId, setSelectedPrinterId] = useState(printers[0].id);
            const [selectedMaterialId, setSelectedMaterialId] = useState(materials[0].id);
            const [infill, setInfill] = useState(20);
            
            const [geo, setGeo] = useState({ volume: 50, area: 150, height: 8 });
            const [electricityPrice, setElectricityPrice] = useState(6.0);
            const [layerHeight, setLayerHeight] = useState(0.2);

            const selectedPrinter = printers.find(p => p.id === selectedPrinterId) || printers[0];
            const availableMaterials = materials.filter(m => m.type === selectedPrinter.type);
            const selectedMaterial = materials.find(m => m.id === selectedMaterialId) || availableMaterials[0] || materials[0];

            useEffect(() => {
                const newMat = materials.find(m => m.type === selectedPrinter.type);
                if(newMat) setSelectedMaterialId(newMat.id);
                setLayerHeight(selectedPrinter.type === 'FDM' ? 0.2 : 0.05);
                if(selectedPrinter.type === 'SLA') setInfill(100);
            }, [selectedPrinter.type, printers, materials]);

            const result = useMemo(() => {
                const rho = selectedMaterial.density;
                let totalTimeHours = 0;
                let totalVolume = 0;
                
                if (selectedPrinter.type === 'FDM') {
                    const nozzle = 0.04;
                    const tWall = 3 * nozzle;
                    let vShell = geo.area * tWall;
                    if (vShell > geo.volume) vShell = geo.volume;
                    const vInterior = geo.volume - vShell;
                    const vInfill = vInterior * (infill / 100);
                    totalVolume = vShell + vInfill;

                    const speedBase = selectedPrinter.speedBase || 6.0;
                    const layers = (geo.height * 10) / layerHeight;
                    const tExtrusion = totalVolume / speedBase;
                    const tLayers = (layers * 0.05) / 60;
                    totalTimeHours = tExtrusion + tLayers + 0.1;
                } else {
                    totalVolume = geo.volume * (infill / 100);
                    const layers = (geo.height * 10) / layerHeight;
                    const timePerLayer = (selectedPrinter.exposureTime || 2.5) + (selectedPrinter.liftTime || 4);
                    totalTimeHours = ((layers * timePerLayer) / 3600) + 0.166;
                }

                const weight = totalVolume * rho;
                const matCost = (weight / 1000) * selectedMaterial.price;
                const energyKWh = (selectedPrinter.power / 1000) * totalTimeHours;
                const elecCost = energyKWh * electricityPrice;

                return {
                    timeH: Math.floor(totalTimeHours),
                    timeM: Math.round((totalTimeHours % 1) * 60),
                    weight: weight,
                    costMat: matCost,
                    costElec: elecCost,
                    totalCost: matCost + elecCost
                };
            }, [geo, selectedPrinter, selectedMaterial, infill, layerHeight, electricityPrice]);

            if (!isOpen) return <FloatingButton onClick={() => setIsOpen(true)} />;

            return (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in">
                    <div className="bg-slate-800 w-full max-w-2xl rounded-xl shadow-2xl border border-slate-700 max-h-[90vh] overflow-y-auto dark-scroll">
                        <div className="p-6">
                            {showSettings ? (
                                <SettingsPanel 
                                    materials={materials} 
                                    printers={printers}
                                    onAddMaterial={m => setMaterials([...materials, m])}
                                    onAddPrinter={p => setPrinters([...printers, p])}
                                    onDeleteMaterial={id => setMaterials(materials.filter(m => m.id !== id))}
                                    onDeletePrinter={id => setPrinters(printers.filter(p => p.id !== id))}
                                    onClose={() => setShowSettings(false)}
                                />
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                                        <div className="flex items-center gap-2">
                                            <Printer className="w-5 h-5 text-blue-400" />
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
                                            <label className="text-white text-sm font-medium mb-2 flex items-center gap-2"><Printer className="w-4 h-4" /> Tiskárna</label>
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

                                    {selectedPrinter.type === 'FDM' && (
                                        <div>
                                            <label className="text-white text-sm font-medium mb-2 flex items-center justify-between">
                                                <span className="flex items-center gap-2"><Layers className="w-4 h-4" /> Infill (Výplň)</span>
                                                <span className="text-blue-400 font-bold">{infill}%</span>
                                            </label>
                                            <input type="range" min="0" max="100" step="5" value={infill} onChange={e => setInfill(parseInt(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                                        </div>
                                    )}

                                    <div className="bg-slate-700/50 rounded-lg p-4 space-y-3 border border-slate-600">
                                        <h4 className="text-white font-medium text-sm mb-3 border-b border-slate-600 pb-2 flex items-center gap-2">
                                            <Cuboid className="w-4 h-4 text-blue-400" /> Statistiky Modelu (Vstup)
                                        </h4>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="bg-slate-800 rounded p-2">
                                                <label className="text-slate-400 text-xs mb-1 block">Objem (cm³)</label>
                                                <input type="number" value={geo.volume} onChange={e => setGeo({...geo, volume: parseFloat(e.target.value)})} className="w-full bg-transparent text-white font-semibold border-b border-slate-600 focus:border-blue-500 outline-none" />
                                            </div>
                                            <div className="bg-slate-800 rounded p-2">
                                                <label className="text-slate-400 text-xs mb-1 block">Plocha (cm²)</label>
                                                <input type="number" value={geo.area} onChange={e => setGeo({...geo, area: parseFloat(e.target.value)})} className="w-full bg-transparent text-white font-semibold border-b border-slate-600 focus:border-blue-500 outline-none" />
                                            </div>
                                            <div className="bg-slate-800 rounded p-2">
                                                <label className="text-slate-400 text-xs mb-1 block">Výška (cm)</label>
                                                <input type="number" value={geo.height} onChange={e => setGeo({...geo, height: parseFloat(e.target.value)})} className="w-full bg-transparent text-white font-semibold border-b border-slate-600 focus:border-blue-500 outline-none" />
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                             <div className="bg-slate-800 rounded p-2 flex items-center justify-between">
                                                <label className="text-slate-400 text-xs">Cena el. (Kč/kWh)</label>
                                                <input type="number" step="0.1" value={electricityPrice} onChange={e => setElectricityPrice(parseFloat(e.target.value))} className="w-16 bg-transparent text-right text-white font-semibold border-b border-slate-600 focus:border-blue-500 outline-none text-sm" />
                                            </div>
                                            <div className="bg-slate-800 rounded p-2 flex items-center justify-between">
                                                <label className="text-slate-400 text-xs">Vrstva (mm)</label>
                                                <input type="number" step="0.01" value={layerHeight} onChange={e => setLayerHeight(parseFloat(e.target.value))} className="w-16 bg-transparent text-right text-white font-semibold border-b border-slate-600 focus:border-blue-500 outline-none text-sm" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-5 space-y-4 shadow-lg">
                                        <h4 className="text-white font-semibold text-base mb-3 flex items-center gap-2">
                                            <BadgeDollarSign className="w-5 h-5" />
                                            Odhadované Náklady
                                        </h4>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                                                <Clock className="w-6 h-6 text-white mx-auto mb-2" />
                                                <p className="text-blue-100 text-xs mb-1">Čas tisku</p>
                                                <p className="text-white font-bold text-xl">{result.timeH}h {result.timeM}m</p>
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
                                            <span>Materiál: {result.costMat.toFixed(1)} Kč</span>
                                            <span>Elektřina: {result.costElec.toFixed(1)} Kč</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        };

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<CalculatorApp />);
        
    </script>
</body>
</html>
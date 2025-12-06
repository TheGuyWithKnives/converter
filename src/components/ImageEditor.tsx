import { useState, useRef, useEffect, useCallback } from 'react';
import {
  RotateCw,
  Crop,
  Palette,
  Undo,
  Redo,
  Check,
  X,
  ZoomIn,
  ZoomOut,
  Move,
  Eraser
} from 'lucide-react';

interface ImageEditorProps {
  imageFile: File;
  onSave: (editedFile: File) => void;
  onCancel: () => void;
}

interface EditState {
  rotation: number;
  hue: number;
  saturation: number;
  lightness: number;
  brightness: number;
  contrast: number;
  crop: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  removedBackground: boolean;
}

type Tool = 'none' | 'crop' | 'move';

export default function ImageEditor({ imageFile, onSave, onCancel }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [tool, setTool] = useState<Tool>('none');
  const [activeTab, setActiveTab] = useState<'transform' | 'colors'>('transform');

  const [currentState, setCurrentState] = useState<EditState>({
    rotation: 0,
    hue: 0,
    saturation: 100,
    lightness: 100,
    brightness: 100,
    contrast: 100,
    crop: null,
    removedBackground: false,
  });

  const [history, setHistory] = useState<EditState[]>([currentState]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = URL.createObjectURL(imageFile);

    return () => URL.revokeObjectURL(img.src);
  }, [imageFile]);

  const saveToHistory = useCallback((newState: EditState) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCurrentState(newState);
  }, [history, historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setCurrentState(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setCurrentState(history[historyIndex + 1]);
    }
  };

  const drawCanvas = useCallback(() => {
    if (!canvasRef.current || !image) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const maxWidth = 800;
    const maxHeight = 600;
    let displayWidth = image.width;
    let displayHeight = image.height;

    if (displayWidth > maxWidth || displayHeight > maxHeight) {
      const ratio = Math.min(maxWidth / displayWidth, maxHeight / displayHeight);
      displayWidth *= ratio;
      displayHeight *= ratio;
    }

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((currentState.rotation * Math.PI) / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    ctx.filter = `
      hue-rotate(${currentState.hue}deg)
      saturate(${currentState.saturation}%)
      brightness(${currentState.brightness}%)
      contrast(${currentState.contrast}%)
    `;

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    if (tool === 'crop' && cropStart && cropEnd) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      const width = cropEnd.x - cropStart.x;
      const height = cropEnd.y - cropStart.y;
      ctx.strokeRect(cropStart.x, cropStart.y, width, height);
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, cropStart.y);
      ctx.fillRect(0, cropStart.y, cropStart.x, height);
      ctx.fillRect(cropEnd.x, cropStart.y, canvas.width - cropEnd.x, height);
      ctx.fillRect(0, cropEnd.y, canvas.width, canvas.height - cropEnd.y);
    }
  }, [image, currentState, tool, cropStart, cropEnd]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== 'crop') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCropStart({ x, y });
    setCropEnd({ x, y });
    setIsDragging(true);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || tool !== 'crop' || !cropStart) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, canvas.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, canvas.height));

    setCropEnd({ x, y });
  };

  const handleCanvasMouseUp = () => {
    if (tool === 'crop' && cropStart && cropEnd) {
      const minX = Math.min(cropStart.x, cropEnd.x);
      const minY = Math.min(cropStart.y, cropEnd.y);
      const width = Math.abs(cropEnd.x - cropStart.x);
      const height = Math.abs(cropEnd.y - cropStart.y);

      if (width > 10 && height > 10) {
        saveToHistory({
          ...currentState,
          crop: { x: minX, y: minY, width, height },
        });
      }
    }
    setIsDragging(false);
  };

  const handleRotate = () => {
    saveToHistory({
      ...currentState,
      rotation: (currentState.rotation + 90) % 360,
    });
  };

  const handleReset = (type: 'transform' | 'colors') => {
    if (type === 'transform') {
      saveToHistory({
        ...currentState,
        rotation: 0,
        crop: null,
      });
    } else {
      saveToHistory({
        ...currentState,
        hue: 0,
        saturation: 100,
        lightness: 100,
        brightness: 100,
        contrast: 100,
      });
    }
  };

  const handleRemoveBackground = async () => {
    if (!image) return;

    try {
      const { removeBackground } = await import('../services/backgroundRemoval');

      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(image, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const processedData = await removeBackground(imageData);
      ctx.putImageData(processedData, 0, 0);

      const newImg = new Image();
      newImg.onload = () => {
        setImage(newImg);
        saveToHistory({
          ...currentState,
          removedBackground: true,
        });
      };
      newImg.src = canvas.toDataURL();
    } catch (error) {
      console.error('Background removal failed:', error);
      alert('Nepodařilo se odstranit pozadí');
    }
  };

  const handleSave = async () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;

    canvas.toBlob((blob) => {
      if (!blob) return;

      const file = new File([blob], imageFile.name, {
        type: 'image/png',
        lastModified: Date.now(),
      });

      onSave(file);
    }, 'image/png');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-slate-800">Editor obrázku</h2>

          <div className="flex gap-2">
            <button
              onClick={undo}
              disabled={historyIndex === 0}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Zpět (Ctrl+Z)"
            >
              <Undo className="w-5 h-5" />
            </button>
            <button
              onClick={redo}
              disabled={historyIndex === history.length - 1}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Vpřed (Ctrl+Y)"
            >
              <Redo className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex items-center justify-center bg-slate-100 p-8 overflow-auto">
            <div className="relative">
              <canvas
                ref={canvasRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                className={`max-w-full max-h-full shadow-lg ${
                  tool === 'crop' ? 'cursor-crosshair' : 'cursor-default'
                }`}
                style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)` }}
              />
            </div>
          </div>

          <div className="w-80 bg-white border-l flex flex-col">
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('transform')}
                className={`flex-1 px-4 py-3 font-medium transition-colors ${
                  activeTab === 'transform'
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Transformace
              </button>
              <button
                onClick={() => setActiveTab('colors')}
                className={`flex-1 px-4 py-3 font-medium transition-colors ${
                  activeTab === 'colors'
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Barvy
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeTab === 'transform' && (
                <>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-slate-700 text-sm">Nástroje</h3>

                    <button
                      onClick={() => setTool(tool === 'crop' ? 'none' : 'crop')}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                        tool === 'crop'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Crop className="w-4 h-4" />
                      <span className="text-sm font-medium">Oříznout</span>
                    </button>

                    <button
                      onClick={handleRotate}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      <RotateCw className="w-4 h-4" />
                      <span className="text-sm font-medium">Otočit 90°</span>
                    </button>

                    <button
                      onClick={handleRemoveBackground}
                      disabled={currentState.removedBackground}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Eraser className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {currentState.removedBackground ? 'Pozadí odstraněno' : 'Odstranit pozadí'}
                      </span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold text-slate-700 text-sm">Zoom</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                      >
                        <ZoomOut className="w-4 h-4" />
                        <span className="text-xs">-</span>
                      </button>
                      <span className="px-3 py-2 bg-slate-50 rounded-lg text-sm font-medium text-slate-700 min-w-[60px] text-center">
                        {Math.round(zoom * 100)}%
                      </span>
                      <button
                        onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                      >
                        <ZoomIn className="w-4 h-4" />
                        <span className="text-xs">+</span>
                      </button>
                    </div>
                  </div>

                  {currentState.rotation !== 0 && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-700">
                        Rotace: {currentState.rotation}°
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => handleReset('transform')}
                    className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Resetovat transformace
                  </button>
                </>
              )}

              {activeTab === 'colors' && (
                <>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">
                        Odstín: {currentState.hue}°
                      </label>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        value={currentState.hue}
                        onChange={(e) => {
                          const newState = { ...currentState, hue: parseInt(e.target.value) };
                          setCurrentState(newState);
                        }}
                        onMouseUp={() => saveToHistory(currentState)}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">
                        Sytost: {currentState.saturation}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={currentState.saturation}
                        onChange={(e) => {
                          const newState = { ...currentState, saturation: parseInt(e.target.value) };
                          setCurrentState(newState);
                        }}
                        onMouseUp={() => saveToHistory(currentState)}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">
                        Jas: {currentState.brightness}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={currentState.brightness}
                        onChange={(e) => {
                          const newState = { ...currentState, brightness: parseInt(e.target.value) };
                          setCurrentState(newState);
                        }}
                        onMouseUp={() => saveToHistory(currentState)}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">
                        Kontrast: {currentState.contrast}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={currentState.contrast}
                        onChange={(e) => {
                          const newState = { ...currentState, contrast: parseInt(e.target.value) };
                          setCurrentState(newState);
                        }}
                        onMouseUp={() => saveToHistory(currentState)}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => handleReset('colors')}
                    className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Resetovat barvy
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t bg-slate-50">
          <div className="text-sm text-slate-600">
            {historyIndex > 0 && (
              <span>{historyIndex} úprav provedeno</span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors font-medium"
            >
              <X className="w-4 h-4" />
              Zrušit
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium shadow-lg"
            >
              <Check className="w-4 h-4" />
              Použít úpravy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

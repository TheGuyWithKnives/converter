import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Undo, Redo, Check, X, ZoomIn, ZoomOut,
  RotateCw, FlipHorizontal, FlipVertical,
  SlidersHorizontal, Eraser, Download, RotateCcw
} from 'lucide-react';

import { EditorToolbar } from './editor/EditorToolbar';
import { EditorProperties } from './editor/EditorProperties';
import { EditorLayers } from './editor/EditorLayers';
import { EditorFilters } from './editor/EditorFilters';
import type {
  ToolType, Layer, BrushSettings, TextSettings, ShapeSettings,
  Point, BlendMode, FilterType, ColorAdjustments, HistoryEntry
} from './editor/editorTypes';
import {
  createLayer, drawBrushStroke, floodFill, drawShape, drawText,
  applyBlurBrush, applyFilter, applyColorAdjustments, getPixelColor,
  generateCheckerboard,
} from './editor/editorUtils';

interface ImageEditorProps {
  imageFile: File;
  onSave: (editedFile: File) => void;
  onCancel: () => void;
}

let layerIdCounter = 0;
function nextLayerId() { return `layer_${++layerIdCounter}`; }

export default function ImageEditor({ imageFile, onSave, onCancel }: ImageEditorProps) {
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [canvasHeight, setCanvasHeight] = useState(600);

  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState('');

  const [tool, setTool] = useState<ToolType>('brush');
  const [brush, setBrush] = useState<BrushSettings>({
    size: 10, opacity: 100, hardness: 80, color: '#ffffff',
  });
  const [textSettings, setTextSettings] = useState<TextSettings>({
    content: 'Text', fontFamily: 'Arial', fontSize: 32,
    fontWeight: 'normal', fontStyle: 'normal', color: '#ffffff', align: 'left',
  });
  const [shapeSettings, setShapeSettings] = useState<ShapeSettings>({
    type: 'rectangle', strokeColor: '#ffffff', fillColor: '#0078d4',
    strokeWidth: 2, filled: false,
  });

  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<Point | null>(null);
  const [shapeStart, setShapeStart] = useState<Point | null>(null);
  const [cropStart, setCropStart] = useState<Point | null>(null);
  const [cropEnd, setCropEnd] = useState<Point | null>(null);
  const [cloneSource, setCloneSource] = useState<Point | null>(null);
  
  // OPRAVA: Přidán ref pro uložení offsetu při klonování
  const cloneOffset = useRef<Point | null>(null);
  
  const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const [showFilters, setShowFilters] = useState(false);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const checkerRef = useRef<HTMLCanvasElement | null>(null);
  const shapePreviewRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImage(img);

      let w = img.width;
      let h = img.height;
      const maxW = 1600;
      const maxH = 1200;
      if (w > maxW || h > maxH) {
        const ratio = Math.min(maxW / w, maxH / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      setCanvasWidth(w);
      setCanvasHeight(h);

      checkerRef.current = generateCheckerboard(w, h);

      const bgCanvas = createLayer(w, h);
      const bgCtx = bgCanvas.getContext('2d')!;
      bgCtx.drawImage(img, 0, 0, w, h);

      const bgLayer: Layer = {
        id: nextLayerId(),
        name: 'Pozadi',
        canvas: bgCanvas,
        visible: true,
        opacity: 1,
        blendMode: 'normal',
        locked: false,
      };

      setLayers([bgLayer]);
      setActiveLayerId(bgLayer.id);

      const initialHistory: HistoryEntry = {
        layerSnapshots: new Map([[bgLayer.id, bgCtx.getImageData(0, 0, w, h)]]),
        description: 'Nacteni obrazku',
      };
      setHistory([initialHistory]);
      setHistoryIndex(0);
    };
    img.src = URL.createObjectURL(imageFile);
    return () => URL.revokeObjectURL(img.src);
  }, [imageFile]);

  const saveHistorySnapshot = useCallback((desc: string) => {
    const snapshots = new Map<string, ImageData>();
    layers.forEach(l => {
      const ctx = l.canvas.getContext('2d')!;
      snapshots.set(l.id, ctx.getImageData(0, 0, l.canvas.width, l.canvas.height));
    });
    const entry: HistoryEntry = { layerSnapshots: snapshots, description: desc };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(entry);
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [layers, history, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIdx = historyIndex - 1;
    const entry = history[newIdx];
    setLayers(prev => prev.map(l => {
      const snap = entry.layerSnapshots.get(l.id);
      if (snap) {
        const ctx = l.canvas.getContext('2d')!;
        ctx.clearRect(0, 0, l.canvas.width, l.canvas.height);
        ctx.putImageData(snap, 0, 0);
      }
      return { ...l };
    }));
    setHistoryIndex(newIdx);
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const newIdx = historyIndex + 1;
    const entry = history[newIdx];
    setLayers(prev => prev.map(l => {
      const snap = entry.layerSnapshots.get(l.id);
      if (snap) {
        const ctx = l.canvas.getContext('2d')!;
        ctx.clearRect(0, 0, l.canvas.width, l.canvas.height);
        ctx.putImageData(snap, 0, 0);
      }
      return { ...l };
    }));
    setHistoryIndex(newIdx);
  }, [historyIndex, history]);

  const compositeAndRender = useCallback(() => {
    const displayCanvas = displayCanvasRef.current;
    if (!displayCanvas) return;
    const ctx = displayCanvas.getContext('2d');
    if (!ctx) return;

    displayCanvas.width = canvasWidth;
    displayCanvas.height = canvasHeight;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    if (checkerRef.current) {
      ctx.drawImage(checkerRef.current, 0, 0);
    }

    layers.forEach(layer => {
      if (!layer.visible) return;
      ctx.save();
      ctx.globalAlpha = layer.opacity;

      const blendMap: Record<BlendMode, GlobalCompositeOperation> = {
        normal: 'source-over',
        multiply: 'multiply',
        screen: 'screen',
        overlay: 'overlay',
      };
      ctx.globalCompositeOperation = blendMap[layer.blendMode] || 'source-over';
      ctx.drawImage(layer.canvas, 0, 0);
      ctx.restore();
    });

    if (shapePreviewRef.current && (tool === 'shape' || tool === 'crop' || tool === 'selection')) {
      ctx.drawImage(shapePreviewRef.current, 0, 0);
    }

    if (selectionRect) {
      ctx.save();
      ctx.strokeStyle = '#0078d4';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
      ctx.setLineDash([]);
      ctx.restore();
    }

    if (tool === 'clone' && cloneSource) {
      ctx.save();
      ctx.strokeStyle = '#FF003C';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cloneSource.x, cloneSource.y, brush.size / 2 + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cloneSource.x - 8, cloneSource.y);
      ctx.lineTo(cloneSource.x + 8, cloneSource.y);
      ctx.moveTo(cloneSource.x, cloneSource.y - 8);
      ctx.lineTo(cloneSource.x, cloneSource.y + 8);
      ctx.stroke();
      ctx.restore();
    }
  }, [layers, canvasWidth, canvasHeight, tool, selectionRect, cloneSource, brush.size]);

  useEffect(() => {
    compositeAndRender();
  }, [compositeAndRender]);

  const getActiveLayer = useCallback(() => {
    return layers.find(l => l.id === activeLayerId);
  }, [layers, activeLayerId]);

  const getCanvasPoint = useCallback((e: React.MouseEvent): Point => {
    const displayCanvas = displayCanvasRef.current;
    if (!displayCanvas) return { x: 0, y: 0 };
    const rect = displayCanvas.getBoundingClientRect();
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, [canvasWidth, canvasHeight]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const point = getCanvasPoint(e);
    const layer = getActiveLayer();

    if (tool === 'move') {
      setIsDrawing(true);
      setLastPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    if (!layer || layer.locked) return;
    const ctx = layer.canvas.getContext('2d');
    if (!ctx) return;

    if (tool === 'brush' || tool === 'eraser') {
      setIsDrawing(true);
      setLastPoint(point);
      drawBrushStroke(ctx, point, point, brush, tool === 'eraser');
      compositeAndRender();
    } else if (tool === 'blur-brush') {
      setIsDrawing(true);
      setLastPoint(point);
      applyBlurBrush(ctx, point.x, point.y, brush.size / 2, 2);
      compositeAndRender();
    } else if (tool === 'clone') {
      if (e.altKey) {
        setCloneSource(point);
        return;
      }
      if (cloneSource) {
        setIsDrawing(true);
        setLastPoint(point);
        // OPRAVA: Vypočítáme fixní offset mezi aktuálním bodem (kam kreslím) a zdrojem (odkud beru)
        cloneOffset.current = {
            x: point.x - cloneSource.x,
            y: point.y - cloneSource.y
        };
      }
    } else if (tool === 'fill') {
      floodFill(ctx, point.x, point.y, brush.color);
      saveHistorySnapshot('Vyplneni');
      compositeAndRender();
    } else if (tool === 'eyedropper') {
      const color = getPixelColor(ctx, point.x, point.y);
      setBrush(prev => ({ ...prev, color }));
      setTool('brush');
    } else if (tool === 'text') {
      drawText(ctx, textSettings.content, point.x, point.y,
        textSettings.fontFamily, textSettings.fontSize,
        textSettings.fontWeight, textSettings.fontStyle,
        textSettings.color, textSettings.align);
      saveHistorySnapshot('Text');
      compositeAndRender();
    } else if (tool === 'shape') {
      setIsDrawing(true);
      setShapeStart(point);
      shapePreviewRef.current = createLayer(canvasWidth, canvasHeight);
    } else if (tool === 'crop') {
      setIsDrawing(true);
      setCropStart(point);
      setCropEnd(point);
      shapePreviewRef.current = createLayer(canvasWidth, canvasHeight);
    } else if (tool === 'selection') {
      setIsDrawing(true);
      setCropStart(point);
      setCropEnd(point);
      shapePreviewRef.current = createLayer(canvasWidth, canvasHeight);
    }
  }, [tool, brush, textSettings, getCanvasPoint, getActiveLayer, compositeAndRender,
      saveHistorySnapshot, cloneSource, canvasWidth, canvasHeight, shapeSettings]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing) return;
    const point = getCanvasPoint(e);

    if (tool === 'move') {
      if (lastPoint) {
        setPanX(prev => prev + (e.clientX - lastPoint.x));
        setPanY(prev => prev + (e.clientY - lastPoint.y));
        setLastPoint({ x: e.clientX, y: e.clientY });
      }
      return;
    }

    const layer = getActiveLayer();
    if (!layer || layer.locked) return;
    const ctx = layer.canvas.getContext('2d');
    if (!ctx) return;

    if ((tool === 'brush' || tool === 'eraser') && lastPoint) {
      drawBrushStroke(ctx, lastPoint, point, brush, tool === 'eraser');
      setLastPoint(point);
      compositeAndRender();
    } else if (tool === 'blur-brush' && lastPoint) {
      applyBlurBrush(ctx, point.x, point.y, brush.size / 2, 1);
      setLastPoint(point);
      compositeAndRender();
    } else if (tool === 'clone' && lastPoint && cloneSource && cloneOffset.current) {
      // OPRAVA: Používáme fixní offset pro výpočet zdroje
      // Aktuální pozice štětce (point) mínus offset nám dá odpovídající bod ve zdroji
      const sourceX = point.x - cloneOffset.current.x;
      const sourceY = point.y - cloneOffset.current.y;
      
      const r = brush.size / 2;
      try {
        const srcData = ctx.getImageData(
          Math.max(0, sourceX - r), Math.max(0, sourceY - r),
          brush.size, brush.size
        );
        ctx.putImageData(srcData, point.x - r, point.y - r);
      } catch { /* ignore out of bounds */ }
      setLastPoint(point);
      compositeAndRender();
    } else if (tool === 'shape' && shapeStart && shapePreviewRef.current) {
      const previewCtx = shapePreviewRef.current.getContext('2d')!;
      previewCtx.clearRect(0, 0, canvasWidth, canvasHeight);
      drawShape(previewCtx, shapeSettings.type, shapeStart, point,
        shapeSettings.strokeColor, shapeSettings.fillColor,
        shapeSettings.strokeWidth, shapeSettings.filled);
      compositeAndRender();
    } else if ((tool === 'crop' || tool === 'selection') && cropStart && shapePreviewRef.current) {
      setCropEnd(point);
      const previewCtx = shapePreviewRef.current.getContext('2d')!;
      previewCtx.clearRect(0, 0, canvasWidth, canvasHeight);

      const x = Math.min(cropStart.x, point.x);
      const y = Math.min(cropStart.y, point.y);
      const w = Math.abs(point.x - cropStart.x);
      const h = Math.abs(point.y - cropStart.y);

      previewCtx.fillStyle = 'rgba(0,0,0,0.5)';
      previewCtx.fillRect(0, 0, canvasWidth, y);
      previewCtx.fillRect(0, y, x, h);
      previewCtx.fillRect(x + w, y, canvasWidth - x - w, h);
      previewCtx.fillRect(0, y + h, canvasWidth, canvasHeight - y - h);

      previewCtx.strokeStyle = tool === 'crop' ? '#ff6600' : '#0078d4';
      previewCtx.lineWidth = 2;
      previewCtx.setLineDash([6, 3]);
      previewCtx.strokeRect(x, y, w, h);
      previewCtx.setLineDash([]);

      compositeAndRender();
    }
  }, [isDrawing, tool, lastPoint, brush, getCanvasPoint, getActiveLayer,
      compositeAndRender, cloneSource, shapeStart, shapeSettings, cropStart,
      canvasWidth, canvasHeight]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing) return;

    if (tool === 'brush' || tool === 'eraser') {
      saveHistorySnapshot(tool === 'brush' ? 'Kresba' : 'Mazani');
    } else if (tool === 'blur-brush') {
      saveHistorySnapshot('Rozmazani');
    } else if (tool === 'clone') {
      saveHistorySnapshot('Klonovani');
      cloneOffset.current = null; // Reset offsetu
    } else if (tool === 'shape' && shapeStart && shapePreviewRef.current) {
      const layer = getActiveLayer();
      if (layer) {
        const ctx = layer.canvas.getContext('2d')!;
        ctx.drawImage(shapePreviewRef.current, 0, 0);
        saveHistorySnapshot('Tvar');
      }
      shapePreviewRef.current = null;
    } else if (tool === 'crop' && cropStart && cropEnd) {
      const x = Math.min(cropStart.x, cropEnd.x);
      const y = Math.min(cropStart.y, cropEnd.y);
      const w = Math.abs(cropEnd.x - cropStart.x);
      const h = Math.abs(cropEnd.y - cropStart.y);

      if (w > 10 && h > 10) {
        applyCrop(x, y, w, h);
      }
      shapePreviewRef.current = null;
      setCropStart(null);
      setCropEnd(null);
    } else if (tool === 'selection' && cropStart && cropEnd) {
      const x = Math.min(cropStart.x, cropEnd.x);
      const y = Math.min(cropStart.y, cropEnd.y);
      const w = Math.abs(cropEnd.x - cropStart.x);
      const h = Math.abs(cropEnd.y - cropStart.y);
      if (w > 5 && h > 5) {
        setSelectionRect({ x, y, w, h });
      } else {
        setSelectionRect(null);
      }
      shapePreviewRef.current = null;
      setCropStart(null);
      setCropEnd(null);
    }

    setIsDrawing(false);
    setLastPoint(null);
    setShapeStart(null);
    compositeAndRender();
  }, [isDrawing, tool, saveHistorySnapshot, getActiveLayer, compositeAndRender,
      cropStart, cropEnd, shapeStart]);

  const applyCrop = useCallback((x: number, y: number, w: number, h: number) => {
    const newLayers = layers.map(layer => {
      const newCanvas = createLayer(w, h);
      const newCtx = newCanvas.getContext('2d')!;
      newCtx.drawImage(layer.canvas, x, y, w, h, 0, 0, w, h);
      return { ...layer, canvas: newCanvas };
    });
    setLayers(newLayers);
    setCanvasWidth(w);
    setCanvasHeight(h);
    checkerRef.current = generateCheckerboard(w, h);
    saveHistorySnapshot('Orez');
  }, [layers, saveHistorySnapshot]);

  const handleAddLayer = useCallback(() => {
    const newCanvas = createLayer(canvasWidth, canvasHeight);
    const newLayer: Layer = {
      id: nextLayerId(),
      name: `Vrstva ${layers.length + 1}`,
      canvas: newCanvas,
      visible: true,
      opacity: 1,
      blendMode: 'normal',
      locked: false,
    };
    setLayers(prev => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
    saveHistorySnapshot('Nova vrstva');
  }, [canvasWidth, canvasHeight, layers.length, saveHistorySnapshot]);

  const handleDeleteLayer = useCallback((id: string) => {
    if (layers.length <= 1) return;
    const newLayers = layers.filter(l => l.id !== id);
    setLayers(newLayers);
    if (activeLayerId === id) {
      setActiveLayerId(newLayers[newLayers.length - 1].id);
    }
    saveHistorySnapshot('Smazani vrstvy');
  }, [layers, activeLayerId, saveHistorySnapshot]);

  const handleDuplicateLayer = useCallback((id: string) => {
    const source = layers.find(l => l.id === id);
    if (!source) return;
    const newCanvas = createLayer(canvasWidth, canvasHeight);
    const newCtx = newCanvas.getContext('2d')!;
    newCtx.drawImage(source.canvas, 0, 0);
    const newLayer: Layer = {
      id: nextLayerId(),
      name: `${source.name} (kopie)`,
      canvas: newCanvas,
      visible: true,
      opacity: source.opacity,
      blendMode: source.blendMode,
      locked: false,
    };
    const idx = layers.findIndex(l => l.id === id);
    const newLayers = [...layers];
    newLayers.splice(idx + 1, 0, newLayer);
    setLayers(newLayers);
    setActiveLayerId(newLayer.id);
    saveHistorySnapshot('Duplikace vrstvy');
  }, [layers, canvasWidth, canvasHeight, saveHistorySnapshot]);

  const handleMoveLayer = useCallback((id: string, dir: 'up' | 'down') => {
    const idx = layers.findIndex(l => l.id === id);
    if (dir === 'up' && idx < layers.length - 1) {
      const newLayers = [...layers];
      [newLayers[idx], newLayers[idx + 1]] = [newLayers[idx + 1], newLayers[idx]];
      setLayers(newLayers);
    } else if (dir === 'down' && idx > 0) {
      const newLayers = [...layers];
      [newLayers[idx], newLayers[idx - 1]] = [newLayers[idx - 1], newLayers[idx]];
      setLayers(newLayers);
    }
  }, [layers]);

  const handleMergeDown = useCallback((id: string) => {
    const idx = layers.findIndex(l => l.id === id);
    if (idx <= 0) return;
    const upper = layers[idx];
    const lower = layers[idx - 1];
    const ctx = lower.canvas.getContext('2d')!;
    ctx.globalAlpha = upper.opacity;
    ctx.drawImage(upper.canvas, 0, 0);
    ctx.globalAlpha = 1;
    const newLayers = layers.filter(l => l.id !== id);
    setLayers(newLayers);
    setActiveLayerId(lower.id);
    saveHistorySnapshot('Slouceni vrstev');
  }, [layers, saveHistorySnapshot]);

  const handleApplyFilter = useCallback((filter: FilterType, intensity: number) => {
    const layer = getActiveLayer();
    if (!layer) return;
    const ctx = layer.canvas.getContext('2d');
    if (!ctx) return;
    applyFilter(ctx, filter, intensity);
    saveHistorySnapshot(`Filtr: ${filter}`);
    compositeAndRender();
    setShowFilters(false);
  }, [getActiveLayer, saveHistorySnapshot, compositeAndRender]);

  const handleApplyAdjustments = useCallback((adj: ColorAdjustments) => {
    const layer = getActiveLayer();
    if (!layer) return;
    const ctx = layer.canvas.getContext('2d');
    if (!ctx) return;
    applyColorAdjustments(ctx, adj.brightness, adj.contrast, adj.saturation, adj.hue);
    saveHistorySnapshot('Uprava barev');
    compositeAndRender();
    setShowFilters(false);
  }, [getActiveLayer, saveHistorySnapshot, compositeAndRender]);

  const handleRotate = useCallback((deg: number) => {
    const newW = deg === 90 || deg === -90 ? canvasHeight : canvasWidth;
    const newH = deg === 90 || deg === -90 ? canvasWidth : canvasHeight;

    const newLayers = layers.map(layer => {
      const newCanvas = createLayer(newW, newH);
      const newCtx = newCanvas.getContext('2d')!;
      newCtx.translate(newW / 2, newH / 2);
      newCtx.rotate((deg * Math.PI) / 180);
      newCtx.drawImage(layer.canvas, -canvasWidth / 2, -canvasHeight / 2);
      return { ...layer, canvas: newCanvas };
    });

    setLayers(newLayers);
    setCanvasWidth(newW);
    setCanvasHeight(newH);
    checkerRef.current = generateCheckerboard(newW, newH);
    saveHistorySnapshot('Rotace');
  }, [layers, canvasWidth, canvasHeight, saveHistorySnapshot]);

  const handleFlip = useCallback((axis: 'h' | 'v') => {
    const newLayers = layers.map(layer => {
      const newCanvas = createLayer(canvasWidth, canvasHeight);
      const newCtx = newCanvas.getContext('2d')!;
      if (axis === 'h') {
        newCtx.translate(canvasWidth, 0);
        newCtx.scale(-1, 1);
      } else {
        newCtx.translate(0, canvasHeight);
        newCtx.scale(1, -1);
      }
      newCtx.drawImage(layer.canvas, 0, 0);
      return { ...layer, canvas: newCanvas };
    });
    setLayers(newLayers);
    saveHistorySnapshot(axis === 'h' ? 'Prevratit H' : 'Prevratit V');
  }, [layers, canvasWidth, canvasHeight, saveHistorySnapshot]);

  const handleRemoveBackground = useCallback(async () => {
    const layer = getActiveLayer();
    if (!layer) return;

    try {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvasWidth;
      tempCanvas.height = canvasHeight;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.drawImage(layer.canvas, 0, 0);

      const blob = await new Promise<Blob>((resolve) =>
        tempCanvas.toBlob(b => resolve(b!), 'image/png')
      );
      const imgUrl = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = async () => {
        try {
          const { removeBackground } = await import('../services/backgroundRemoval');
          const result = await removeBackground(img);
          const ctx = layer.canvas.getContext('2d')!;
          ctx.clearRect(0, 0, canvasWidth, canvasHeight);
          ctx.drawImage(result.imageWithoutBg, 0, 0, canvasWidth, canvasHeight);
          saveHistorySnapshot('Odstraneni pozadi');
          compositeAndRender();
          setLayers(prev => [...prev]);
        } catch (err) {
          console.error('Background removal failed:', err);
        }
        URL.revokeObjectURL(imgUrl);
      };
      img.src = imgUrl;
    } catch (err) {
      console.error('Background removal failed:', err);
    }
  }, [getActiveLayer, canvasWidth, canvasHeight, saveHistorySnapshot, compositeAndRender]);

  const handleSave = useCallback(() => {
    const finalCanvas = createLayer(canvasWidth, canvasHeight);
    const ctx = finalCanvas.getContext('2d')!;

    layers.forEach(layer => {
      if (!layer.visible) return;
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      const blendMap: Record<BlendMode, GlobalCompositeOperation> = {
        normal: 'source-over', multiply: 'multiply', screen: 'screen', overlay: 'overlay',
      };
      ctx.globalCompositeOperation = blendMap[layer.blendMode] || 'source-over';
      ctx.drawImage(layer.canvas, 0, 0);
      ctx.restore();
    });

    finalCanvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], imageFile.name, { type: 'image/png', lastModified: Date.now() });
      onSave(file);
    }, 'image/png');
  }, [layers, canvasWidth, canvasHeight, imageFile, onSave]);

  const handleExportPng = useCallback(() => {
    const finalCanvas = createLayer(canvasWidth, canvasHeight);
    const ctx = finalCanvas.getContext('2d')!;
    layers.forEach(layer => {
      if (!layer.visible) return;
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.drawImage(layer.canvas, 0, 0);
      ctx.restore();
    });
    const link = document.createElement('a');
    link.download = imageFile.name.replace(/\.[^/.]+$/, '') + '_edited.png';
    link.href = finalCanvas.toDataURL('image/png');
    link.click();
  }, [layers, canvasWidth, canvasHeight, imageFile]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { e.preventDefault(); undo(); }
        if (e.key === 'y') { e.preventDefault(); redo(); }
        if (e.key === 's') { e.preventDefault(); handleSave(); }
      }
      if (!e.ctrlKey && !e.metaKey) {
        const shortcuts: Record<string, ToolType> = {
          v: 'move', m: 'selection', c: 'crop', b: 'brush',
          e: 'eraser', g: 'fill', i: 'eyedropper', t: 'text',
          u: 'shape', r: 'blur-brush', s: 'clone',
        };
        if (shortcuts[e.key.toLowerCase()] && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)) {
          setTool(shortcuts[e.key.toLowerCase()]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, handleSave]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (containerRef.current?.contains(e.target as Node)) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(prev => Math.max(0.1, Math.min(5, prev + delta)));
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  const cursorStyle = (() => {
    switch (tool) {
      case 'brush': case 'eraser': case 'blur-brush': case 'clone': return 'crosshair';
      case 'move': return 'grab';
      case 'eyedropper': return 'crosshair';
      case 'fill': return 'crosshair';
      case 'text': return 'text';
      case 'crop': case 'selection': return 'crosshair';
      case 'shape': return 'crosshair';
      default: return 'default';
    }
  })();

  const fitZoom = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const zx = (rect.width - 40) / canvasWidth;
    const zy = (rect.height - 40) / canvasHeight;
    setZoom(Math.min(zx, zy, 1));
    setPanX(0);
    setPanY(0);
  }, [canvasWidth, canvasHeight]);

  useEffect(() => {
    fitZoom();
  }, [canvasWidth, canvasHeight]);

  return (
    <div className="fixed inset-0 z-50 bg-[#1a1a1a] flex flex-col select-none">
      {/* Top Bar */}
      <div className="h-10 bg-[#2d2d2d] border-b border-[#444] flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-1">
          <button onClick={() => handleRotate(-90)} className="p-1.5 text-[#999] hover:text-white hover:bg-[#444] rounded transition-colors" title="Otocit vlevo">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={() => handleRotate(90)} className="p-1.5 text-[#999] hover:text-white hover:bg-[#444] rounded transition-colors" title="Otocit vpravo">
            <RotateCw className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-[#444] mx-1" />
          <button onClick={() => handleFlip('h')} className="p-1.5 text-[#999] hover:text-white hover:bg-[#444] rounded transition-colors" title="Prevratit H">
            <FlipHorizontal className="w-4 h-4" />
          </button>
          <button onClick={() => handleFlip('v')} className="p-1.5 text-[#999] hover:text-white hover:bg-[#444] rounded transition-colors" title="Prevratit V">
            <FlipVertical className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-[#444] mx-1" />
          <button onClick={undo} disabled={historyIndex <= 0} className="p-1.5 text-[#999] hover:text-white hover:bg-[#444] rounded transition-colors disabled:opacity-30" title="Zpet (Ctrl+Z)">
            <Undo className="w-4 h-4" />
          </button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-1.5 text-[#999] hover:text-white hover:bg-[#444] rounded transition-colors disabled:opacity-30" title="Vpred (Ctrl+Y)">
            <Redo className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-[#444] mx-1" />
          <button onClick={() => setShowFilters(true)} className="p-1.5 text-[#999] hover:text-white hover:bg-[#444] rounded transition-colors" title="Filtry">
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          <button onClick={handleRemoveBackground} className="p-1.5 text-[#999] hover:text-white hover:bg-[#444] rounded transition-colors" title="Odstranit pozadi">
            <Eraser className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-[#444] mx-1" />
          <button onClick={() => setZoom(prev => Math.max(0.1, prev - 0.25))} className="p-1.5 text-[#999] hover:text-white hover:bg-[#444] rounded transition-colors">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[10px] text-[#ccc] font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(prev => Math.min(5, prev + 0.25))} className="p-1.5 text-[#999] hover:text-white hover:bg-[#444] rounded transition-colors">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#888] font-mono">{canvasWidth} x {canvasHeight}px</span>
          <button onClick={handleExportPng} className="p-1.5 text-[#999] hover:text-white hover:bg-[#444] rounded transition-colors" title="Export PNG">
            <Download className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-[#444] mx-1" />
          <button onClick={onCancel} className="flex items-center gap-1 px-3 py-1 text-[#999] hover:text-white border border-[#555] rounded text-xs font-bold transition-colors">
            <X className="w-3.5 h-3.5" /> Zrusit
          </button>
          <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1 bg-[#0078d4] hover:bg-[#006abc] text-white rounded text-xs font-bold transition-colors shadow">
            <Check className="w-3.5 h-3.5" /> Pouzit
          </button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden">
        <EditorToolbar activeTool={tool} onToolChange={setTool} />

        {/* Canvas Area */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden bg-[#1a1a1a] flex items-center justify-center"
          style={{ cursor: cursorStyle }}
        >
          <canvas
            ref={displayCanvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
              transformOrigin: 'center center',
              imageRendering: zoom > 2 ? 'pixelated' : 'auto',
              boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
            }}
            className="transition-none"
          />
        </div>

        {/* Right Side */}
        <div className="flex flex-col w-64 shrink-0">
          <EditorProperties
            tool={tool}
            brush={brush}
            textSettings={textSettings}
            shapeSettings={shapeSettings}
            onBrushChange={(partial) => setBrush(prev => ({ ...prev, ...partial }))}
            onTextChange={(partial) => setTextSettings(prev => ({ ...prev, ...partial }))}
            onShapeChange={(partial) => setShapeSettings(prev => ({ ...prev, ...partial }))}
          />
          <EditorLayers
            layers={layers}
            activeLayerId={activeLayerId}
            onSelectLayer={setActiveLayerId}
            onToggleVisibility={(id) => setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l))}
            onToggleLock={(id) => setLayers(prev => prev.map(l => l.id === id ? { ...l, locked: !l.locked } : l))}
            onOpacityChange={(id, opacity) => setLayers(prev => prev.map(l => l.id === id ? { ...l, opacity } : l))}
            onBlendModeChange={(id, mode) => setLayers(prev => prev.map(l => l.id === id ? { ...l, blendMode: mode } : l))}
            onAddLayer={handleAddLayer}
            onDeleteLayer={handleDeleteLayer}
            onDuplicateLayer={handleDuplicateLayer}
            onMoveLayer={handleMoveLayer}
            onMergeDown={handleMergeDown}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-[#2d2d2d] border-t border-[#444] flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-4 text-[10px] text-[#888]">
          <span>Nastroj: {tool}</span>
          <span>Vrstva: {layers.find(l => l.id === activeLayerId)?.name || '-'}</span>
          <span>Historie: {historyIndex + 1}/{history.length}</span>
          {tool === 'clone' && (
            <span className="text-yellow-400 font-bold">
              {cloneSource ? 'Zdroj nastaven - kreslete pro klonovani' : 'Alt+klik = nastavit zdroj'}
            </span>
          )}
        </div>
        <div className="text-[10px] text-[#888]">
          Ctrl+Z = Zpet | Ctrl+Y = Vpred | Kolecko = Zoom
        </div>
      </div>

      {showFilters && (
        <EditorFilters
          onApplyFilter={handleApplyFilter}
          onApplyAdjustments={handleApplyAdjustments}
          onClose={() => setShowFilters(false)}
        />
      )}
    </div>
  );
}
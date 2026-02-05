export type ToolType =
  | 'move'
  | 'brush'
  | 'eraser'
  | 'eyedropper'
  | 'fill'
  | 'text'
  | 'shape'
  | 'crop'
  | 'blur-brush'
  | 'clone'
  | 'selection';

export type ShapeType = 'rectangle' | 'circle' | 'line' | 'arrow';

export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay';

export interface BrushSettings {
  size: number;
  opacity: number;
  hardness: number;
  color: string;
}

export interface TextSettings {
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string;
  align: 'left' | 'center' | 'right';
}

export interface ShapeSettings {
  type: ShapeType;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  filled: boolean;
}

export interface Layer {
  id: string;
  name: string;
  canvas: HTMLCanvasElement;
  visible: boolean;
  opacity: number;
  blendMode: BlendMode;
  locked: boolean;
}

export interface EditorState {
  layers: Layer[];
  activeLayerId: string;
  tool: ToolType;
  brush: BrushSettings;
  textSettings: TextSettings;
  shapeSettings: ShapeSettings;
  zoom: number;
  panX: number;
  panY: number;
  rotation: number;
  canvasWidth: number;
  canvasHeight: number;
}

export interface ColorAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  exposure: number;
  highlights: number;
  shadows: number;
}

export type FilterType =
  | 'blur'
  | 'sharpen'
  | 'grayscale'
  | 'sepia'
  | 'invert'
  | 'vignette'
  | 'noise'
  | 'emboss'
  | 'posterize';

export interface Point {
  x: number;
  y: number;
}

export interface HistoryEntry {
  layerSnapshots: Map<string, ImageData>;
  description: string;
}

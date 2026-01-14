import { Eye, Grid3x3, Lightbulb, Square, Maximize } from 'lucide-react';

interface ViewportControlsProps {
  showGrid: boolean;
  showWireframe: boolean;
  showLights: boolean;
  showBoundingBox: boolean;
  onToggleGrid: () => void;
  onToggleWireframe: () => void;
  onToggleLights: () => void;
  onToggleBoundingBox: () => void;
  onResetCamera: () => void;
}

export default function ViewportControls({
  showGrid,
  showWireframe,
  showLights,
  showBoundingBox,
  onToggleGrid,
  onToggleWireframe,
  onToggleLights,
  onToggleBoundingBox,
  onResetCamera,
}: ViewportControlsProps) {
  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Eye className="w-5 h-5 text-cyan-400" />
        <h3 className="text-white font-semibold">Viewport Controls</h3>
      </div>

      <div className="space-y-2">
        <button
          onClick={onToggleGrid}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-colors ${
            showGrid
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          <Grid3x3 className="w-4 h-4" />
          <span className="text-sm">Show Grid</span>
        </button>

        <button
          onClick={onToggleWireframe}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-colors ${
            showWireframe
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          <Square className="w-4 h-4" />
          <span className="text-sm">Wireframe Mode</span>
        </button>

        <button
          onClick={onToggleLights}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-colors ${
            showLights
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          <span className="text-sm">Show Lights</span>
        </button>

        <button
          onClick={onToggleBoundingBox}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-colors ${
            showBoundingBox
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          <Square className="w-4 h-4" />
          <span className="text-sm">Bounding Box</span>
        </button>

        <button
          onClick={onResetCamera}
          className="w-full flex items-center gap-3 px-3 py-2 bg-slate-700 text-slate-300 hover:bg-slate-600 rounded transition-colors mt-4"
        >
          <Maximize className="w-4 h-4" />
          <span className="text-sm">Reset Camera</span>
        </button>
      </div>
    </div>
  );
}

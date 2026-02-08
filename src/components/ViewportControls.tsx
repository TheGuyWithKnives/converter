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
  const toggleClass = (active: boolean) =>
    `w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
      active
        ? 'bg-brand-accent/15 text-brand-accent border border-brand-accent/30'
        : 'bg-brand-dark text-brand-muted hover:text-brand-light border border-brand-border hover:border-brand-muted-soft'
    }`;

  return (
    <div className="bg-brand-surface rounded-xl p-4 border border-brand-border">
      <div className="flex items-center gap-2 mb-4">
        <Eye className="w-4 h-4 text-cyan-400" />
        <h3 className="text-brand-light font-bold text-sm">Viewport</h3>
      </div>

      <div className="space-y-2">
        <button onClick={onToggleGrid} className={toggleClass(showGrid)}>
          <Grid3x3 className="w-4 h-4" />
          Grid
        </button>

        <button onClick={onToggleWireframe} className={toggleClass(showWireframe)}>
          <Square className="w-4 h-4" />
          Wireframe
        </button>

        <button onClick={onToggleLights} className={toggleClass(showLights)}>
          <Lightbulb className="w-4 h-4" />
          Lights
        </button>

        <button onClick={onToggleBoundingBox} className={toggleClass(showBoundingBox)}>
          <Square className="w-4 h-4" />
          Bounding Box
        </button>

        <button
          onClick={onResetCamera}
          className="w-full flex items-center gap-3 px-3 py-2 bg-brand-dark text-brand-muted hover:text-brand-light border border-brand-border hover:border-brand-accent/50 rounded-lg text-sm transition-all mt-3"
        >
          <Maximize className="w-4 h-4" />
          Reset Camera
        </button>
      </div>
    </div>
  );
}

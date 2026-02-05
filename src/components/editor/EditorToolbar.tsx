import {
  MousePointer2, Paintbrush, Eraser, Pipette, PaintBucket,
  Type, Square, Crop, Droplets, Stamp, BoxSelect
} from 'lucide-react';
import type { ToolType } from './editorTypes';

interface EditorToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
}

const TOOLS: { id: ToolType; icon: typeof MousePointer2; label: string; shortcut: string }[] = [
  { id: 'move', icon: MousePointer2, label: 'Presun', shortcut: 'V' },
  { id: 'selection', icon: BoxSelect, label: 'Vyber', shortcut: 'M' },
  { id: 'crop', icon: Crop, label: 'Orez', shortcut: 'C' },
  { id: 'brush', icon: Paintbrush, label: 'Stetec', shortcut: 'B' },
  { id: 'eraser', icon: Eraser, label: 'Guma', shortcut: 'E' },
  { id: 'fill', icon: PaintBucket, label: 'Vyplnit', shortcut: 'G' },
  { id: 'eyedropper', icon: Pipette, label: 'Kapetka', shortcut: 'I' },
  { id: 'text', icon: Type, label: 'Text', shortcut: 'T' },
  { id: 'shape', icon: Square, label: 'Tvary', shortcut: 'U' },
  { id: 'blur-brush', icon: Droplets, label: 'Rozmazani', shortcut: 'R' },
  { id: 'clone', icon: Stamp, label: 'Klonovani', shortcut: 'S' },
];

export function EditorToolbar({ activeTool, onToolChange }: EditorToolbarProps) {
  return (
    <div className="w-12 bg-[#1e1e1e] border-r border-[#333] flex flex-col items-center py-2 gap-0.5 shrink-0">
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;
        return (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            className={`w-10 h-10 flex items-center justify-center rounded transition-all group relative ${
              isActive
                ? 'bg-[#0078d4] text-white'
                : 'text-[#999] hover:text-white hover:bg-[#333]'
            }`}
            title={`${tool.label} (${tool.shortcut})`}
          >
            <Icon className="w-4 h-4" />
            <span className="absolute left-full ml-2 px-2 py-1 bg-[#1e1e1e] border border-[#444] text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
              {tool.label}
              <span className="ml-2 text-[#888]">{tool.shortcut}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

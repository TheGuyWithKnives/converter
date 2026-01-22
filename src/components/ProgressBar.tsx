import React from 'react';
import { X, Loader2 } from 'lucide-react';

interface ProgressBarProps {
  progress: number;
  message: string;
  onCancel?: () => void;
  cancellable?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  progress, 
  message, 
  onCancel, 
  cancellable = false 
}) => {
  // Převod 0-1 na 0-100
  const percentage = Math.min(100, Math.max(0, Math.round(progress * 100)));

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-brand-accent animate-spin" />
            <span className="text-brand-light font-bold font-spartan tracking-wide">
              ZPRACOVÁVÁM...
            </span>
        </div>
        <span className="text-brand-accent font-mono font-bold">{percentage}%</span>
      </div>

      {/* Track */}
      <div className="w-full h-2 bg-brand-dark rounded-full overflow-hidden mb-4 border border-brand-light/5">
        {/* Fill */}
        <div 
          className="h-full bg-gradient-to-r from-brand-accent to-red-600 transition-all duration-300 shadow-[0_0_10px_rgba(255,0,60,0.5)]"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="text-center text-xs text-brand-muted uppercase tracking-wider mb-4">
        {message}
      </p>

      {cancellable && onCancel && (
        <button
          onClick={onCancel}
          className="w-full py-2 border border-brand-light/10 rounded-lg text-brand-muted text-xs hover:text-brand-light hover:border-brand-light/30 transition-colors flex items-center justify-center gap-2"
        >
          <X className="w-3 h-3" /> Zrušit proces
        </button>
      )}
    </div>
  );
};

export default ProgressBar;
import { Loader2 } from 'lucide-react';

interface ProgressBarProps {
  progress: number;
  message?: string;
}

export default function ProgressBar({ progress, message }: ProgressBarProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="flex items-center justify-center mb-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>

        <h3 className="text-lg font-semibold text-slate-800 text-center mb-2">
          Zpracování...
        </h3>

        {message && (
          <p className="text-sm text-slate-600 text-center mb-4">{message}</p>
        )}

        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-300 ease-out"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <p className="text-center text-sm text-slate-500 mt-3">
          {Math.round(progress * 100)}%
        </p>
      </div>
    </div>
  );
}

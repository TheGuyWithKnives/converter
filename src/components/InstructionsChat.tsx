import React, { useState } from 'react';
import { MessageSquare, Send, Sparkles, X } from 'lucide-react';

interface InstructionsChatProps {
  onInstructionsChange: (instructions: string) => void;
  disabled?: boolean;
}

const InstructionsChat: React.FC<InstructionsChatProps> = ({ onInstructionsChange, disabled }) => {
  const [input, setInput] = useState('');
  const [activeInstructions, setActiveInstructions] = useState<string[]>([]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    
    const newInstructions = [...activeInstructions, input.trim()];
    setActiveInstructions(newInstructions);
    onInstructionsChange(newInstructions.join('. '));
    setInput('');
  };

  const removeInstruction = (index: number) => {
    const newInstructions = activeInstructions.filter((_, i) => i !== index);
    setActiveInstructions(newInstructions);
    onInstructionsChange(newInstructions.join('. '));
  };

  return (
    <div className="bg-brand-panel border border-brand-light/5 rounded-xl p-5 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-brand-accent" />
        <h3 className="text-sm font-bold text-brand-light font-spartan uppercase tracking-wide">
          AI Instrukce
        </h3>
      </div>

      {/* Seznam aktivních instrukcí */}
      <div className="flex flex-wrap gap-2 mb-4 min-h-[30px]">
        {activeInstructions.length === 0 && (
          <span className="text-xs text-brand-muted italic">Žádné speciální instrukce...</span>
        )}
        {activeInstructions.map((inst, idx) => (
          <div key={idx} className="bg-brand-accent/10 border border-brand-accent/30 text-brand-light text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 animate-in fade-in zoom-in duration-200">
            <span>{inst}</span>
            <button 
              onClick={() => removeInstruction(idx)}
              className="hover:text-brand-accent transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <MessageSquare className="w-4 h-4 text-brand-muted group-focus-within:text-brand-accent transition-colors" />
        </div>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={disabled}
          placeholder="Např: Odstraň pozadí, udělej to v low-poly stylu..."
          className="w-full bg-brand-dark border border-brand-light/10 text-brand-light text-sm rounded-xl pl-10 pr-12 py-3 focus:outline-none focus:border-brand-accent/50 focus:ring-1 focus:ring-brand-accent/50 placeholder:text-brand-muted/50 transition-all"
        />
        <button
          type="submit"
          disabled={disabled || !input.trim()}
          className="absolute right-2 top-1.5 p-1.5 bg-brand-accent text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:bg-brand-panel transition-all"
        >
          <Send className="w-3 h-3" />
        </button>
      </form>
      
      {/* Rychlé nápovědy */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {['High Detail', 'Low Poly', 'Smooth Surface', 'Voxel'].map((tag) => (
            <button
                key={tag}
                type="button"
                onClick={() => { setInput(tag); }}
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-brand-dark border border-brand-light/5 rounded hover:border-brand-accent/50 hover:text-brand-accent transition-all whitespace-nowrap"
            >
                {tag}
            </button>
        ))}
      </div>
    </div>
  );
};

export default InstructionsChat;
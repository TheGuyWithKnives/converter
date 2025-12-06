import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';

interface InstructionsChatProps {
  onInstructionsChange: (instructions: string) => void;
  disabled?: boolean;
}

export default function InstructionsChat({ onInstructionsChange, disabled }: InstructionsChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ text: string; type: 'user' | 'system' }[]>([
    {
      text: 'Zde můžete upravit fotky před generováním 3D modelu.\n\nPodporované úpravy:\n• "Světlejší" nebo "Tmavší"\n• "Více kontrastu" nebo "Méně kontrastu"\n• "Sytější barvy" nebo "Nenasycený"\n• "Ostřejší" nebo "Vyhlazený"\n• "Vysoká kvalita" (kombinace efektů)\n\nPříklad: "Světlejší a ostřejší"',
      type: 'system',
    },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || disabled) return;

    const newMessage = { text: input, type: 'user' as const };
    setMessages((prev) => [...prev, newMessage]);
    onInstructionsChange(input);

    setMessages((prev) => [
      ...prev,
      {
        text: 'Instrukce přidány! Budou zahrnuty při generování 3D modelu.',
        type: 'system',
      },
    ]);

    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearInstructions = () => {
    setMessages([
      {
        text: 'Instrukce byly odstraněny.',
        type: 'system',
      },
    ]);
    onInstructionsChange('');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        disabled={disabled}
      >
        <MessageSquare className="w-5 h-5" />
        <span className="font-medium">Dodatečné instrukce (volitelné)</span>
        {isOpen ? (
          <X className="w-4 h-4 ml-auto" />
        ) : (
          <span className="ml-auto text-xs bg-slate-600 px-2 py-1 rounded">Otevřít</span>
        )}
      </button>

      {isOpen && (
        <div className="mt-3 bg-white border border-slate-300 rounded-lg shadow-lg overflow-hidden">
          <div className="bg-slate-100 border-b border-slate-300 px-4 py-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Chat s AI</h3>
            <button
              onClick={clearInstructions}
              className="text-xs text-red-600 hover:text-red-700 font-medium"
              disabled={disabled}
            >
              Vymazat
            </button>
          </div>

          <div className="h-64 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-slate-300 bg-white">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Napište instrukce pro AI model..."
                disabled={disabled}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                rows={2}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || disabled}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Enter = odeslat, Shift+Enter = nový řádek
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

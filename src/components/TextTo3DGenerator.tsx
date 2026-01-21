import React, { useState } from 'react';
import { meshyService } from '../services/meshyService';

export const TextTo3DGenerator = ({ onModelReady }: { onModelReady: (url: string) => void }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setStatus('Odesílám zadání...');
    try {
      const taskId = await meshyService.createTextTo3D(prompt);
      
      // Polling loop
      const interval = setInterval(async () => {
        const task = await meshyService.getTaskStatus(taskId, 'text-to-3d');
        setStatus(`Generuji: ${task.progress || 0}%`);
        
        if (task.status === 'SUCCEEDED') {
          clearInterval(interval);
          setLoading(false);
          onModelReady(task.model_urls.glb);
        } else if (task.status === 'FAILED') {
          clearInterval(interval);
          setLoading(false);
          setStatus('Chyba při generování.');
        }
      }, 2000);
      
    } catch (e) {
      console.error(e);
      setLoading(false);
      setStatus('Chyba připojení.');
    }
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <h3 className="text-white font-bold mb-2">✨ Text to 3D</h3>
      <textarea 
        className="w-full p-2 rounded bg-gray-700 text-white mb-2"
        placeholder="Např: A futuristic cyberpunk helmet..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <button 
        onClick={handleGenerate}
        disabled={loading || !prompt}
        className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {loading ? status : 'Vygenerovat Model'}
      </button>
    </div>
  );
};
import React, { useState, useEffect, useRef } from 'react';
import { Gamepad2, MousePointer2, Music, Volume2, VolumeX } from 'lucide-react';

export const LoadingEntertainment: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [particles, setParticles] = useState<{x: number, y: number, vx: number, vy: number, color: string}[]>([]);
  
  // Audio state
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Audio
  useEffect(() => {
    // FIX: Cesta k hudbě. Ujistěte se, že soubor existuje.
    audioRef.current = new Audio('/assets/audio/loading-music.mp3'); 
    audioRef.current.loop = true;
    audioRef.current.volume = 0.3;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const toggleMusic = () => {
    if (!audioRef.current) return;
    if (isPlayingMusic) {
      audioRef.current.pause();
    } else {
      // Prohlížeče vyžadují interakci uživatele pro spuštění audia
      audioRef.current.play().catch(e => console.log("Audio play failed (interaction needed first):", e));
    }
    setIsPlayingMusic(!isPlayingMusic);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    let animationId: number;
    const loop = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      setParticles(prev => {
        const next = prev.map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy
        })).filter(p => 
          p.x > 0 && p.x < canvas.width && 
          p.y > 0 && p.y < canvas.height
        );

        if (Math.random() < 0.1) {
          next.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            color: `hsl(${Math.random() * 360}, 70%, 50%)`
          });
        }

        next.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        });

        return next;
      });

      animationId = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  const handleCanvasClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // FIX: Výpočet souřadnic relativně ke canvasu, ne k oknu
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let caught = 0;
    setParticles(prev => {
      const next = prev.filter(p => {
        const dist = Math.sqrt(Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2));
        if (dist < 30) {
          caught++;
          return false;
        }
        return true;
      });
      return next;
    });

    if (caught > 0) {
      setScore(s => s + caught);
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden rounded-xl bg-black/40 backdrop-blur-sm border border-white/10">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <Gamepad2 className="w-5 h-5 text-purple-400" />
        <span className="text-white font-medium">Catch the Lights</span>
      </div>
      
      <div className="absolute top-4 right-4 z-10 flex items-center gap-4">
         {/* Tlačítko pro hudbu */}
         <button 
          onClick={toggleMusic}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-xs text-white/80"
        >
          {isPlayingMusic ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          {isPlayingMusic ? 'Music On' : 'Music Off'}
        </button>

        <div className="px-3 py-1 rounded-full bg-white/10 text-white font-bold">
          Score: {score}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="w-full h-full cursor-crosshair touch-none"
      />
      
      <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
        <p className="text-white/40 text-sm flex items-center justify-center gap-2">
          <MousePointer2 className="w-4 h-4" />
          Click on the lights while you wait!
        </p>
      </div>
    </div>
  );
};
import React, { useState, useEffect, useRef } from 'react';
import { Gamepad2, MousePointer2, Volume2, VolumeX, X as XIcon } from 'lucide-react';

interface LoadingEntertainmentProps {
  progress?: number;
  message?: string;
  onCancel?: () => void;
  cancellable?: boolean;
}

export const LoadingEntertainment: React.FC<LoadingEntertainmentProps> = ({
  progress = 0,
  message = '',
  onCancel,
  cancellable = false,
}) => {
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

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

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

  const progressPercent = Math.round(progress * 100);

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6 items-center px-4">
      <div className="w-full relative overflow-hidden rounded-xl bg-black/40 backdrop-blur-sm border border-white/10" style={{ height: '360px' }}>
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-brand-accent" />
          <span className="text-white font-medium text-sm">Chytni svetylka</span>
        </div>

        <div className="absolute top-4 right-4 z-10 flex items-center gap-3">
          <button
            onClick={toggleMusic}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-xs text-white/80"
          >
            {isPlayingMusic ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <div className="px-3 py-1 rounded-full bg-white/10 text-white font-bold text-sm">
            {score}
          </div>
        </div>

        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="w-full h-full cursor-crosshair touch-none"
        />

        <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
          <p className="text-white/40 text-xs flex items-center justify-center gap-2">
            <MousePointer2 className="w-4 h-4" />
            Klikej na svetylka, zatimco cekas!
          </p>
        </div>
      </div>

      <div className="w-full space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-brand-muted font-medium">{message || 'Zpracovavam...'}</span>
          <span className="text-brand-light font-bold">{progressPercent}%</span>
        </div>
        <div className="w-full h-2 bg-brand-dark rounded-full overflow-hidden border border-brand-border">
          <div
            className="h-full bg-gradient-to-r from-brand-accent to-brand-accent/70 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {cancellable && onCancel && (
          <button
            onClick={onCancel}
            className="w-full py-2.5 bg-brand-dark border border-brand-border hover:border-red-400/50 rounded-xl text-sm font-bold text-brand-muted hover:text-red-400 transition-all flex items-center justify-center gap-2"
          >
            <XIcon className="w-4 h-4" />
            Zrusit
          </button>
        )}
      </div>
    </div>
  );
};

export default LoadingEntertainment;
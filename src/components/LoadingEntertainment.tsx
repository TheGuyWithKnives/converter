import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Gamepad2, MousePointer2, Volume2, VolumeX, X as XIcon, Trophy } from 'lucide-react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  pulse: number;
}

interface LoadingEntertainmentProps {
  progress?: number;
  message?: string;
  onCancel?: () => void;
  cancellable?: boolean;
}

const PREVIOUS_SCORE_KEY = 'loading-game-last-score';
const HIGH_SCORE_KEY = 'loading-game-high-score';

export const LoadingEntertainment: React.FC<LoadingEntertainmentProps> = ({
  progress = 0,
  message = '',
  onCancel,
  cancellable = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const scoreRef = useRef(0);
  const [displayScore, setDisplayScore] = useState(0);
  const [lastScore] = useState(() => {
    const saved = localStorage.getItem(PREVIOUS_SCORE_KEY);
    return saved ? parseInt(saved, 10) : null;
  });
  const [highScore] = useState(() => {
    const saved = localStorage.getItem(HIGH_SCORE_KEY);
    return saved ? parseInt(saved, 10) : 0;
  });

  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    try {
      audioRef.current = new Audio('/assets/audio/loading-music.mp3');
      audioRef.current.loop = true;
      audioRef.current.volume = 0.3;
    } catch (e) {
      console.log('Audio file not found');
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      const finalScore = scoreRef.current;
      if (finalScore > 0) {
        localStorage.setItem(PREVIOUS_SCORE_KEY, finalScore.toString());
        const prevHigh = parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10);
        if (finalScore > prevHigh) {
          localStorage.setItem(HIGH_SCORE_KEY, finalScore.toString());
        }
      }
    };
  }, []);

  const toggleMusic = () => {
    if (!audioRef.current) return;
    try {
      if (isPlayingMusic) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => {});
      }
      setIsPlayingMusic(!isPlayingMusic);
    } catch (e) {
      console.log('Audio play error');
    }
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

    const loop = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.05;

        if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
          particles.splice(i, 1);
          continue;
        }

        const glow = Math.sin(p.pulse) * 0.3 + 0.7;
        const r = p.radius * glow;

        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.restore();

        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fill();
      }

      if (Math.random() < 0.12 && particles.length < 40) {
        const hue = Math.random() * 60 + 170;
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 1.8,
          vy: (Math.random() - 0.5) * 1.8,
          color: `hsl(${hue}, 80%, 60%)`,
          radius: 4 + Math.random() * 3,
          pulse: Math.random() * Math.PI * 2,
        });
      }

      animationRef.current = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const particles = particlesRef.current;
    let caught = 0;

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      const dx = p.x - x;
      const dy = p.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 30) {
        caught++;
        particles.splice(i, 1);
      }
    }

    if (caught > 0) {
      scoreRef.current += caught;
      setDisplayScore(scoreRef.current);
    }
  }, []);

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

          <div className="px-3 py-1 rounded-full bg-white/10 text-white font-bold text-sm tabular-nums">
            {displayScore}
          </div>
        </div>

        {(lastScore !== null || highScore > 0) && (
          <div className="absolute top-12 right-4 z-10 flex flex-col gap-1">
            {lastScore !== null && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 text-white/50 text-xs">
                <span>Minule:</span>
                <span className="font-bold text-white/70 tabular-nums">{lastScore}</span>
              </div>
            )}
            {highScore > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-accent/10 text-brand-accent/70 text-xs">
                <Trophy className="w-3 h-3" />
                <span className="font-bold tabular-nums">{highScore}</span>
              </div>
            )}
          </div>
        )}

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

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Zap, Trophy, MousePointerClick } from 'lucide-react';

interface Orb {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  opacity: number;
  pulsePhase: number;
  sides: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const TIPS = [
  'Pouziti vice uhlu (Multi-View) zvysuje presnost modelu az o 40%.',
  'Kvalitni osvetleni na fotografii = kvalitnejsi textury na 3D modelu.',
  'STL soubory muzete primo nahrat a analyzovat pro 3D tisk.',
  'Rezim "Ultra" pouziva nejnovejsi AI model pro maximalni detail.',
  'Po vygenerovani muzete model retexturovat pomoci AI Retexture.',
  'Rigging umozni pridat kostru a animovat vas model.',
  'Remesh optimalizuje topologii pro lepsí tisknutelnost.',
  'Exportujte do GLB, OBJ, STL nebo PLY podle potreby.',
  'Negativni prompt pomaha odstranit nezadouci prvky z modelu.',
  'PBR materialy pridavaji realisticke odrazy a hrubost povrchu.',
  'Obrazky s cistym pozadim generuji presnejsi 3D modely.',
  'Camera Presets ve vieweru umozni rychle prepnout uhly pohledu.',
];

const ORB_COLORS = [
  '#FF003C', '#FF2D5B', '#FF5C7F',
  '#3B82F6', '#60A5FA',
  '#10B981', '#34D399',
  '#F59E0B', '#FBBF24',
];

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, radius: number,
  sides: number, rotation: number
) {
  ctx.beginPath();
  for (let i = 0; i <= sides; i++) {
    const angle = (i * 2 * Math.PI) / sides + rotation;
    const px = x + radius * Math.cos(angle);
    const py = y + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

interface LoadingEntertainmentProps {
  progress: number;
  message: string;
  onCancel?: () => void;
  cancellable?: boolean;
}

export default function LoadingEntertainment({
  progress, message, onCancel, cancellable = false
}: LoadingEntertainmentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orbsRef = useRef<Orb[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef<number>(0);
  const scoreRef = useRef(0);
  const [score, setScore] = useState(0);
  const [currentTip, setCurrentTip] = useState(0);
  const [tipFade, setTipFade] = useState(true);
  const nextIdRef = useRef(0);
  const timeRef = useRef(0);

  const percentage = Math.min(100, Math.max(0, Math.round(progress * 100)));

  useEffect(() => {
    const interval = setInterval(() => {
      setTipFade(false);
      setTimeout(() => {
        setCurrentTip(prev => (prev + 1) % TIPS.length);
        setTipFade(true);
      }, 300);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const spawnOrb = useCallback((canvasW: number, canvasH: number): Orb => {
    const side = Math.random();
    let x: number, y: number;
    if (side < 0.25) { x = -30; y = Math.random() * canvasH; }
    else if (side < 0.5) { x = canvasW + 30; y = Math.random() * canvasH; }
    else if (side < 0.75) { x = Math.random() * canvasW; y = -30; }
    else { x = Math.random() * canvasW; y = canvasH + 30; }

    const centerX = canvasW / 2;
    const centerY = canvasH / 2;
    const angle = Math.atan2(centerY - y, centerX - x) + (Math.random() - 0.5) * 1.2;
    const speed = 0.4 + Math.random() * 0.8;

    return {
      id: nextIdRef.current++,
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 18 + Math.random() * 22,
      color: ORB_COLORS[Math.floor(Math.random() * ORB_COLORS.length)],
      opacity: 0,
      pulsePhase: Math.random() * Math.PI * 2,
      sides: Math.floor(Math.random() * 4) + 3,
    };
  }, []);

  const spawnParticles = useCallback((x: number, y: number, color: string) => {
    const count = 8 + Math.floor(Math.random() * 6);
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 1.5 + Math.random() * 3;
      newParticles.push({
        id: nextIdRef.current++,
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 0.6 + Math.random() * 0.4,
        color,
        size: 2 + Math.random() * 4,
      });
    }
    particlesRef.current.push(...newParticles);
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    let hit = false;
    orbsRef.current = orbsRef.current.filter(orb => {
      const dx = orb.x - mx;
      const dy = orb.y - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < orb.radius + 8) {
        spawnParticles(orb.x, orb.y, orb.color);
        scoreRef.current += Math.round(10 + (40 - orb.radius));
        setScore(scoreRef.current);
        hit = true;
        return false;
      }
      return true;
    });

    if (!hit) {
      spawnParticles(mx, my, 'rgba(148,163,184,0.5)');
    }
  }, [spawnParticles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = parent.clientWidth * dpr;
      canvas.height = parent.clientHeight * dpr;
      canvas.style.width = `${parent.clientWidth}px`;
      canvas.style.height = `${parent.clientHeight}px`;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 6; i++) {
      orbsRef.current.push(spawnOrb(canvas.width, canvas.height));
    }

    let running = true;

    const animate = () => {
      if (!running) return;
      frameRef.current = requestAnimationFrame(animate);

      const w = canvas.width / Math.min(window.devicePixelRatio, 2);
      const h = canvas.height / Math.min(window.devicePixelRatio, 2);
      timeRef.current += 0.016;

      ctx.clearRect(0, 0, w, h);

      if (orbsRef.current.length < 8 && Math.random() < 0.02) {
        orbsRef.current.push(spawnOrb(w * Math.min(window.devicePixelRatio, 2), h * Math.min(window.devicePixelRatio, 2)));
      }

      orbsRef.current = orbsRef.current.filter(orb => {
        orb.x += orb.vx;
        orb.y += orb.vy;

        if (orb.opacity < 1) orb.opacity = Math.min(1, orb.opacity + 0.02);

        const pulse = Math.sin(timeRef.current * 2 + orb.pulsePhase) * 0.15 + 1;
        const r = orb.radius * pulse;

        const oob = orb.x < -60 || orb.x > w + 60 || orb.y < -60 || orb.y > h + 60;
        if (oob && orb.opacity >= 1) return false;

        ctx.save();
        ctx.globalAlpha = orb.opacity * 0.15;
        ctx.fillStyle = orb.color;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, r * 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = orb.opacity * 0.7;
        ctx.strokeStyle = orb.color;
        ctx.lineWidth = 2;
        const rotation = timeRef.current * 0.5 + orb.pulsePhase;
        drawPolygon(ctx, orb.x, orb.y, r, orb.sides, rotation);
        ctx.stroke();

        ctx.globalAlpha = orb.opacity * 0.25;
        ctx.fillStyle = orb.color;
        drawPolygon(ctx, orb.x, orb.y, r, orb.sides, rotation);
        ctx.fill();

        ctx.globalAlpha = orb.opacity * 0.9;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        return true;
      });

      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.life -= 0.016 / p.maxLife;

        if (p.life <= 0) return false;

        ctx.save();
        ctx.globalAlpha = p.life * 0.8;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return true;
      });
    };

    animate();

    return () => {
      running = false;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [spawnOrb]);

  return (
    <div className="w-full max-w-lg mx-4">
      <div className="bg-brand-panel border border-brand-light/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="relative h-56 sm:h-64 bg-brand-dark cursor-crosshair overflow-hidden group">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="absolute inset-0 w-full h-full"
          />
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-brand-dark/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-brand-light/10 pointer-events-none">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-amber-400 font-mono font-bold text-sm">{score}</span>
          </div>
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-brand-dark/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-brand-light/10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            <MousePointerClick className="w-3.5 h-3.5 text-brand-muted" />
            <span className="text-brand-muted text-[10px] uppercase tracking-wider font-bold">Klikej na tvary!</span>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-brand-light font-bold font-spartan tracking-wide text-sm">
                GENERUJI MODEL
              </span>
              <span className="text-brand-accent font-mono font-bold text-sm">{percentage}%</span>
            </div>

            <div className="w-full h-2.5 bg-brand-dark rounded-full overflow-hidden border border-brand-light/5">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out relative"
                style={{
                  width: `${percentage}%`,
                  background: 'linear-gradient(90deg, #FF003C, #FF5C7F, #FF003C)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 2s linear infinite',
                }}
              >
                <div className="absolute inset-0 bg-white/20 rounded-full" style={{
                  animation: 'pulse-bar 1.5s ease-in-out infinite',
                }} />
              </div>
            </div>

            <p className="text-center text-xs text-brand-muted uppercase tracking-wider font-bold">
              {message}
            </p>
          </div>

          <div className="bg-brand-dark/50 rounded-xl p-3.5 border border-brand-light/5 min-h-[52px] flex items-start gap-3">
            <div className="bg-brand-accent/15 p-1.5 rounded-lg flex-shrink-0 mt-0.5">
              <Zap className="w-3.5 h-3.5 text-brand-accent" />
            </div>
            <p className={`text-xs text-brand-muted leading-relaxed transition-opacity duration-300 ${tipFade ? 'opacity-100' : 'opacity-0'}`}>
              {TIPS[currentTip]}
            </p>
          </div>

          {cancellable && onCancel && (
            <button
              onClick={onCancel}
              className="w-full py-2.5 border border-brand-light/10 rounded-xl text-brand-muted text-xs font-bold hover:text-brand-light hover:border-brand-accent/30 transition-all flex items-center justify-center gap-2"
            >
              <X className="w-3.5 h-3.5" /> Zrusit generovani
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes pulse-bar {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

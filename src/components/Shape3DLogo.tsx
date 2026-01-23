import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export const Shape3DLogo: React.FC<LogoProps> = ({ className = "w-8 h-8", showText = true }) => {
  return (
    <div className="flex items-center gap-3 select-none">
      {/* SVG Icon - Concept: Folded Plane / Transformation from 2D to 3D */}
      <svg 
        viewBox="0 0 32 32" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className={className}
        aria-label="Shape3D Logo"
      >
        <defs>
          <linearGradient id="logoGradient" x1="0" y1="32" x2="32" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2563EB" /> {/* blue-600 */}
            <stop offset="100%" stopColor="#60A5FA" /> {/* blue-400 */}
          </linearGradient>
        </defs>
        
        {/* Base Plane (2D foundation) */}
        <path 
          d="M4 20 L16 26 L28 20 L16 14 L4 20Z" 
          fill="currentColor" 
          className="text-blue-600 opacity-90"
        />
        
        {/* Rising/Folded Plane (3D vertical aspect) */}
        <path 
          d="M4 20 L4 8 L16 14 L16 26 L4 20Z" 
          fill="url(#logoGradient)" 
        />
        
        {/* Top/Side Plane connecting them (Completing the dimension) */}
        <path 
          d="M16 14 L16 26 L28 20 L28 8 L16 14Z" 
          fill="currentColor" 
          className="text-blue-500 opacity-80"
        />
        
        {/* Wireframe overlay accents for 'Technical' feel */}
        <path 
          d="M16 14 L16 26 M16 14 L28 8 M16 14 L4 20" 
          stroke="white" 
          strokeWidth="0.5" 
          strokeOpacity="0.3" 
        />
      </svg>
      
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">
            Shape<span className="text-blue-600">3D</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default Shape3DLogo;
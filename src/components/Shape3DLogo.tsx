import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export const Shape3DLogo: React.FC<LogoProps> = ({ className = "w-8 h-8", showText = true }) => {
  return (
    <div className="flex items-center gap-3 select-none">
      {/* SVG Icon - Concept: Folded Plane 
          Používá 'currentColor' pro adaptaci na barvu textu rodiče 
          a 'text-brand-accent' pro zvýrazněné části.
      */}
      <svg 
        viewBox="0 0 32 32" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className={`${className} text-brand-accent`}
        aria-label="Shape3D Logo"
      >
        <defs>
          <linearGradient id="logoGradient" x1="0" y1="32" x2="32" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="currentColor" stopOpacity="1.0" /> 
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        
        {/* Base Plane (2D foundation) */}
        <path 
          d="M4 20 L16 26 L28 20 L16 14 L4 20Z" 
          fill="currentColor" 
          className="opacity-20" 
        />
        
        {/* Rising/Folded Plane (3D vertical aspect) */}
        <path 
          d="M4 20 L4 8 L16 14 L16 26 L4 20Z" 
          fill="url(#logoGradient)" 
        />
        
        {/* Top/Side Plane connecting them */}
        <path 
          d="M16 14 L16 26 L28 20 L28 8 L16 14Z" 
          fill="currentColor" 
          className="opacity-40" 
        />
        
        {/* Wireframe overlay accents */}
        <path 
          d="M16 14 L16 26 M16 14 L28 8 M16 14 L4 20" 
          stroke="currentColor" 
          strokeWidth="0.5" 
          className="opacity-50"
        />
      </svg>
      
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="font-bold text-xl tracking-tight text-brand-light">
            Shape<span className="text-brand-accent">3D</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default Shape3DLogo;
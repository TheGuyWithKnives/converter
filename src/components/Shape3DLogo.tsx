import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export const Shape3DLogo: React.FC<LogoProps> = ({ className = "w-8 h-8", showText = true }) => {
  return (
    <div className="flex items-center gap-3 select-none">
      {/* SVG Icon - Concept: Folded Plane
        Používáme 'text-brand-accent' na hlavním SVG elementu.
        Uvnitř pak 'currentColor' přebírá tuto akcentovou barvu.
      */}
      <svg 
        viewBox="0 0 32 32" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        // ZDE JE KLÍČOVÁ ZMĚNA: Nastavíme základní barvu ikonky na brand-accent
        className={`${className} text-brand-accent`}
        aria-label="Shape3D Logo"
      >
        <defs>
          {/* Gradient nyní používá currentColor, takže se přizpůsobí text-brand-accent */}
          <linearGradient id="logoGradient" x1="0" y1="32" x2="32" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="currentColor" stopOpacity="1.0" /> 
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        
        {/* Base Plane (2D foundation) - Tmavší podstava */}
        <path 
          d="M4 20 L16 26 L28 20 L16 14 L4 20Z" 
          fill="currentColor" 
          className="opacity-20" // Velmi jemná průhlednost akcentové barvy
        />
        
        {/* Rising/Folded Plane (3D vertical aspect) - Hlavní zářící část */}
        <path 
          d="M4 20 L4 8 L16 14 L16 26 L4 20Z" 
          fill="url(#logoGradient)" 
        />
        
        {/* Top/Side Plane connecting them - Střední jas */}
        <path 
          d="M16 14 L16 26 L28 20 L28 8 L16 14Z" 
          fill="currentColor" 
          className="opacity-40" // Střední průhlednost
        />
        
        {/* Wireframe overlay accents - Jemné linky v akcentové barvě */}
        <path 
          d="M16 14 L16 26 M16 14 L28 8 M16 14 L4 20" 
          stroke="currentColor" 
          strokeWidth="0.5" 
          className="opacity-50"
        />
      </svg>
      
      {showText && (
        <div className="flex flex-col leading-none">
          {/* Text používá brand-light pro hlavní část a brand-accent pro "3D" */}
          <span className="font-bold text-xl tracking-tight text-brand-light">
            Shape<span className="text-brand-accent">3D</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default Shape3DLogo;
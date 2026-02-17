/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
   theme: {
    extend: {
      colors: {
        brand: {
           // Tady je tvoje fialová absolutním králem - tvoří celou plochu
        bg: '#21024F',          // TVOJE HLAVNÍ FIALOVÁ (na <body> tag)
        // Panely nejsou plné barvy, ale poloprůhledné bílé/černé přes tu fialovou
        // V Tailwindu použiješ např. bg-brand-panel backdrop-blur-md
        panel: '#ffffff0d',     // 5% bílá pro skleněný efekt
        surface: '#ffffff1a',   // 10% bílá pro hover stavy na skle
        border: '#ffffff33',    // 20% bílá pro tenké ohraničení skla
        // Zbytek tvých barev slouží pro čistá, plná tlačítka plovoucí na skle
        primary: '#00b2bf',     // Azurová (Hlavní akce)
        secondary: '#d35470',   // Růžová (Sekundární akce)
        tertiary: '#E76F4B',    // Oranžová (Zvýraznění)
        spark: '#FACC15',       // Žlutá (Drobné jiskry, např. loading indikátor)
        light: '#FFFFFF',       // Ostrá bílá pro text, aby na skle vynikl
        muted: '#a390c4',
        }
      },
      fontFamily: {
        spartan: ['"League Spartan"', 'sans-serif'],
        sans: ['"Inter"', '"Arial Nova"', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(255, 0, 60, 0.3)',
        'glow-strong': '0 0 30px rgba(255, 0, 60, 0.5)',
        'panel': '0 4px 24px rgba(0, 0, 0, 0.4)',
        'elevated': '0 8px 32px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

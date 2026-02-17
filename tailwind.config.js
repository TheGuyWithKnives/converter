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
         dark: '#12012B',        // Ještě hlubší fialová pro pozadí
        panel: '#21024F',       // TVOJE HLAVNÍ FIALOVÁ (panely)
        surface: '#2D0A5E',     // Světlejší fialová (karty)
        border: '#4C1D95',      // Fialové ohraničení
        accent: '#FACC15',      // NOVÁ ŽLUTÁ (Elektrická - hlavní tlačítka)
        'accent-soft': '#FACC1526', // Žlutá záře
        secondary: '#00b2bf',   // Tvoje azurová (sekundární prvky)
        highlight: '#d35470',   // Tvoje růžová (detaily)
        
        light: '#FEF9C3',       // Jemně nažloutlá bílá (příjemnější pro oči než čistá bílá)
        muted: '#A78BFA',
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

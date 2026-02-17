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
          dark: '#1a053a',        // Temně fialová (teplejší odstín pro pozadí)
        panel: '#21024F',       // TVOJE HLAVNÍ FIALOVÁ (všechny hlavní prvky UI)
        surface: '#2c0466',     // Jemný přechod pro aktivní prvky
        border: '#4a154b',      // Tlumené ohraničení (do ruda/fialova)
        accent: '#E76F4B',      // Tvoje oranžová je zde hlavní hvězdou (CTA tlačítka)
        'accent-soft': '#E76F4B1A',
        highlight: '#d35470',   // Růžová pro aktivní stavy v menu, tagy
        spark: '#FACC15',       // Žlutá pro hodnocení, "Pro" odznaky, úspěch
        info: '#00b2bf',        // Azurová pouze pro informační tooltipy/bubliny
        
        light: '#FFF1F2',       // Bílá s nepatrným teplým nádechem
        muted: '#9f85c7',
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

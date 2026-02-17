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
           dark: '#1a0b2e',        // Tmavá fialová s teplým nádechem
        panel: '#21024F',       // TVOJE HLAVNÍ FIALOVÁ
        surface: '#3E1061',     // Světlejší fialová (hover)
        border: '#d354704d',    // Růžové ohraničení (jemné)
        accent: '#E76F4B',      // Oranžová (Hlavní akce)
        highlight: '#d35470',   // Růžová (Links, aktivní stavy)
        info: '#00b2bf',        // Azurová (jen pro info boxy)
        gold: '#FDE047',        // Jemná žlutá (Premium features)
        light: '#FFF1F2',       // Bílá s lehkým nádechem růžové (velmi příjemné)
        muted: '#9F8EA1',
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

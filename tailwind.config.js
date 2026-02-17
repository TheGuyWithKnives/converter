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
          dark: '#0f0518',        // Velmi tmavá "spálená" fialová
        panel: '#21024F',       // TVOJE HLAVNÍ FIALOVÁ
        // Gradientní prvky
        fire: '#E76F4B',        // Oranžová (začátek gradientu)
        berry: '#d35470',       // Růžová (konec gradientu)
        // Speciální barva pro interakci
        accent: '#E76F4B',      // Hlavní akční barva
        'accent-glow': '#E76F4B40', // Oranžová záře kolem inputů
        surface: '#33104a',     // Fialová s nádechem do červena
        border: '#d35470',      // Růžové linky
        light: '#FFF0ED',       // Teplá bílá (barva papíru)
        muted: '#9F7AEA',
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

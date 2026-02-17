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
          dark: '#0B0C10',        // Původní tmavá (dobře funguje)
        panel: '#161620',       // Neutrální tmavá
        surface: '#21024F',     // TVOJE HLAVNÍ FIALOVÁ (použita pro vybrané položky/menu)
        border: '#d35470',      // Tvoje růžová (tenké linky, velmi stylové)
        accent: '#d35470',      // Růžová jako hlavní akcent
        'accent-soft': '#d3547026',
        light: '#FFFFFF',
        muted: '#A0A0A0',
        'muted-soft': '#404040',
        // Doporučení: Použij gradient z Fialové (#21024F) do Azurové (#00b2bf)
        // pro hlavní tlačítka nebo pozadí hlavičky.
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

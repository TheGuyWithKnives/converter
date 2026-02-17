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
          dark: '#050505',        // Téměř černá
        panel: '#0F0B15',       // Velmi tmavá s nádechem fialové
        surface: '#1A1525',     // O něco světlejší
        border: '#21024F',      // TVOJE HLAVNÍ FIALOVÁ (rámečky, oddělovače)
        accent: '#E76F4B',      // Tvoje oranžová (hlavní tlačítka)
        'accent-soft': '#E76F4B26', 
        light: '#EEEEEE',
        muted: '#94A3B8',
        'muted-soft': '#334155',
        // Speciální klíče pro gradienty nebo detaily
        primary: '#21024F',     // Pro nadpisy nebo loga
        cyan: '#00b2bf',        // Pro info prvky
        pink: '#d35470',
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

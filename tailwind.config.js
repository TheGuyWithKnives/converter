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
          dark: '#110022',        // Téměř černá s fialovým podtónem (hlavní pozadí)
        panel: '#21024F',       // TVOJE HLAVNÍ FIALOVÁ (karty, menu, modaly)
        surface: '#330570',     // Světlejší fialová (hover na kartách)
        border: '#d35470',      // Tvoje růžová jako tenké neonové ohraničení karet
        accent: '#00b2bf',      // Azurová (primární tlačítka - svítí ve tmě)
        'accent-soft': '#00b2bf26', 
        action: '#E76F4B',      // Oranžová (sekundární tlačítka nebo přepínače)
        warning: '#FACC15',     // Žlutá (pouze pro varování, errory, nebo ikony)
        light: '#F8FAFC',
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

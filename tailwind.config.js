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
         // --- ZÁKLAD ---
        dark: '#0a0118',        // Téměř černá s fialovým nádechem (pozadí body)
        panel: '#21024F',       // TVOJE HLAVNÍ FIALOVÁ (karty, sidebar, hlavička)
        surface: '#2d0363',     // O něco světlejší fialová (pro hover na kartách)
        border: '#3e1075',      // Tmavě fialové ohraničení (aby nerušilo)
        // --- HLAVNÍ AKCE ---
        accent: '#00b2bf',      // Azurová (Hlavní tlačítka, aktivní taby)
        'accent-soft': '#00b2bf1A', // Jemná záře pod tlačítky
        secondary: '#E76F4B',   // Oranžová (Call to Action - např. "Koupit PRO")
        tertiary: '#d35470',    // Růžová (Srdíčka, mazání, speciální tagy)
        // --- "JISKRA" (ŽLUTÁ) ---
        // Použij jen na maličkosti: loading spinner, hvězdička hodnocení, 
        // focus rámeček inputu, nebo odznak "NOVÉ"
        spark: '#FACC15',       
        'spark-soft': '#FACC151A',
        // --- TEXT ---
        light: '#F8FAFC',       // Bílý text
        muted: '#94A3B8',       // Šedý text
        'muted-soft': '#475569',
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

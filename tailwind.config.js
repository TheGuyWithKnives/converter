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
           dark: '#000000',        // Čistá černá
        panel: '#0F0B15',       // Skoro černá
        surface: '#21024F',     // TVOJE HLAVNÍ FIALOVÁ (pouze vybrané prvky)
        border: '#21024F',      // Fialové ohraničení (splývá s designem)
        primary: '#FFFFFF',     // Bílá tlačítka (největší trend teď - maximální kontrast)
        accent: '#d35470',      // Růžová (textové odkazy)
        secondary: '#00b2bf',   // Azurová (ikonky)
        tertiary: '#E76F4B',    // Oranžová (detaily)
        spark: '#FEF08A',       // Velmi světlá žlutá (tooltipy)
        light: '#F8FAFC',
        muted: '#52525b',
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

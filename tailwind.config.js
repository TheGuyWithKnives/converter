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
          dark: '#150133',        // Tmavší stín fialové
        panel: '#21024F',       // TVOJE HLAVNÍ FIALOVÁ (střední)
        surface: '#320473',     // Světlejší fialová (vrch)
        highlight: '#4c1d95',   // Nej světlejší fialová (hover)
        // Laser
        laser: '#00b2bf',       // Azurová (pouze 1px border, ikonky, text linky)
        'laser-dim': '#00b2bf33', // Průhledná azurová pro pozadí tabulky
        // Funkční barvy
        destructive: '#E76F4B', // Oranžová (Delete / Cancel)
        light: '#FFFFFF',       // Čistá bílá (maximální kontrast)
        muted: '#a5b4fc',
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

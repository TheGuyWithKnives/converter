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
          dark: '#160036',        // Hluboká temná fialová (skoro černá)
        panel: '#21024F',       // TVOJE HLAVNÍ FIALOVÁ (karty)
        // Zde je ten trik: Dvě barvy bojují o pozornost
        cyan: '#00b2bf',        // Použij na Text / Ikonky / Linky
        pink: '#d35470',        // Použij na Tlačítka / Ohraničení / Aktivní stavy
        // Smíchaná barva pro neutrální prvky (jemně do fialova)
        surface: '#2a0a5e',     
        border: '#d3547080',    // Poloprůhledná růžová
        light: '#E0F7FA',       // Azurově bílá (ne čistě bílá)
        muted: '#8B5CF6',
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

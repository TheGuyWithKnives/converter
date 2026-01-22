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
          dark: '#0B0C10',    // Hlavní pozadí (Deep Black)
          panel: '#0F172A',   // Panely (Dark Blue-Grey)
          accent: '#FF003C',  // Akční barva (Neon Red)
          light: '#F4F4F4',   // Text (Off-White)
          muted: '#94A3B8',   // Tlumený text (pro popisky)
        }
      },
      fontFamily: {
        spartan: ['"League Spartan"', 'sans-serif'],
        sans: ['"Arial Nova"', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(255, 0, 60, 0.3)', // Červená záře
        'glow-strong': '0 0 30px rgba(255, 0, 60, 0.5)',
      }
    },
  },
  plugins: [],
}
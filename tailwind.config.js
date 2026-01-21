/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Barvy dle GENZEO manuálu
        brand: {
          dark: '#0B0C10',    // Hlavní pozadí
          panel: '#0F172A',   // Panely a karty
          accent: '#FF003C',  // Hlavní akční barva (Červená)
          light: '#F4F4F4',   // Text a světlé prvky
        }
      },
      fontFamily: {
        // Primární font pro nadpisy
        spartan: ['"League Spartan"', 'sans-serif'],
        // Sekundární font pro text (fallback na Arial/Sans)
        sans: ['"Arial Nova"', 'Arial', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
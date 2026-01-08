/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./App.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bilt: {
          bg: '#121212',       // Deep Black/Charcoal
          card: '#1E1E1E',     // Slightly lighter for cards
          teal: '#4DB6AC',     // Signature Bilt Teal
          gold: '#C5A059',     // Gold Status
          platinum: '#E5E4E2', // Platinum Status
          blue: '#3B82F6',     // Blue Status
          border: '#333333',   // Thin borders
        }
      },
    },
  },
  plugins: [],
}
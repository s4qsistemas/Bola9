/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // CRÍTICO: Aquí le decimos que escanee todos tus componentes de React
  ],
  theme: {
    extend: {
      colors: {
        // Podremos agregar los colores corporativos del Pool aquí más adelante
        brand: {
          dark: '#0f172a',
          primary: '#10b981', // Un verde "paño de mesa de pool"
        }
      }
    },
  },
  plugins: [],
}
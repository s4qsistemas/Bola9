import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,       // 👈 Vital: Expone la app a la red (0.0.0.0). Permite entrar desde el celular.
    port: 5173,       // Fija el puerto (opcional, pero recomendado).
    strictPort: true, // Si el 5173 está ocupado, falla en vez de cambiar al 5174 (bueno para configuraciones fijas).
    cors: true,       // Habilita CORS para todo.
    allowedHosts: ['irresponsibly-prespecific-kobe.ngrok-free.dev'],// Descomenta esto si usas Vite 6 y te bloquea al usar ngrok o túneles.

    // 👇 Como tienes un Backend en Node/Express, ESTO ES MUY IMPORTANTE:
    proxy: {
      '/api': { // O la ruta que uses para tu backend
        target: 'http://127.0.0.1:3000', // El puerto donde corre tu Express
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Forzamos el API base en dev/proxy para evitar valores “fantasma” en import.meta.env
    "import.meta.env.VITE_API_URL": JSON.stringify("/api"),
  },
  server: {
    host: true,
    port: 8081,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://api:3000', changeOrigin: true },
    },
  },
})

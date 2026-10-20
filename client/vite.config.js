import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The dev server proxies /api and /socket.io to the Express backend, so no CORS setup is needed locally.
const target = process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:5000'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target, changeOrigin: true },
      '/socket.io': { target, ws: true, changeOrigin: true },
    },
  },
})

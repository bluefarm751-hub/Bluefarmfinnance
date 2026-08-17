import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forward all /api calls to the backend during `npm run dev`.
      // Without this, requests silently fail against the Vite dev
      // server itself (port 5173) instead of the API (port 3001),
      // which used to surface as a misleading "Invalid username or
      // password" error even with correct credentials.
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})

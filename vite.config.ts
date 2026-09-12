import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { host: true, allowedHosts: true, port: 5173 },
  preview: { host: true, allowedHosts: true, port: 4173 },
  build: { outDir: 'dist', chunkSizeWarningLimit: 1200 },
})

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Three.js is a single large chunk by nature and is already split out
    // of the main bundle via a dynamic import, so the default 500kB
    // warning only ever fires for that one expected chunk.
    chunkSizeWarningLimit: 1000,
  },
})

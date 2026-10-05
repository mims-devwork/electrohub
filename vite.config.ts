import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  // three.js is one big, cacheable chunk; that's expected.
  build: { chunkSizeWarningLimit: 1100 },
})

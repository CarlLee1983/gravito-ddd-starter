import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '~': path.resolve(__dirname, './resources/js'),
    },
  },
  build: {
    outDir: 'dist/public',
    manifest: true,
    rollupOptions: {
      input: 'resources/js/app.tsx',
    },
  },
  server: {
    strictPort: true,
    port: 5173,
    hmr: {
      host: 'localhost',
    },
  },
})

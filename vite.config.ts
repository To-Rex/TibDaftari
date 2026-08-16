import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5180,
    open: false,
  },
  // Pre-bundle every runtime dependency up front so Vite never re-optimizes
  // mid-session (which invalidates in-flight lazy route imports).
  optimizeDeps: {
    include: [
      'react', 'react-dom', 'react-dom/client', 'react-router-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime',
      '@tanstack/react-query', '@tanstack/react-table', '@tanstack/react-virtual', 'zustand',
      'react-hook-form', 'zod', '@hookform/resolvers/zod', 'i18next', 'react-i18next', 'i18next-browser-languagedetector',
      'motion/react', 'lucide-react', 'clsx', 'tailwind-merge', 'date-fns', 'date-fns/locale',
    ],
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/[\/](react|react-dom|react-router|react-router-dom|scheduler)[\/]/.test(id)) return 'react'
          if (id.includes('@tanstack')) return 'query'
          if (id.includes('/motion') || id.includes('framer')) return 'motion'
          if (id.includes('i18next')) return 'i18n'
          if (id.includes('lucide')) return 'icons'
          return 'vendor'
        },
      },
    },
  },
})

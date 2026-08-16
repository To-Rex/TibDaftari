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

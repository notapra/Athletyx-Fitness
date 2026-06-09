import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/athletyx': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => {
          if (path === '/api/athletyx/health') return '/health'
          return path.replace(/^\/api\/athletyx/, '/api')
        },
      },
    },
  },
})

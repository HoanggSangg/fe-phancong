import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('exceljs')) return 'exceljs';
            if (id.includes('recharts') || id.includes('d3-')) return 'charts';
            if (id.includes('@mui')) return 'mui';
            if (id.includes('react-dom') || id.includes('/react/')) return 'react-vendor';
            if (id.includes('@tanstack')) return 'query';
          }
          return undefined;
        },
      },
    },
  },
})

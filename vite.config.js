import fs from 'node:fs'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { httpToHttpsRedirectPlugin } from './plugins/httpToHttpsRedirect.js'
import { ensureCert, keyFile, certFile } from './scripts/ensure-dev-cert.mjs'

const resolveHttps = () => {
  try {
    ensureCert()
  } catch (error) {
    console.warn('[dev-cert] Không tạo được cert mkcert:', error?.message || error)
  }

  if (fs.existsSync(keyFile) && fs.existsSync(certFile)) {
    return {
      key: fs.readFileSync(keyFile),
      cert: fs.readFileSync(certFile),
    }
  }
  return true
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // HTTPS mặc định: camera điện thoại cần secure context trên IP LAN.
  // Tắt: .env.local → VITE_DEV_HTTPS=false
  const useHttps = (env.VITE_DEV_HTTPS || process.env.VITE_DEV_HTTPS || 'true') !== 'false'

  return {
    plugins: [
      react(),
      ...(useHttps ? [httpToHttpsRedirectPlugin({ enabled: true })] : []),
    ],
    server: {
      host: '0.0.0.0',
      port: 5173,
      https: useHttps ? resolveHttps() : false,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        '/socket.io': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          ws: true,
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: 5173,
      https: useHttps,
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
  }
})

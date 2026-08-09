import fs from 'node:fs'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { ensureCert, keyFile, certFile } from './scripts/ensure-dev-cert.mjs'

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // HTTPS mặc định: camera điện thoại cần secure context trên IP LAN.
  // Tắt: .env.local → VITE_DEV_HTTPS=false
  const useHttps = (env.VITE_DEV_HTTPS || process.env.VITE_DEV_HTTPS || 'true') !== 'false'

  let httpsOption = false
  if (useHttps) {
    const ok = await ensureCert()
    if (ok && fs.existsSync(keyFile) && fs.existsSync(certFile)) {
      httpsOption = {
        key: fs.readFileSync(keyFile),
        cert: fs.readFileSync(certFile),
      }
    } else {
      console.warn(
        '[dev-cert] Không có cert mkcert — Vite sẽ dùng cert tạm (Chrome dễ báo lỗi SSL).',
      )
      httpsOption = true
    }
  }

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      https: httpsOption,
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
      https: httpsOption,
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

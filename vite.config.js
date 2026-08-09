import fs from 'node:fs'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { ensureCert, keyFile, certFile } from './scripts/ensure-dev-cert.mjs'
import { httpToHttpsRedirectPlugin } from './plugins/httpToHttpsRedirect.js'
import { printAccessUrlsPlugin } from './plugins/printAccessUrls.js'

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // HTTPS mặc định: camera điện thoại cần secure context trên IP LAN.
  // Tắt: .env.local → VITE_DEV_HTTPS=false
  const useHttps = (env.VITE_DEV_HTTPS || process.env.VITE_DEV_HTTPS || 'true') !== 'false'
  const publicPort = Number(env.VITE_DEV_PORT || process.env.VITE_DEV_PORT || 5173)
  // Vite HTTPS nội bộ; proxy công khai :publicPort nhận cả http→https và TLS.
  const vitePort = useHttps ? publicPort + 2 : publicPort

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
    plugins: [
      react(),
      ...(useHttps
        ? [
            httpToHttpsRedirectPlugin({
              enabled: true,
              publicPort,
              vitePort,
            }),
          ]
        : [printAccessUrlsPlugin()]),
    ],
    server: {
      // HTTPS: chỉ localhost; LAN/Tailscale vào qua proxy :publicPort
      host: useHttps ? '127.0.0.1' : '0.0.0.0',
      port: vitePort,
      strictPort: true,
      https: httpsOption,
      allowedHosts: true,
      hmr: useHttps
        ? {
            protocol: 'wss',
            clientPort: publicPort,
          }
        : true,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
        },
        '/socket.io': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
          ws: true,
          secure: false,
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: publicPort,
      https: httpsOption,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('exceljs')) return 'exceljs'
              if (id.includes('recharts') || id.includes('d3-')) return 'charts'
              if (id.includes('@mui')) return 'mui'
              if (id.includes('react-dom') || id.includes('/react/')) return 'react-vendor'
              if (id.includes('@tanstack')) return 'query'
            }
            return undefined
          },
        },
      },
    },
  }
})

import http from 'node:http'
import {
  ACCESS_LAN_URL,
  ACCESS_LOCAL_URL,
  ACCESS_TAILSCALE_URL,
} from '../src/constants/accessUrls.js'

const PUBLIC_PORT = Number(process.env.VITE_DEV_PORT || 5173)
/** Cổng HTTP phụ: chuyển sang https:// cùng host:5173 (không đụng TLS/WebSocket). */
const HTTP_REDIRECT_PORT = Number(
  process.env.VITE_HTTP_REDIRECT_PORT || PUBLIC_PORT + 1,
)

/**
 * Vite lắng nghe HTTPS trực tiếp trên :5173 (HMR + /socket.io ổn định).
 * HTTP redirect chạy cổng riêng để tránh TCP peek-proxy làm timeout WebSocket.
 */
export function httpToHttpsRedirectPlugin({ enabled = true } = {}) {
  /** @type {import('node:http').Server | null} */
  let redirectServer = null

  return {
    name: 'http-to-https-redirect',
    apply: 'serve',
    configureServer(server) {
      if (!enabled) return

      const print = () => {
        console.log('')
        console.log('  Dev HTTPS (Vite lắng nghe trực tiếp — HMR/WebSocket ổn định):')
        console.log(`  ➜  Máy cũ (Tailscale): ${ACCESS_TAILSCALE_URL}`)
        console.log(`  ➜  LAN:       ${ACCESS_LAN_URL}`)
        console.log(`  ➜  Local:     ${ACCESS_LOCAL_URL}`)
        if (redirectServer) {
          console.log(
            `  HTTP :${HTTP_REDIRECT_PORT} → tự chuyển https://…:${PUBLIC_PORT}`,
          )
        }
        console.log('')
      }

      const startRedirect = () => {
        if (redirectServer) return

        redirectServer = http.createServer((req, res) => {
          const hostHeader = req.headers.host || `localhost:${HTTP_REDIRECT_PORT}`
          const hostname = hostHeader.replace(/:\d+$/, '')
          const target = `https://${hostname}:${PUBLIC_PORT}${req.url || '/'}`
          res.writeHead(301, {
            Location: target,
            'Cache-Control': 'no-store',
          })
          res.end(`Redirecting to ${target}`)
        })

        redirectServer.on('error', (err) => {
          console.warn(
            `\n[http→https] Không mở HTTP :${HTTP_REDIRECT_PORT} — ${err.message}`,
          )
          redirectServer = null
        })

        redirectServer.listen(HTTP_REDIRECT_PORT, '0.0.0.0', () => {
          print()
        })
      }

      server.httpServer?.once('listening', () => {
        startRedirect()
        if (!redirectServer) print()
      })

      return () => {
        const run = () => {
          startRedirect()
          if (!redirectServer) print()
        }
        if (server.httpServer?.listening) run()
        else server.httpServer?.once('listening', run)
      }
    },
    buildEnd() {
      redirectServer?.close()
      redirectServer = null
    },
  }
}

import net from 'node:net'
import os from 'node:os'

const PUBLIC_PORT = Number(process.env.VITE_DEV_PORT || 5173)
const INTERNAL_PORT = Number(process.env.VITE_INTERNAL_PORT || PUBLIC_PORT + 10000)

const lanIpv4 = () => {
  const ips = []
  for (const nic of Object.values(os.networkInterfaces())) {
    for (const addr of nic || []) {
      if (addr.family === 'IPv4' && !addr.internal) ips.push(addr.address)
    }
  }
  return ips
}

/**
 * Public :5173 cho mọi link.
 * - HTTPS Vite chạy nội bộ 127.0.0.1:(5173+10000)
 * - Peek proxy 0.0.0.0:5173: TLS → Vite, HTTP → 301 https://host:5173/...
 */
export function httpToHttpsRedirectPlugin({ enabled = true } = {}) {
  /** @type {import('node:net').Server | null} */
  let peekServer = null

  return {
    name: 'http-to-https-redirect',
    apply: 'serve',
    config() {
      if (!enabled) return
      return {
        server: {
          host: '127.0.0.1',
          port: INTERNAL_PORT,
          // Nếu cổng nội bộ bị chiếm, Vite tự nhảy; peek dùng port thực tế sau khi listen
          strictPort: false,
          hmr: {
            protocol: 'wss',
            clientPort: PUBLIC_PORT,
          },
        },
      }
    },
    configureServer(server) {
      if (!enabled) return

      const startPeek = () => {
        if (peekServer) return

        const addr = server.httpServer?.address()
        const internalPort =
          addr && typeof addr === 'object' && addr.port ? addr.port : INTERNAL_PORT

        peekServer = net.createServer((socket) => {
          socket.once('data', (chunk) => {
            const isTls = chunk[0] === 0x16 || chunk[0] === 0x80

            if (isTls) {
              const upstream = net.connect(internalPort, '127.0.0.1', () => {
                upstream.write(chunk)
                socket.pipe(upstream)
                upstream.pipe(socket)
              })
              upstream.on('error', () => socket.destroy())
              socket.on('error', () => upstream.destroy())
              return
            }

            const head = chunk.toString('utf8')
            const firstLine = head.split(/\r?\n/, 1)[0] || ''
            const pathMatch = firstLine.match(
              /^(?:GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)\s+(\S+)/i,
            )
            const urlPath = pathMatch?.[1] || '/'
            const hostMatch = head.match(/host:\s*([^\r\n]+)/i)
            const rawHost = hostMatch?.[1]?.trim() || `localhost:${PUBLIC_PORT}`
            const hostname = rawHost.replace(/:\d+$/, '')
            const target = `https://${hostname}:${PUBLIC_PORT}${urlPath}`
            const body = `Đang chuyển sang HTTPS: ${target}`

            socket.write(
              'HTTP/1.1 301 Moved Permanently\r\n' +
                `Location: ${target}\r\n` +
                'Cache-Control: no-store\r\n' +
                'Connection: close\r\n' +
                'Content-Type: text/plain; charset=utf-8\r\n' +
                `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n` +
                body,
            )
            socket.end()
          })

          socket.on('error', () => socket.destroy())
        })

        peekServer.on('error', (err) => {
          console.warn(`\n[http→https] Không mở được :${PUBLIC_PORT} — ${err.message}`)
          if (err.code === 'EADDRINUSE') {
            console.warn(`[http→https] Cổng ${PUBLIC_PORT} đang bị chiếm. Tắt process cũ rồi chạy lại.\n`)
          }
        })

        peekServer.listen(PUBLIC_PORT, '0.0.0.0', () => {
          console.log('')
          console.log(`  ➜  Local:   https://localhost:${PUBLIC_PORT}/`)
          for (const ip of lanIpv4()) {
            console.log(`  ➜  Network: https://${ip}:${PUBLIC_PORT}/`)
          }
          console.log(`  ➜  HTTP cũ  http://*:${PUBLIC_PORT}/ → https://*:${PUBLIC_PORT}/`)
          console.log('')
        })
      }

      const onListening = () => startPeek()
      server.httpServer?.once('listening', onListening)

      return () => {
        if (server.httpServer?.listening) startPeek()
        else server.httpServer?.once('listening', onListening)
      }
    },
    buildEnd() {
      peekServer?.close()
      peekServer = null
    },
  }
}

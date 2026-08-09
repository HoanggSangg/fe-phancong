import net from 'node:net'
import {
  ACCESS_LAN_URL,
  ACCESS_LOCAL_URL,
  ACCESS_TAILSCALE_URL,
} from '../src/constants/accessUrls.js'

/**
 * Vite HTTPS nội bộ (127.0.0.1:vitePort).
 * Công khai :publicPort — peek TCP:
 *   - HTTP  → 301 https://host:publicPort/...
 *   - TLS/WSS → pipe tới Vite (HMR ổn định).
 */
export function httpToHttpsRedirectPlugin({
  enabled = true,
  publicPort = 5173,
  vitePort = 5175,
} = {}) {
  /** @type {import('node:net').Server | null} */
  let proxyServer = null

  const print = () => {
    console.log('')
    console.log('  Dev HTTPS (cổng công khai :' + publicPort + '):')
    console.log(`  ➜  Máy cũ (Tailscale): ${ACCESS_TAILSCALE_URL}`)
    console.log(`  ➜  LAN:       ${ACCESS_LAN_URL}`)
    console.log(`  ➜  Local:     ${ACCESS_LOCAL_URL}`)
    console.log(`  http://*:${publicPort} → tự chuyển https://*:${publicPort}`)
    console.log('')
  }

  const isProbablyHttp = (buf) => {
    if (!buf?.length) return false
    // TLS ClientHello
    if (buf[0] === 0x16) return false
    const head = buf.toString('latin1', 0, Math.min(buf.length, 12))
    return /^(GET|POST|HEAD|PUT|DELETE|OPTIONS|PATCH|CONNECT)[\s/]/i.test(head)
  }

  const redirectHttp = (socket, firstChunk) => {
    const text = firstChunk.toString('latin1')
    const hostHeader =
      text.match(/Host:\s*([^\r\n]+)/i)?.[1]?.trim() || `localhost:${publicPort}`
    const hostname = hostHeader.replace(/:\d+$/, '') || 'localhost'
    const pathMatch = text.match(/^(?:GET|HEAD|POST|PUT|DELETE|OPTIONS|PATCH)\s+(\S+)/i)
    let path = pathMatch?.[1] || '/'
    if (path.startsWith('http://') || path.startsWith('https://')) {
      try {
        path = new URL(path).pathname + new URL(path).search
      } catch {
        path = '/'
      }
    }
    if (!path.startsWith('/')) path = `/${path}`
    const target = `https://${hostname}:${publicPort}${path}`
    socket.write(
      'HTTP/1.1 301 Moved Permanently\r\n' +
        `Location: ${target}\r\n` +
        'Connection: close\r\n' +
        'Cache-Control: no-store\r\n' +
        'Content-Length: 0\r\n' +
        '\r\n',
    )
    socket.end()
  }

  const pipeTls = (client, firstChunk) => {
    const upstream = net.connect({ port: vitePort, host: '127.0.0.1' }, () => {
      upstream.write(firstChunk)
      client.pipe(upstream)
      upstream.pipe(client)
    })

    const kill = () => {
      client.destroy()
      upstream.destroy()
    }
    client.on('error', kill)
    upstream.on('error', kill)
    client.on('close', () => upstream.destroy())
    upstream.on('close', () => client.destroy())
  }

  const startProxy = () => {
    if (proxyServer) return

    proxyServer = net.createServer((socket) => {
      socket.setNoDelay(true)
      socket.once('data', (buf) => {
        if (isProbablyHttp(buf)) {
          redirectHttp(socket, buf)
          return
        }
        pipeTls(socket, buf)
      })
      socket.on('error', () => socket.destroy())
    })

    proxyServer.on('error', (err) => {
      console.warn(`\n[http→https] Không mở proxy :${publicPort} — ${err.message}`)
      proxyServer = null
    })

    proxyServer.listen(publicPort, '0.0.0.0', () => {
      print()
    })
  }

  return {
    name: 'http-to-https-redirect',
    apply: 'serve',
    configureServer(server) {
      if (!enabled) return

      const boot = () => startProxy()

      // Vite đã listen → mở proxy công khai
      if (server.httpServer?.listening) boot()
      else server.httpServer?.once('listening', boot)

      return () => {
        if (server.httpServer?.listening) boot()
        else server.httpServer?.once('listening', boot)
      }
    },
    buildEnd() {
      proxyServer?.close()
      proxyServer = null
    },
  }
}

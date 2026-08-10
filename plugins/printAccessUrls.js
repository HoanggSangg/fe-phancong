import {
  ACCESS_LAN_URL,
  ACCESS_LOCAL_URL,
  ACCESS_TAILSCALE_URL,
} from '../src/constants/accessUrls.js'

/** In rõ link truy cập khi npm run dev. */
export function printAccessUrlsPlugin({ useHttps = true } = {}) {
  return {
    name: 'print-access-urls',
    apply: 'serve',
    configureServer(server) {
      const print = () => {
        console.log('')
        if (useHttps) {
          console.log('  Dev HTTPS (Vite lắng nghe trực tiếp :5173):')
          console.log(`  ➜  Máy cũ (Tailscale): ${ACCESS_TAILSCALE_URL}`)
          console.log(`  ➜  LAN:               ${ACCESS_LAN_URL}`)
          console.log(`  ➜  Local:             ${ACCESS_LOCAL_URL}`)
          console.log('  API/socket qua proxy cùng origin → /api , /socket.io')
          console.log('  Dùng https:// (http:// trên cổng này sẽ không mở được).')
        } else {
          console.log('  Dev HTTP:')
          console.log('  ➜  http://localhost:5173')
          console.log('  ➜  http://<LAN-IP>:5173')
        }
        console.log('')
      }
      server.httpServer?.once('listening', print)
      return () => {
        if (server.httpServer?.listening) print()
      }
    },
  }
}

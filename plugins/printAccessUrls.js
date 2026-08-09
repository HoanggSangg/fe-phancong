import {
  ACCESS_LAN_URL,
  ACCESS_LOCAL_URL,
  ACCESS_TAILSCALE_URL,
} from '../src/constants/accessUrls.js'

/** In rõ 2 link chuẩn khi npm run dev. */
export function printAccessUrlsPlugin() {
  return {
    name: 'print-access-urls',
    apply: 'serve',
    configureServer(server) {
      const print = () => {
        console.log('')
        console.log('  Dùng HTTPS (khuyến nghị):')
        console.log(`  ➜  Máy cũ (Tailscale): ${ACCESS_TAILSCALE_URL}`)
        console.log(`  ➜  LAN (cùng mạng):       ${ACCESS_LAN_URL}`)
        console.log(`  ➜  Máy chạy FE:           ${ACCESS_LOCAL_URL}`)
        console.log('')
      }
      server.httpServer?.once('listening', print)
      return () => {
        if (server.httpServer?.listening) print()
      }
    },
  }
}

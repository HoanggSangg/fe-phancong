/**
 * DEPRECATED — không còn dùng trong vite.config.js.
 *
 * Proxy TCP peek (HTTP redirect + pipe TLS) trên :5173 từng gây:
 * - ERR_TIMED_OUT khi lazy-import trang
 * - HMR /socket.io /api không ổn định qua Tailscale
 *
 * Hiện tại Vite HTTPS lắng nghe trực tiếp 0.0.0.0:5173 (mkcert).
 */

export function httpToHttpsRedirectPlugin() {
  return {
    name: 'http-to-https-redirect-deprecated',
    apply: 'serve',
    configureServer() {
      console.warn(
        '[http→https] Plugin đã tắt. Dùng https://host:5173 — Vite HTTPS trực tiếp.',
      )
    },
  }
}

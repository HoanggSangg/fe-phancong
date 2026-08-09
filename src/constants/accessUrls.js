/** Link truy cập FE dev — HTTPS cổng 5173; HTTP redirect cổng 5174. */
export const ACCESS_TAILSCALE_URL = 'https://100.127.133.38:5173';
export const ACCESS_LAN_URL = 'https://192.168.1.250:5173';
export const ACCESS_LOCAL_URL = 'https://localhost:5173';

export const ACCESS_HINT =
  'Máy cũ + Tailscale: https://100.127.133.38:5173 — Cùng mạng LAN: https://192.168.1.250:5173 — Nên mở https:// (http://:5174 sẽ chuyển sang https).';

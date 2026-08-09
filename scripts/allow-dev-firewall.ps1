# Cho phép máy khác (LAN / Tailscale) vào Vite :5173 (HTTP→HTTPS + TLS)
# Chạy PowerShell (Run as Administrator) trên máy FE:
#   powershell -ExecutionPolicy Bypass -File scripts/allow-dev-firewall.ps1

$rule = 'Vite FE 5173 HTTP+HTTPS'

netsh advfirewall firewall delete rule name="$rule" | Out-Null
netsh advfirewall firewall delete rule name='Vite FE HTTPS 5173' | Out-Null
netsh advfirewall firewall delete rule name='Vite FE HTTP redirect 5174' | Out-Null
netsh advfirewall firewall add rule name="$rule" dir=in action=allow protocol=TCP localport=5173 profile=any

Write-Host "OK: Firewall đã mở TCP 5173 (http → https + TLS)."
Write-Host "  Tailscale: https://100.127.133.38:5173"
Write-Host "  LAN:       https://192.168.1.250:5173"
Write-Host "  HTTP:      http://…:5173  (tự chuyển https)"

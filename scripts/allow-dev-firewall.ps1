# Cho phép máy khác (LAN / Tailscale) vào Vite HTTPS :5173 (+ HTTP redirect :5174)
# Chạy PowerShell (Run as Administrator) trên máy FE (máy cũ):
#   powershell -ExecutionPolicy Bypass -File scripts/allow-dev-firewall.ps1

$httpsRule = 'Vite FE HTTPS 5173'
$httpRule = 'Vite FE HTTP redirect 5174'

netsh advfirewall firewall delete rule name="$httpsRule" | Out-Null
netsh advfirewall firewall delete rule name="$httpRule" | Out-Null
netsh advfirewall firewall add rule name="$httpsRule" dir=in action=allow protocol=TCP localport=5173 profile=any
netsh advfirewall firewall add rule name="$httpRule" dir=in action=allow protocol=TCP localport=5174 profile=any

Write-Host "OK: Firewall đã mở TCP 5173 (HTTPS) và 5174 (HTTP → HTTPS)."
Write-Host "  Tailscale: https://100.127.133.38:5173"
Write-Host "  LAN:       https://192.168.1.250:5173"

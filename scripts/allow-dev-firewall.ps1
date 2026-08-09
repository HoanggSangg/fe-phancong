# Cho phép máy khác (LAN / Tailscale) vào Vite :5173
# Chạy PowerShell (Run as Administrator) trên máy FE (máy cũ):
#   powershell -ExecutionPolicy Bypass -File scripts/allow-dev-firewall.ps1

$ruleName = 'Vite FE HTTPS 5173'
netsh advfirewall firewall delete rule name="$ruleName" | Out-Null
netsh advfirewall firewall add rule name="$ruleName" dir=in action=allow protocol=TCP localport=5173 profile=any
Write-Host "OK: Firewall đã mở TCP 5173 (LAN + Tailscale)."
Write-Host "  Tailscale: https://100.127.133.38:5173"
Write-Host "  LAN:       https://192.168.1.250:5173"

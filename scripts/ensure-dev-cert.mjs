import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import https from 'node:https'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pipeline } from 'node:stream/promises'
import { createWriteStream } from 'node:fs'

const certDir = path.join(os.homedir(), '.vite-plugin-mkcert')
const mkcertBin = path.join(certDir, process.platform === 'win32' ? 'mkcert.exe' : 'mkcert')
const keyFile = path.join(certDir, 'dev.pem')
const certFile = path.join(certDir, 'cert.pem')
const rootCA = path.join(certDir, 'rootCA.pem')
const hostsStamp = path.join(certDir, 'hosts.stamp')

const mkcertDownloadUrl = () => {
  if (process.platform === 'win32') {
    return process.arch === 'arm64'
      ? 'https://dl.filippo.io/mkcert/latest?for=windows/arm64'
      : 'https://dl.filippo.io/mkcert/latest?for=windows/amd64'
  }
  if (process.platform === 'darwin') {
    return process.arch === 'arm64'
      ? 'https://dl.filippo.io/mkcert/latest?for=darwin/arm64'
      : 'https://dl.filippo.io/mkcert/latest?for=darwin/amd64'
  }
  return process.arch === 'arm64'
    ? 'https://dl.filippo.io/mkcert/latest?for=linux/arm64'
    : 'https://dl.filippo.io/mkcert/latest?for=linux/amd64'
}

const collectHosts = () => {
  const hosts = new Set(['localhost', '127.0.0.1', '::1'])
  for (const nic of Object.values(os.networkInterfaces())) {
    for (const addr of nic || []) {
      if (addr.family === 'IPv4' && !addr.internal) hosts.add(addr.address)
    }
  }
  for (const extra of String(process.env.VITE_DEV_CERT_HOSTS || '').split(',')) {
    const host = extra.trim()
    if (host) hosts.add(host)
  }
  // Link chuẩn: Tailscale (khác mạng) + LAN (cùng mạng)
  hosts.add('100.127.133.38')
  hosts.add('192.168.1.250')
  return [...hosts].sort()
}

const downloadFile = (url, dest) =>
  new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'fe-phancong-dev-cert' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        downloadFile(res.headers.location, dest).then(resolve, reject)
        return
      }
      if (res.statusCode !== 200) {
        res.resume()
        reject(new Error(`Download mkcert thất bại: HTTP ${res.statusCode}`))
        return
      }
      const out = createWriteStream(dest)
      pipeline(res, out).then(resolve, reject)
    })
    req.on('error', reject)
  })

const ensureMkcertBinary = async () => {
  fs.mkdirSync(certDir, { recursive: true })
  if (fs.existsSync(mkcertBin) && fs.statSync(mkcertBin).size > 1000) return true

  const url = mkcertDownloadUrl()
  const tmp = `${mkcertBin}.download`
  console.log(`[dev-cert] Đang tải mkcert…\n  ${url}`)
  await downloadFile(url, tmp)
  fs.renameSync(tmp, mkcertBin)
  if (process.platform !== 'win32') {
    fs.chmodSync(mkcertBin, 0o755)
  }
  console.log(`[dev-cert] Đã cài mkcert → ${mkcertBin}`)
  return true
}

const trustRootCa = () => {
  if (!fs.existsSync(rootCA) || process.platform !== 'win32') return
  try {
    execFileSync('certutil', ['-addstore', '-user', 'Root', rootCA], {
      stdio: 'ignore',
    })
    console.log('[dev-cert] Đã tin CA mkcert trong Windows (Current User).')
  } catch {
    // Đã có trong store hoặc bị chặn — bỏ qua
  }
}

const ensureCert = async ({ force = false } = {}) => {
  try {
    await ensureMkcertBinary()
  } catch (error) {
    console.warn('[dev-cert] Không tải được mkcert:', error?.message || error)
    return false
  }

  if (!fs.existsSync(mkcertBin)) {
    console.warn('[dev-cert] Chưa có mkcert tại', mkcertBin)
    return false
  }

  const hosts = collectHosts()
  const stamp = hosts.join(',')
  const upToDate =
    !force &&
    fs.existsSync(keyFile) &&
    fs.existsSync(certFile) &&
    fs.existsSync(rootCA) &&
    fs.existsSync(hostsStamp) &&
    fs.readFileSync(hostsStamp, 'utf8') === stamp

  if (!upToDate) {
    const env = { ...process.env, CAROOT: certDir }
    // Tạo CA + cert (không cần UAC admin)
    execFileSync(
      mkcertBin,
      ['-key-file', keyFile, '-cert-file', certFile, ...hosts],
      { stdio: 'inherit', env },
    )
    fs.writeFileSync(hostsStamp, stamp, 'utf8')
  }

  trustRootCa()
  return fs.existsSync(keyFile) && fs.existsSync(certFile)
}

const thisFile = fileURLToPath(import.meta.url)
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  ensureCert({ force: true }).then((ok) => {
    process.exit(ok ? 0 : 1)
  })
}

export { certDir, keyFile, certFile, collectHosts, ensureCert, trustRootCa }

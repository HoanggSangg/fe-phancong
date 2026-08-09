import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const certDir = path.join(os.homedir(), '.vite-plugin-mkcert')
const mkcertBin = path.join(certDir, process.platform === 'win32' ? 'mkcert.exe' : 'mkcert')
const keyFile = path.join(certDir, 'dev.pem')
const certFile = path.join(certDir, 'cert.pem')
const rootCA = path.join(certDir, 'rootCA.pem')
const hostsStamp = path.join(certDir, 'hosts.stamp')

const collectHosts = () => {
  const hosts = new Set(['localhost', '127.0.0.1', '::1'])
  for (const nic of Object.values(os.networkInterfaces())) {
    for (const addr of nic || []) {
      if (addr.family === 'IPv4' && !addr.internal) hosts.add(addr.address)
    }
  }
  return [...hosts].sort()
}

const trustRootCa = () => {
  if (!fs.existsSync(rootCA) || process.platform !== 'win32') return
  try {
    execFileSync('certutil', ['-addstore', '-user', 'Root', rootCA], {
      stdio: 'ignore',
    })
  } catch {
    // Đã có trong store hoặc bị chặn — bỏ qua
  }
}

const ensureCert = ({ force = false } = {}) => {
  if (!fs.existsSync(mkcertBin)) {
    console.warn('[dev-cert] Chưa có mkcert tại', mkcertBin)
    return false
  }

  trustRootCa()

  const hosts = collectHosts()
  const stamp = hosts.join(',')
  const upToDate =
    !force &&
    fs.existsSync(keyFile) &&
    fs.existsSync(certFile) &&
    fs.existsSync(hostsStamp) &&
    fs.readFileSync(hostsStamp, 'utf8') === stamp

  if (upToDate) return true

  const env = { ...process.env, CAROOT: certDir }
  execFileSync(
    mkcertBin,
    ['-key-file', keyFile, '-cert-file', certFile, ...hosts],
    { stdio: 'inherit', env },
  )
  fs.writeFileSync(hostsStamp, stamp, 'utf8')
  return fs.existsSync(keyFile) && fs.existsSync(certFile)
}

const thisFile = fileURLToPath(import.meta.url)
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  ensureCert({ force: true })
}

export { certDir, keyFile, certFile, collectHosts, ensureCert, trustRootCa }

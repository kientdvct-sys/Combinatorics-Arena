import { createServer } from 'node:http'
import { createReadStream, statSync } from 'node:fs'
import { extname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createAdminApi, localHost } from './local-admin.mjs'

const dist = fileURLToPath(new URL('../dist/', import.meta.url))
const port = Number(process.env.ARENA_PORT || 5173)
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid ARENA_PORT')
const api = createAdminApi({ port })
const contentTypes = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json; charset=utf-8',
}
const policy = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; frame-ancestors 'none'; base-uri 'none'; object-src 'none'; form-action 'self'"

function fileFor(pathname) {
  const target = resolve(dist, '.' + pathname)
  const location = relative(dist, target)
  if (isAbsolute(location) || location === '..' || location.startsWith('..' + sep)) return
  const info = statSync(target, { throwIfNoEntry: false })
  if (info?.isFile()) return target
  if (!extname(pathname)) return resolve(dist, 'index.html')
}

const server = createServer(async (request, response) => {
  try {
    if (!localHost(request.headers.host, port)) { response.writeHead(403).end(); return }
    const url = new URL(request.url, 'http://localhost')
    const pathname = decodeURIComponent(url.pathname)
    if (pathname.startsWith('/api/')) { await api(request, response, pathname, url.searchParams.get('id')); return }
    if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405).end(); return }
    const file = fileFor(pathname)
    const info = file && statSync(file, { throwIfNoEntry: false })
    if (!info?.isFile()) { response.writeHead(404).end(); return }
    response.writeHead(200, {
      'Content-Type': contentTypes[extname(file)] || 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
      'Content-Security-Policy': policy,
      'X-Content-Type-Options': 'nosniff',
    })
    if (request.method === 'HEAD') return response.end()
    const stream = createReadStream(file)
    stream.on('error', () => response.destroy())
    stream.pipe(response)
  } catch {
    if (!response.headersSent) response.writeHead(400).end()
  }
})
server.requestTimeout = 15_000
server.listen(port, '127.0.0.1', () => console.log('Combinatorics Arena: http://localhost:' + port))
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? 'Port ' + port + ' is in use. Stop the old Arena server and try again.' : error.message)
  process.exitCode = 1
})

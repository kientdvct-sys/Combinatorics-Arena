import { isIP } from 'node:net'
import { createAdminHandler } from './admin-api.mjs'
import { decodeVerifier, normalizeEmail } from './admin-credentials.mjs'
import { createRedisBackend, redisRest } from './redis-admin.mjs'

function secureOrigin(value) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null
    return url.origin
  } catch { return null }
}

function configFrom(env) {
  if (env.VERCEL_ENV !== 'production') return null
  const origin = secureOrigin(env.ARENA_PUBLIC_ORIGIN || 'https://' + (env.VERCEL_PROJECT_PRODUCTION_URL || ''))
  const email = normalizeEmail(env.ARENA_ADMIN_EMAIL)
  const verifier = decodeVerifier(env.ARENA_ADMIN_CREDENTIAL)
  const redisUrl = secureOrigin(env.UPSTASH_REDIS_REST_URL)
  const token = env.UPSTASH_REDIS_REST_TOKEN?.trim()
  if (!origin || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !verifier || !redisUrl || !token) return null
  return { origin, record: { email, ...verifier }, redisUrl, token }
}

const responseHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, private',
  'X-Content-Type-Options': 'nosniff',
}

function unavailable(request, pathname) {
  if (request.method === 'GET' && pathname === '/api/health') {
    return new Response(JSON.stringify({ status: 'unavailable' }), { status: 503, headers: responseHeaders })
  }
  if (request.method === 'GET' && pathname === '/api/admin/session') {
    return new Response(JSON.stringify({ initialized: false, email: null, hosting: 'vercel' }), { headers: responseHeaders })
  }
  if (request.method === 'GET' && pathname === '/api/arena/featured') {
    return new Response(JSON.stringify({ features: [] }), { headers: responseHeaders })
  }
  return new Response(JSON.stringify({ error: 'Quản trị chưa được cấu hình cho Vercel Production.' }), { status: 503, headers: responseHeaders })
}

export function createVercelEndpoint(pathname, { env = process.env, command } = {}) {
  const config = configFrom(env)
  if (!config) return { fetch: request => unavailable(request, pathname) }
  const backend = createRedisBackend({ ...config, redis: command ?? redisRest(config.redisUrl, config.token) })
  const handler = createAdminHandler({
    hosted: true,
    backend,
    originFor: request => request.origin === config.origin ? config.origin : null,
    clientId: request => {
      const ip = (request.headers['x-vercel-forwarded-for'] || request.headers['x-forwarded-for'] || '').split(',')[0].trim()
      return isIP(ip) ? ip : 'unknown'
    },
  })
  return {
    async fetch(request) {
      const url = new URL(request.url)
      const input = {
        method: request.method,
        origin: url.origin,
        headers: Object.fromEntries(request.headers),
        [Symbol.asyncIterator]: async function* () { if (request.body) yield* request.body },
      }
      let status = 500
      let headers = responseHeaders
      let output = JSON.stringify({ error: 'Máy chủ không xử lý được yêu cầu.' })
      const response = {
        headersSent: false,
        writeHead(code, values) { status = code; headers = values; this.headersSent = true },
        end(value) { output = value },
      }
      const ids = pathname === '/api/admin/featured' ? url.searchParams.getAll('id') : []
      if (ids.length > 1) return new Response(JSON.stringify({ error: 'Mã mục nổi bật không hợp lệ.' }), { status: 400, headers: responseHeaders })
      await handler(input, response, pathname, ids[0] ?? null)
      return new Response(output, { status, headers })
    },
  }
}

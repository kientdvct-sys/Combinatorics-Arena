import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { createFeatureChange, featureChange, featureInput, publishedFeatures, requiredRevision } from './editorial.mjs'
import { RequestError } from './request-error.mjs'

const sessionSeconds = 8 * 60 * 60
const maxBody = 8192
const featurePath = /^\/api\/admin\/featured(?:\/([a-f0-9-]{36}))?$/
const featureId = /^[a-f0-9-]{36}$/
const tokenPattern = /^[A-Za-z0-9_-]{43}$/
export const digest = value => createHash('sha256').update(value).digest('hex')

function json(response, status, payload, extra = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, private',
    'X-Content-Type-Options': 'nosniff',
    ...extra,
  })
  response.end(JSON.stringify(payload))
}

async function body(request) {
  if (!/^application\/json(?:;|$)/i.test(request.headers['content-type'] || '')) {
    throw new RequestError(415, 'Yêu cầu phải có nội dung JSON.')
  }
  if (Number(request.headers['content-length']) > maxBody) throw new RequestError(413, 'Nội dung quá dài.')
  const chunks = []
  let length = 0
  for await (const chunk of request) {
    length += chunk.length
    if (length > maxBody) throw new RequestError(413, 'Nội dung quá dài.')
    chunks.push(chunk)
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error()
    return value
  } catch {
    throw new RequestError(400, 'Nội dung không hợp lệ.')
  }
}

function sessionDigest(headers, cookieName) {
  const raw = (headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(cookieName + '='))
  const token = raw?.slice(cookieName.length + 1)
  return token && tokenPattern.test(token) ? digest(token) : null
}

export function createAdminHandler({ backend, originFor, clientId = () => 'local', hosted = false }) {
  const cookieName = hosted ? '__Host-arena_admin' : 'arena_admin'
  const cookie = (token, maxAge) => {
    const scope = hosted ? '; Path=/; Secure' : '; Path=/api/admin'
    return cookieName + '=' + token + '; Max-Age=' + maxAge + scope + '; HttpOnly; SameSite=Strict'
  }

  return async function adminHandler(request, response, pathname, queriedId = null) {
    try {
      const origin = originFor(request)
      const method = request.method
      if (!origin) throw new RequestError(403, 'Địa chỉ máy chủ không hợp lệ.')
      if (method !== 'GET' && request.headers.origin !== origin) {
        throw new RequestError(403, 'Yêu cầu thay đổi phải đến từ trang quản trị cùng địa chỉ.')
      }

      if (pathname === '/api/health' && method === 'GET') {
        const ready = await backend.initialized() && await backend.checkStorage()
        return json(response, ready ? 200 : 503, { status: ready ? 'ok' : 'unavailable' })
      }
      if (pathname === '/api/arena/featured' && method === 'GET') {
        const { features } = await backend.readEditorial()
        return json(response, 200, { features: publishedFeatures(features) })
      }

      const previous = sessionDigest(request.headers, cookieName)
      if (pathname === '/api/admin/session' && method === 'GET') {
        const initialized = await backend.initialized()
        const signedIn = initialized && previous && await backend.getSession(previous)
        return json(response, 200, { initialized, email: signedIn ? backend.email : null, ...(hosted ? { hosting: 'vercel' } : {}) })
      }

      if (pathname === '/api/admin/login' && method === 'POST') {
        if (!await backend.initialized()) throw new RequestError(409, 'Tài khoản quản trị chưa được cấu hình.')
        const input = await body(request)
        const retryAfter = await backend.permitLogin(clientId(request))
        if (retryAfter > 0) throw new RequestError(429, 'Bạn đã thử quá nhiều lần. Hãy thử lại sau vài phút.', { 'Retry-After': String(retryAfter) })
        if (!await backend.verify(input.email, input.password)) throw new RequestError(401, 'Email hoặc mật khẩu chưa đúng.')
        const token = randomBytes(32).toString('base64url')
        if (previous) await backend.deleteSession(previous)
        await backend.putSession(digest(token), sessionSeconds)
        return json(response, 200, { email: backend.email }, { 'Set-Cookie': cookie(token, sessionSeconds) })
      }

      if (pathname === '/api/admin/logout' && method === 'POST') {
        if (previous) await backend.deleteSession(previous)
        return json(response, 200, { email: null }, { 'Set-Cookie': cookie('', 0) })
      }

      const match = featurePath.exec(pathname)
      if (!match) throw new RequestError(404, 'Không tìm thấy yêu cầu này.')
      if (!previous || !await backend.getSession(previous)) throw new RequestError(401, 'Hãy đăng nhập quản trị.')
      const id = match[1] ?? queriedId
      if (id !== null && id !== undefined && !featureId.test(id)) throw new RequestError(400, 'Mã mục nổi bật không hợp lệ.')
      if (method === 'GET' && !id) return json(response, 200, await backend.readEditorial())

      if ((method === 'POST' && !id) || (id && (method === 'PUT' || method === 'DELETE'))) {
        const revision = id ? requiredRevision(request.headers['if-match']) : null
        const input = method === 'DELETE' ? null : featureInput(await body(request))
        const change = createFeatureChange(input, id, revision)
        const editorial = await backend.updateEditorial(current => featureChange(current, change))
        return json(response, method === 'POST' ? 201 : 200, editorial)
      }
      throw new RequestError(405, 'Phương thức không được hỗ trợ.')
    } catch (error) {
      const handled = error instanceof RequestError
      const status = handled ? error.status : 500
      const requestId = status >= 500 ? randomUUID() : undefined
      if (requestId) console.error(JSON.stringify({ event: 'arena_api_failed', requestId, status }))
      const message = handled ? error.message : 'Máy chủ không xử lý được yêu cầu.'
      if (!response.headersSent) json(response, status,
        { error: message, ...(requestId ? { requestId } : {}) }, handled ? error.headers : {})
    }
  }
}

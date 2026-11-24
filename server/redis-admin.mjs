import { digest } from './admin-api.mjs'
import { verifyPassword } from './admin-credentials.mjs'
import { RequestError } from './request-error.mjs'
import { decodeEditorial } from './editorial.mjs'

const featureLimitBytes = 1_000_000

const claimLogin = `
local ip = tonumber(redis.call('GET', KEYS[1]) or '0')
local site = tonumber(redis.call('GET', KEYS[2]) or '0')
if ip >= 8 then return math.max(1, redis.call('TTL', KEYS[1])) end
if site >= 50 then return math.max(1, redis.call('TTL', KEYS[2])) end
for _, key in ipairs(KEYS) do
  if redis.call('INCR', key) == 1 then redis.call('EXPIRE', key, 300) end
end
return 0
`

const changeFeatures = `
if (redis.call('GET', KEYS[1]) or '') ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2])
return 1
`

export function redisRest(url, token, fetcher = fetch) {
  return async (...command) => {
    try {
      const response = await fetcher(url, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(command.map(String)),
        signal: AbortSignal.timeout(5_000),
        redirect: 'error',
        cache: 'no-store',
      })
      if (!response.ok) throw new Error()
      const payload = await response.json()
      if (!payload || typeof payload !== 'object' || 'error' in payload || !('result' in payload)) throw new Error()
      return payload.result
    } catch {
      throw new RequestError(503, 'Kho dữ liệu tạm thời không phản hồi. Hãy thử lại.')
    }
  }
}

export function createRedisBackend({ origin, record, redis }) {
  const prefix = 'arena:v1:' + digest(origin).slice(0, 24) + ':'
  const featuresKey = prefix + 'features'
  const issuer = digest(record.email + ':' + record.salt + ':' + record.hash).slice(0, 24)
  const sessionKey = tokenDigest => prefix + 'session:' + issuer + ':' + tokenDigest
  return {
    email: record.email,
    initialized: () => true,
    verify: (email, password) => verifyPassword(record, email, password),
    checkStorage: async () => await redis('PING') === 'PONG',
    readEditorial: async () => decodeEditorial(await redis('GETEX', featuresKey)),
    updateEditorial: async change => {
      for (let attempt = 0; attempt < 4; attempt++) {
        const raw = await redis('GETEX', featuresKey)
        const updated = change(decodeEditorial(raw))
        const encoded = JSON.stringify(updated)
        if (Buffer.byteLength(encoded) > featureLimitBytes) throw new RequestError(413, 'Danh sách bài nổi bật vượt giới hạn lưu trữ.')
        if (await redis('EVAL', changeFeatures, 1, featuresKey, raw ?? '', encoded) === 1) return updated
      }
      throw new RequestError(409, 'Danh sách vừa thay đổi ở nơi khác. Hãy thử lại.')
    },
    // GETEX without expiry options uses the Redis write path without extending the session TTL.
    getSession: async tokenDigest => await redis('GETEX', sessionKey(tokenDigest)) === 'active',
    putSession: async (tokenDigest, seconds) => {
      if (await redis('SET', sessionKey(tokenDigest), 'active', 'EX', seconds) !== 'OK') {
        throw new RequestError(503, 'Chưa tạo được phiên đăng nhập. Hãy thử lại.')
      }
    },
    deleteSession: tokenDigest => redis('DEL', sessionKey(tokenDigest)),
    permitLogin: client => redis('EVAL', claimLogin, 2, prefix + 'attempt:' + digest(client), prefix + 'attempt:site'),
  }
}

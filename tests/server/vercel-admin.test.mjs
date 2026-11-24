import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createVercelEndpoint } from '../../server/vercel-admin.mjs'
import { encodeVerifier, passwordRecord } from '../../server/admin-credentials.mjs'
import { redisRest } from '../../server/redis-admin.mjs'
import { redisFixture } from './redis-fixture.mjs'

const origin = 'https://arena-test.vercel.app'
const email = 'test-owner@example.test'
const password = 'test fixture strong passphrase'
const token = 'test-redis-secret-for-fixture'
const verifier = encodeVerifier(await passwordRecord(password))
const env = {
  VERCEL_ENV: 'production', VERCEL_PROJECT_PRODUCTION_URL: 'arena-test.vercel.app',
  ARENA_ADMIN_EMAIL: email, ARENA_ADMIN_CREDENTIAL: verifier,
  UPSTASH_REDIS_REST_URL: 'https://redis.example.test', UPSTASH_REDIS_REST_TOKEN: token,
}

async function call(path, { redis, variables = env, method = 'GET', cookie, data, revision, from = origin, host = origin, ip } = {}) {
  const url = new URL(path, host)
  const headers = { Origin: from }
  if (cookie) headers.Cookie = cookie
  if (revision !== undefined) headers['If-Match'] = '"' + revision + '"'
  if (ip) headers['x-forwarded-for'] = ip
  if (data) headers['Content-Type'] = 'application/json'
  const response = await createVercelEndpoint(url.pathname, { env: variables, command: redis }).fetch(new Request(url, {
    method, headers, body: data ? JSON.stringify(data) : undefined,
  }))
  const raw = await response.text()
  for (const secret of [verifier, token, password, verifier.split(':').at(-1)]) assert.equal(raw.includes(secret), false)
  assert.match(response.headers.get('cache-control'), /no-store/)
  return { status: response.status, headers: response.headers, body: JSON.parse(raw) }
}

const sessionPath = '/api/admin/session'
const loginPath = '/api/admin/login'
const featuredPath = '/api/admin/featured'
const publicPath = '/api/arena/featured'

test('fresh clients see no credentials and writes require same-origin authentication', async () => {
  const { redis } = redisFixture()
  assert.deepEqual((await call('/api/health', { redis })).body, { status: 'ok' })
  const status = await call(sessionPath, { redis })
  assert.deepEqual(status.body, { initialized: true, email: null, hosting: 'vercel' })
  assert.equal((await call(featuredPath, { redis })).status, 401)
  assert.equal((await call(loginPath, { redis, method: 'POST', data: { email, password }, from: 'https://other.example.test' })).status, 403)
  assert.equal((await call(sessionPath, { redis, host: 'https://deployment-alias.vercel.app' })).status, 403)
  assert.equal((await call(loginPath, { redis, method: 'POST', data: { email, password: 'wrong password fixture' } })).status, 401)
})

test('secure session and featured data survive new function instances and logout removes access', async () => {
  const { redis, calls } = redisFixture()
  const login = await call(loginPath, { redis, method: 'POST', data: { email, password } })
  assert.equal(login.status, 200)
  const rawCookie = login.headers.get('set-cookie')
  assert.match(rawCookie, /^__Host-arena_admin=[\w-]{43};/)
  for (const policy of ['Secure', 'HttpOnly', 'SameSite=Strict', 'Path=/']) assert.ok(rawCookie.includes(policy))
  const cookie = rawCookie.split(';')[0]
  assert.equal(JSON.stringify(calls).includes(cookie.split('=')[1]), false)
  assert.equal((await call(sessionPath, { redis, cookie })).body.email, email)
  const before = { question: 10001, title: 'Bản nháp', note: '', status: 'draft' }
  const draft = await call(featuredPath, { redis, cookie, method: 'POST', data: before })
  assert.equal(draft.status, 201)
  const id = draft.body.features[0].id
  assert.deepEqual((await call(publicPath, { redis })).body.features, [])
  const updated = await call(featuredPath + '?id=' + id, { redis, cookie, revision: 1, method: 'PUT', data: { ...before, status: 'published' } })
  assert.equal(updated.status, 200)
  assert.equal(updated.body.activity[0].action, 'updated')
  assert.equal((await call(featuredPath + '?id=' + id, { redis, cookie, revision: 1, method: 'DELETE' })).status, 412)
  assert.equal((await call(publicPath, { redis })).body.features[0].question, 10001)
  assert.equal((await call('/api/admin/logout', { redis, cookie, method: 'POST' })).status, 200)
  assert.equal((await call(sessionPath, { redis, cookie })).body.email, null)
  assert.equal((await call(featuredPath + '?id=' + id, { redis, cookie, method: 'DELETE' })).status, 401)
})

test('limits repeated login attempts and disables administration in unconfigured and preview deployments', async () => {
  const { redis, advance } = redisFixture()
  for (let count = 0; count < 8; count++) {
    assert.equal((await call(loginPath, { redis, method: 'POST', data: { email, password: 'wrong password fixture' }, ip: '203.0.113.2' })).status, 401)
  }
  const limited = await call(loginPath, { redis, method: 'POST', data: { email, password }, ip: '203.0.113.2' })
  assert.equal(limited.status, 429)
  assert.equal(limited.headers.get('retry-after'), '300')
  advance(301)
  const accepted = await call(loginPath, { redis, method: 'POST', data: { email, password }, ip: '203.0.113.2' })
  assert.equal(accepted.status, 200)
  const cookie = accepted.headers.get('set-cookie').split(';')[0]
  advance(8 * 60 * 60 + 1)
  assert.equal((await call(sessionPath, { redis, cookie })).body.email, null)

  for (const variables of [{}, { ...env, VERCEL_ENV: 'preview' }, { ...env, ARENA_ADMIN_CREDENTIAL: 'invalid' }]) {
    assert.deepEqual((await call(sessionPath, { redis, variables })).body, { initialized: false, email: null, hosting: 'vercel' })
    assert.equal((await call(loginPath, { redis, variables, method: 'POST', data: { email, password } })).status, 503)
  }
})

test('Redis REST sends the server token only to the configured endpoint and sanitizes failures', async () => {
  const endpoint = 'https://redis.example.test'
  const redis = redisRest(endpoint, token, async (url, request) => {
    assert.equal(url, endpoint)
    assert.equal(request.headers.Authorization, 'Bearer ' + token)
    assert.equal(request.redirect, 'error')
    assert.deepEqual(JSON.parse(request.body), ['GET', 'features'])
    return Response.json({ result: null })
  })
  assert.equal(await redis('GET', 'features'), null)
  const broken = redisRest(endpoint, token, async () => Response.json({ error: token }, { status: 500 }))
  await assert.rejects(broken('GET', 'features'), error => error.status === 503 && !error.message.includes(token))
})

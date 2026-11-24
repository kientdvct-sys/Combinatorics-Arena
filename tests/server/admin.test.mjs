import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { test } from 'node:test'
import { createAdminApi } from '../../server/local-admin.mjs'
import { ownerEmail, provisionAdmin } from '../../server/admin-store.mjs'

const host = 'localhost:5173'

async function request(api, path, method = 'GET', { data, cookie, revision, origin = 'http://' + host, requestHost = host } = {}) {
  const input = Readable.from(data === undefined ? [] : [Buffer.from(JSON.stringify(data))])
  input.method = method
  input.headers = { host: requestHost, origin, 'content-type': 'application/json' }
  if (cookie) input.headers.cookie = cookie
  if (revision !== undefined) input.headers['if-match'] = '"' + revision + '"'
  const result = {}
  const response = {
    headersSent: false,
    writeHead(status, headers) { this.headersSent = true; result.status = status; result.headers = headers },
    end(value) { result.data = JSON.parse(value) },
  }
  await api(input, response, path)
  return result
}

test('provisions the owner once and protects feature editing with a same-origin session', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'arena-admin-'))
  t.after(() => rm(directory, { force: true, recursive: true }))
  const api = createAdminApi({ directory })
  assert.deepEqual((await request(api, '/api/admin/session')).data, { initialized: false, email: null })
  const admin = await provisionAdmin(directory)
  assert.equal(admin.email, ownerEmail)
  assert.ok(admin.password.length >= 24)
  const record = await readFile(join(directory, 'admin.json'), 'utf8')
  assert.equal(record.includes(admin.password), false)
  assert.equal(await provisionAdmin(directory), null)

  const input = { question: 10001, title: 'Mở màn luyện tập', note: 'Bắt đầu với một ván Nim.', status: 'draft' }
  assert.equal((await request(api, '/api/admin/featured', 'POST', { data: input })).status, 401)
  assert.equal((await request(api, '/api/admin/session', 'GET', { requestHost: 'remote.invalid' })).status, 403)
  assert.equal((await request(api, '/api/admin/login', 'POST', { data: admin, origin: 'http://localhost:5174' })).status, 403)
  const invalid = await request(api, '/api/admin/login', 'POST', { data: { ...admin, password: 'incorrect password' } })
  assert.equal(invalid.status, 401)

  const valid = await request(api, '/api/admin/login', 'POST', { data: admin })
  assert.equal(valid.status, 200)
  const cookieHeader = valid.headers['Set-Cookie']
  assert.match(cookieHeader, /HttpOnly/)
  assert.match(cookieHeader, /SameSite=Strict/)
  const cookie = cookieHeader.split(';')[0]
  assert.equal((await request(api, '/api/admin/session', 'GET', { cookie })).data.email, ownerEmail)

  const created = await request(api, '/api/admin/featured', 'POST', { cookie, data: input })
  assert.equal(created.status, 201)
  const feature = created.data.features[0]
  assert.equal(created.data.activity[0].action, 'created')
  assert.equal((await request(api, '/api/admin/featured/' + feature.id, 'PUT', { cookie, data: input })).status, 428)
  assert.equal((await request(api, '/api/arena/featured')).data.features.length, 0)
  assert.equal((await request(api, '/api/admin/featured', 'POST', { cookie, data: input })).status, 409)
  assert.equal((await request(api, '/api/admin/featured', 'POST', { cookie, data: { ...input, question: 11001 } })).status, 400)
  assert.equal((await request(api, '/api/admin/featured/' + feature.id, 'PUT', {
    cookie, revision: feature.revision, data: { ...input, status: 'published' },
  })).status, 200)

  const restarted = createAdminApi({ directory })
  const publicData = await request(restarted, '/api/arena/featured')
  assert.deepEqual(publicData.data.features.map(published => published.question), [10001])
  assert.equal(publicData.data.features[0].status, undefined)
  assert.equal((await request(restarted, '/api/admin/featured', 'GET', { cookie })).status, 401)
  assert.equal((await request(api, '/api/admin/featured/' + feature.id, 'DELETE', { cookie, revision: feature.revision + 1 })).status, 200)
  assert.deepEqual((await request(api, '/api/arena/featured')).data.features, [])
  await request(api, '/api/admin/logout', 'POST', { cookie })
  assert.equal((await request(api, '/api/admin/session', 'GET', { cookie })).data.email, null)
})

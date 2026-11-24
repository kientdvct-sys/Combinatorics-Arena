import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { expect, test } from './fixtures'

test('HTTPS admin survives F5 without placing credentials in browser storage', async ({ page }) => {
  test.skip(process.env.ARENA_STATIC_TEST !== '1', 'Run the HTTPS workflow against the production build.')
  const fromRoot = (path: string) => pathToFileURL(resolve(path)).href
  const { createVercelEndpoint } = await import(fromRoot('server/vercel-admin.mjs'))
  const { passwordRecord, encodeVerifier } = await import(fromRoot('server/admin-credentials.mjs'))
  const { redisFixture } = await import(fromRoot('tests/server/redis-fixture.mjs'))
  const email = 'owner@example.test'
  const password = 'browser test strong passphrase'
  const credential = encodeVerifier(await passwordRecord(password))
  const env = {
    VERCEL_ENV: 'production',
    ARENA_PUBLIC_ORIGIN: 'https://arena.test',
    ARENA_ADMIN_EMAIL: email,
    ARENA_ADMIN_CREDENTIAL: credential,
    UPSTASH_REDIS_REST_URL: 'https://redis.example.test',
    UPSTASH_REDIS_REST_TOKEN: 'browser-fixture-redis-token',
  }
  const { redis } = redisFixture()
  await page.route('https://arena.test/api/**', async route => {
    const request = route.request()
    const result = await createVercelEndpoint(new URL(request.url()).pathname, { env, command: redis }).fetch(
      new Request(request.url(), { method: request.method(), headers: await request.allHeaders(), body: request.postData() }),
    )
    await route.fulfill({ status: result.status, headers: Object.fromEntries(result.headers), body: await result.text() })
  })

  await page.goto('/#/admin')
  await page.getByLabel('Email quản trị').fill(email)
  await page.getByLabel('Mật khẩu quản trị').fill(password)
  await page.getByRole('button', { name: 'Đăng nhập quản trị' }).click()
  await expect(page.getByRole('heading', { name: 'Danh sách bài nổi bật' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Danh sách bài nổi bật' })).toBeVisible()
  const browser = await page.evaluate(() => ({
    html: document.documentElement.outerHTML,
    local: JSON.stringify(localStorage),
    session: JSON.stringify(sessionStorage),
    cookie: document.cookie,
  }))
  const readable = JSON.stringify(browser)
  expect(readable.includes(password)).toBe(false)
  expect(readable.includes(credential)).toBe(false)
  expect(browser.cookie).not.toContain('__Host-arena_admin')
  expect(browser.local).not.toContain('arena_admin')
  expect(browser.session).not.toContain('arena_admin')
  const cookies = await page.context().cookies('https://arena.test')
  expect(cookies.find(cookie => cookie.name === '__Host-arena_admin')).toMatchObject({
    httpOnly: true, secure: true, sameSite: 'Strict',
  })

  await page.getByRole('button', { name: 'Đăng xuất' }).click()
  await expect(page.getByLabel('Mật khẩu quản trị')).toHaveValue('')
  await page.reload()
  await expect(page.getByRole('button', { name: 'Đăng nhập quản trị' })).toBeVisible()
})

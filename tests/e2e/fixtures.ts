import { resolve, sep } from 'node:path'
import { test as base } from '@playwright/test'
import type { Page } from '@playwright/test'

export { expect } from '@playwright/test'

export async function mountProduction(page: Page) {
  if (process.env.ARENA_STATIC_TEST !== '1') return
  const dist = resolve('dist')
  // Let Chromium exercise the production build without a listening socket.
  await page.route('https://arena.test/**', async route => {
    const url = new URL(route.request().url())
    const file = resolve(dist, url.pathname === '/' ? 'index.html' : '.' + url.pathname)
    if (!file.startsWith(dist + sep)) return route.fulfill({ status: 404 })
    try { await route.fulfill({ path: file }) } catch { await route.fulfill({ status: 404 }) }
  })
}

export const test = base.extend({
  page: async ({ page }, use) => {
    await mountProduction(page)
    await use(page)
  },
})

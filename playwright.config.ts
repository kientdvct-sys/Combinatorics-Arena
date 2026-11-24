import { defineConfig } from '@playwright/test'

const channel = process.env.ARENA_BROWSER_CHANNEL
const staticTest = process.env.ARENA_STATIC_TEST === '1'

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: staticTest ? 'https://arena.test' : 'http://127.0.0.1:4173',
    channel,
    trace: 'retain-on-failure',
    contextOptions: { reducedMotion: 'reduce' },
  },
  webServer: staticTest ? undefined : {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
  reporter: 'list',
  workers: 2,
})

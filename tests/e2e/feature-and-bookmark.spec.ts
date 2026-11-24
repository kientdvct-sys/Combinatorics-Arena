import { resolve } from 'node:path'
import { Readable } from 'node:stream'
import { pathToFileURL } from 'node:url'
import { expect, test } from './fixtures'

test('shows new questions inside arenas, saves one and restores the saved filter', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 820 })
  await page.goto('/#/games')
  await expect(page.getByRole('heading', { name: 'Chọn đấu trường' })).toBeVisible()
  await expect(page.getByText('THỬ THÁCH HÔM NAY', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Bài mới theo đấu trường' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
  await page.getByRole('link', { name: 'Bài luyện cho Nim Arena' }).click()
  await expect(page.getByText('2.200 bài phù hợp')).toBeVisible()

  await page.getByLabel('Mở bài theo mã').fill('10001')
  await page.getByRole('button', { name: 'Mở mã bài' }).click()
  await expect(page.getByText(/Bài #10001/)).toBeVisible()
  await page.getByRole('button', { name: 'Lưu bài #10001' }).click()
  await expect(page.getByRole('button', { name: 'Bỏ lưu bài #10001' })).toHaveAttribute('aria-pressed', 'true')
  await page.reload()
  await expect(page.getByRole('button', { name: 'Bỏ lưu bài #10001' })).toBeVisible()
  await page.goto('/#/questions/saved')
  await expect(page.getByText('1 bài phù hợp')).toBeVisible()
  await expect(page.getByRole('link', { name: /Mở bài 10001/ })).toBeVisible()
})

test('lets the owner publish and remove featured content from the arena hub', async ({ page }, info) => {
  const directory = info.outputPath('admin-data')
  const location = (filename: string) => pathToFileURL(resolve('server', filename)).href
  const { provisionAdmin } = await import(location('admin-store.mjs'))
  const { createAdminApi } = await import(location('local-admin.mjs'))
  const admin = await provisionAdmin(directory)
  const api = createAdminApi({ directory })
  await page.route('**/api/**', async route => {
    const request = route.request()
    const input = Readable.from(request.postDataBuffer() ? [request.postDataBuffer()] : [])
    const browserHeaders = await request.allHeaders()
    const headers = { ...browserHeaders, host: 'localhost:5173' }
    if (browserHeaders.origin) Object.assign(headers, { origin: 'http://localhost:5173' })
    Object.assign(input, { method: request.method(), headers })
    let status = 500
    let responseHeaders: Record<string, string> = {}
    let body = ''
    const response = {
      headersSent: false,
      writeHead(code: number, outgoing: Record<string, string>) { this.headersSent = true; status = code; responseHeaders = outgoing },
      end(value: string) { body = value },
    }
    const url = new URL(request.url())
    await api(input, response, url.pathname, url.searchParams.get('id'))
    await route.fulfill({ status, headers: responseHeaders, body })
  })

  await page.goto('/#/account')
  await page.getByRole('link', { name: /Quản trị nội dung/ }).click()
  await page.getByLabel('Email quản trị').fill(admin.email)
  await page.getByLabel('Mật khẩu quản trị').fill(admin.password)
  await page.getByRole('button', { name: 'Đăng nhập quản trị' }).click()
  await expect(page.getByRole('heading', { name: 'Thêm bài nổi bật' })).toBeVisible()
  await page.getByLabel('Mã bài', { exact: true }).fill('10001')
  await page.getByLabel('Tiêu đề', { exact: true }).fill('Ván Nim của quản trị viên')
  await page.getByLabel('Lời giới thiệu').fill('Bắt đầu lượt luyện mới.')
  await page.getByRole('combobox', { name: 'Trạng thái' }).selectOption('published')
  await page.getByLabel('Công khai lúc').fill('2099-01-01T10:00')
  await page.getByLabel('Độ ưu tiên').fill('80')
  await page.getByRole('button', { name: 'Lưu bài nổi bật' }).click()
  await expect(page.getByText('Đã lên lịch công khai bài.')).toBeVisible()
  await page.getByRole('link', { name: 'Đấu trường', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Bài mới theo đấu trường' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Ván Nim của quản trị viên/ })).toHaveCount(0)

  await page.goto('/#/admin')
  await page.getByRole('button', { name: 'Sửa Ván Nim của quản trị viên' }).click()
  await expect(page.getByLabel('Độ ưu tiên')).toHaveValue('80')
  await page.getByLabel('Công khai lúc').fill('')
  await page.getByRole('button', { name: 'Lưu bài nổi bật' }).click()
  await expect(page.getByText('Bài đã xuất hiện ở trang Chọn đấu trường.')).toBeVisible()

  await page.getByRole('link', { name: 'Đấu trường', exact: true }).click()
  await expect(page.getByRole('link', { name: /Ván Nim của quản trị viên/ })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('link', { name: /Ván Nim của quản trị viên/ })).toBeVisible()

  await page.goto('/#/admin')
  await page.getByRole('button', { name: 'Gỡ Ván Nim của quản trị viên' }).click()
  await page.getByRole('button', { name: 'Xác nhận gỡ' }).click()
  await expect(page.getByText('Đã gỡ bài khỏi khu vực nổi bật.')).toBeVisible()
  await page.getByRole('button', { name: 'Đăng xuất' }).click()
  await expect(page.getByRole('button', { name: 'Đăng nhập quản trị' })).toBeVisible()
  await page.getByRole('link', { name: 'Đấu trường', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Bài mới theo đấu trường' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Ván Nim của quản trị viên/ })).toHaveCount(0)
})

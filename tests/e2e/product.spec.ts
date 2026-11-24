import { expect, test } from './fixtures'

test('plays the homepage demo and resumes a saved campaign round', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Đấu trường tổ hợp' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  const preview = page.getByRole('group', { name: 'Bàn đèn chơi thử' })
  await preview.getByRole('button', { name: 'Đèn thử hàng 1 cột 1' }).click()
  await preview.getByRole('button', { name: 'Đèn thử hàng 2 cột 2' }).click()
  await preview.getByRole('button', { name: 'Đèn thử hàng 3 cột 3' }).click()
  await expect(page.getByText('Đã tắt toàn bộ đèn.')).toBeVisible()
  await page.getByRole('button', { name: 'Đặt lại bàn thử' }).click()
  await expect(page.getByText(/đèn sáng · 0 lượt/)).toBeVisible()

  await page.goto('/#/play/nim/0')
  await page.getByRole('button', { name: /Đống 3 · 4 viên/ }).click()
  await page.getByRole('button', { name: 'Lấy 1 viên', exact: true }).click()
  await page.goto('/#/')
  await expect(page.getByRole('link', { name: 'Chơi tiếp' })).toHaveAttribute('href', '#/play/nim/0/arena')
  await page.getByRole('link', { name: 'Chơi tiếp' }).click()
  await expect(page.getByTestId('move-count')).toHaveText('1')
})

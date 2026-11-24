import { expect, test } from './fixtures'
import { binary } from '../../src/games/binary'
import { candidates } from '../../src/questions/candidates'
import { withQuestionLibrary } from '../../src/questions/library'
import { questionSeed } from '../../src/questions/address'

test('browses the question library on mobile and opens filtered, paginated, and numbered boards', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/#/questions')
  await expect(page.getByRole('heading', { name: 'Ngân hàng bài tập' })).toBeVisible()
  await expect(page.locator('.question-card')).toHaveCount(12)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)

  await page.getByRole('combobox', { name: 'Đấu trường', exact: true }).selectOption('graph')
  await page.getByRole('combobox', { name: 'Cấp độ', exact: true }).selectOption('4')
  await expect(page.getByText('440 bài phù hợp')).toBeVisible()
  await page.getByRole('group', { name: 'Phân trang', exact: true }).getByRole('button', { name: 'Trang sau' }).click()
  const link = page.getByRole('link', { name: /Mở bài 05613/ })
  const exercise = page.locator('.question-card').filter({ has: link })
  await expect(link).toBeVisible()
  await exercise.getByText('Đọc đề').click()
  const setup = exercise.getByText(/Bàn có \d+ chấm/)
  await expect(setup).toBeVisible()
  const statement = await setup.innerText()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  await link.click()
  await expect(page.getByRole('region', { name: 'Đề bài' }).getByText(statement)).toBeVisible()
  await page.getByRole('button', { name: 'Tới bàn chơi' }).click()
  await expect(page.getByRole('heading', { name: 'Bàn chơi' })).toBeFocused()
  await expect(page.getByText('Bài #05613', { exact: false })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Bàn tô màu đồ thị' })).toBeVisible()

  await page.getByRole('link', { name: 'Ngân hàng bài tập' }).click()
  await page.getByLabel('Mở bài theo mã').fill('11001')
  await page.getByRole('button', { name: 'Mở mã bài' }).click()
  await expect(page.getByRole('alert')).toHaveText('Nhập mã bài từ #00001 đến #11000.')
  await page.getByLabel('Mở bài theo mã').fill('#10000')
  await page.getByRole('button', { name: 'Mở mã bài' }).click()
  await expect(page.getByText('Bài #10000', { exact: false })).toBeVisible()
  await expect(page.locator('.light-square')).toHaveCount(25)
})

test('finishes an indexed exercise and restores the win without unlocking campaign ranks', async ({ page }) => {
  const number = 8001
  const seed = questionSeed(number)
  const game = withQuestionLibrary('binary', binary, candidates.binary)
  const level = game.generate(seed, 0)
  const solution = game.solve(level, game.initial(level))!
  await page.goto('/#/play/binary/0/' + seed)
  for (const [index, press] of solution.vector.entries()) {
    if (press) await page.getByRole('button', { name: 'Đèn ' + (Math.floor(index / level.size) + 1) + ', ' + (index % level.size + 1) }).click()
  }
  await page.getByRole('button', { name: 'Kiểm tra' }).click()
  await expect(page.getByText('HOÀN THÀNH', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('HOÀN THÀNH', { exact: true })).toBeVisible()

  await page.getByRole('link', { name: 'Ngân hàng bài tập' }).click()
  await page.getByRole('combobox', { name: 'Tiến độ', exact: true }).selectOption('solved')
  await expect(page.getByText('1 bài phù hợp')).toBeVisible()
  await expect(page.getByRole('link', { name: /Mở bài 08001/ })).toContainText('Đã giải')
  await page.goto('/#/games/binary/1')
  await expect(page.getByText('Hoàn thành một bài ở cấp trước để mở.')).toBeVisible()
})

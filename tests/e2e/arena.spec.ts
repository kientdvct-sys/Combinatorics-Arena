import { expect, test, mountProduction } from './fixtures'
import type { Page } from '@playwright/test'
import { binary } from '../../src/games/binary'
import { circle } from '../../src/games/circle'
import { emptyProgress, serialize, storageKey } from '../../src/engine/storage'
import { domino } from '../../src/games/domino'
import { graph } from '../../src/games/graph'
import { nim } from '../../src/games/nim'

async function openArena(page: Page, mode: string) {
  await page.goto('/')
  await page.getByRole('link', { name: 'Vào đấu trường' }).click()
  await page.locator('.arena-mode-main').getByRole('heading', { name: mode, exact: true }).click()
  await page.getByRole('link', { name: 'Chơi', exact: true }).click()
}

async function submit(page: Page) {
  await page.getByRole('button', { name: 'Kiểm tra', exact: true }).click()
}

async function verifyWin(page: Page) {
  await expect(page.getByText('HOÀN THÀNH', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('HOÀN THÀNH', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Xem thành tích' }).click()
  await expect(page.getByRole('table')).toBeVisible()
}

test('Nim plays real AI turns, persists redo, deducts hints and unlocks Strategist', async ({ page }) => {
  await openArena(page, 'Nim Arena')
  const level = nim.generate('arena', 0)
  let state = nim.initial(level)
  async function move(pile: number, take: number) {
    await page.getByRole('button', { name: new RegExp('Đống ' + (pile + 1) + ' ·') }).click()
    for (let i = 1; i < take; i++) await page.getByRole('button', { name: 'Thêm một viên' }).click()
    await page.getByRole('button', { name: 'Lấy ' + take + ' viên', exact: true }).click()
  }
  const first = nim.solve(level, state).move!
  await move(first.pile, first.take)
  state = nim.apply(level, state, first)
  await expect(page.getByText('AI vừa lấy')).toBeVisible()
  await page.getByRole('button', { name: 'Hoàn tác' }).click()
  await expect(page.getByTestId('move-count')).toHaveText('0')
  await page.reload()
  await page.getByRole('button', { name: 'Làm lại' }).click()
  await expect(page.getByTestId('move-count')).toHaveText('1')
  await page.getByRole('button', { name: /Mở gợi ý 1/ }).click()
  while (!state.winner) {
    const following = nim.solve(level, state).move!
    await move(following.pile, following.take)
    state = nim.apply(level, state, following)
  }
  await submit(page)
  await expect(page.getByTestId('final-score')).toBeVisible()
  expect(Number((await page.getByTestId('final-score').innerText()).split(' ')[0])).toBeLessThanOrEqual(850)
  await verifyWin(page)
  await expect(page.getByRole('cell', { name: 'Bạc' })).toBeVisible()
  await page.getByRole('link', { name: /Nim Arena · Apprentice/ }).click()
  await page.getByRole('link', { name: 'Màn tiếp theo' }).click()
  await expect(page.getByRole('heading', { name: 'Giữ thế sau mỗi lượt' })).toBeVisible()
})

test('Forbidden Circle rejects wraparound conflicts and validates a construction', async ({ page }) => {
  await openArena(page, 'Forbidden Circle')
  const choose = (number: number) => page.getByRole('button', { name: 'Vị trí ' + number, exact: true }).click()
  await choose(1)
  await choose(8)
  await choose(3)
  await submit(page)
  await expect(page.getByText(/đánh dấu đỏ/)).toBeVisible()
  await choose(8)
  await choose(5)
  await submit(page)
  await verifyWin(page)
})

test('the score starts after reading, deducts time and hints, and survives reload', async ({ page }) => {
  const now = new Date('2026-01-01T12:00:00Z')
  await page.clock.install({ time: now })
  await page.clock.pauseAt(new Date(now.getTime() + 1000))
  await page.goto('/#/play/circle/0')
  const score = page.getByTestId('live-score')
  const choose = (number: number) => page.getByRole('button', { name: 'Vị trí ' + number, exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Đề bài' })).toBeVisible()
  await page.clock.runFor(5000)
  await expect(score).toHaveText('1.000')
  await choose(1)
  await page.clock.runFor(3000)
  await expect(score).toHaveText('997')
  await submit(page)
  await expect(score).toHaveText('997')
  await page.getByRole('button', { name: /Mở gợi ý 1/ }).click()
  await expect(score).toHaveText('847')
  await page.reload()
  await expect(score).toHaveText('847')
  await page.clock.runFor(2000)
  await expect(score).toHaveText('845')
  await choose(3)
  await choose(5)
  await submit(page)
  await expect(page.getByTestId('final-score')).toHaveText('845 điểm')
  await page.clock.runFor(3000)
  await expect(page.getByTestId('final-score')).toHaveText('845 điểm')
  await page.reload()
  await expect(page.getByTestId('final-score')).toHaveText('845 điểm')
  await page.getByRole('button', { name: 'Chơi lại' }).click()
  await page.clock.runFor(3000)
  await expect(score).toHaveText('850')
})

test('Forbidden Circle explains this board and keeps forbidden positions numbered', async ({ page }) => {
  await page.goto('/#/play/circle/0/question-v1-2001')
  const problem = page.getByRole('region', { name: 'Đề bài' })
  await expect(problem.getByText(/Có \d+ ô đánh số/)).toBeVisible()
  await expect(problem.getByText(/Hãy chọn đúng \d+ ô/)).toBeVisible()
  await expect(problem.getByText(/Ô \d+ và ô 1 cũng đứng cạnh nhau/)).toBeVisible()
  await expect(problem.getByText(/Ô cấm vẫn giữ nguyên chỗ trên vòng/)).toBeVisible()
  const forbidden = page.getByRole('button', { name: /Vị trí \d+ · bị cấm/ }).first()
  const label = await forbidden.getAttribute('aria-label')
  const number = label?.match(/\d+/)?.[0]
  expect(number).toBeTruthy()
  await expect(forbidden.getByText(number!, { exact: true })).toBeVisible()
  await expect(forbidden.getByText('×', { exact: true })).toBeVisible()
  await expect(forbidden).toBeDisabled()
  const walkthrough = problem.getByText('Cách làm trên bàn và ví dụ')
  await expect(problem.getByText(/Xét ba ô liên tiếp/)).toBeHidden()
  await walkthrough.click()
  await expect(problem.getByText(/Xét ba ô liên tiếp/)).toBeVisible()
})

test('Graph Coloring detects an invalid edge and saves a minimum coloring', async ({ page }) => {
  await openArena(page, 'Graph Coloring')
  const solve = graph.solve(graph.generate('arena', 0), [])
  const colorNames = ['Ngọc', 'Tím', 'Vàng', 'Hồng', 'Lam']
  await page.getByRole('button', { name: 'Đỉnh 1', exact: true }).click()
  await page.getByRole('button', { name: 'Đỉnh 2', exact: true }).click()
  await expect(page.getByText('1 cạnh vi phạm')).toBeVisible()
  for (const [index, color] of solve!.colors.entries()) {
    await page.getByRole('button', { name: 'Màu ' + colorNames[color], exact: true }).click()
    await page.getByRole('button', { name: 'Đỉnh ' + (index + 1), exact: true }).click()
  }
  await submit(page)
  await verifyWin(page)
  await expect(page.getByRole('link', { name: /Graph Coloring · Apprentice/ })).toBeVisible()
})

test('Domino lays a tiling and verifies each step of a color-imbalance proof', async ({ page }) => {
  await openArena(page, 'Domino Invariant')
  const level = domino.generate('arena', 0)
  const solution = domino.solve(level, domino.initial(level))
  let rotated = false
  for (const [a, b] of solution.tiles) {
    const vertical = Math.abs(a - b) === level.cols
    if (vertical !== rotated) {
      await page.getByRole('button', { name: rotated ? 'Xoay ngang' : 'Xoay dọc', exact: true }).click()
      rotated = vertical
    }
    const start = Math.min(a, b)
    await page.getByRole('button', { name: 'Ô ' + (Math.floor(start / level.cols) + 1) + ', ' + (start % level.cols + 1), exact: true }).click()
  }
  await submit(page)
  await verifyWin(page)
  await page.getByRole('link', { name: /Domino Invariant · Apprentice/ }).click()
  await page.getByRole('link', { name: 'Màn tiếp theo' }).click()
  await submit(page)
  await expect(page.getByText('Bật tô hai màu để xác định màu của các ô.')).toBeVisible()
  await page.getByRole('button', { name: 'Tô hai màu' }).click()
  await page.getByRole('button', { name: 'Ô 1, 1 · khuyết' }).click()
  await page.getByRole('button', { name: 'Ô 4, 4 · khuyết' }).click()
  await page.getByRole('button', { name: 'Màu B còn nhiều hơn' }).click()
  await submit(page)
  await expect(page.getByText(/Chứng minh hợp lệ/)).toBeVisible()
})

test('Binary Matrix plays on mobile and progress can be exported and imported', async ({ page, browser }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  await openArena(page, 'Binary Matrix')
  const level = binary.generate('arena', 0)
  const solution = binary.solve(level, binary.initial(level))!
  for (const [index, press] of solution.vector.entries()) {
    if (press) await page.getByRole('button', { name: 'Đèn ' + (Math.floor(index / level.size) + 1) + ', ' + (index % level.size + 1), exact: true }).click()
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
  await submit(page)
  await verifyWin(page)
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Xuất JSON' }).click()
  const downloaded = await downloadEvent
  const other = await browser.newPage()
  try {
    await mountProduction(other)
    await other.goto('/#/progress')
    await expect(other.getByText('Hoàn thành màn đầu tiên để ghi thành tích.')).toBeVisible()
    await other.getByLabel('Tệp tiến độ').setInputFiles((await downloaded.path())!)
    await other.getByRole('button', { name: 'Thay thế tiến độ' }).click()
    await expect(other.getByRole('link', { name: /Binary Matrix · Apprentice/ })).toBeVisible()
  } finally { await other.close() }
})

test('a balanced board requires a Hall witness with the exact neighbor set', async ({ page }) => {
  const progress = emptyProgress()
  progress.unlocked.domino = 4
  await page.addInitScript(({ key, save }) => localStorage.setItem(key, save), { key: storageKey, save: serialize(progress) })
  await page.goto('/#/play/domino/4')
  const problem = page.getByRole('region', { name: 'Đề bài' })
  await expect(problem.getByText(/số ô kề ít hơn số ô trong nhóm/).first()).toBeVisible()
  await expect(problem.getByText(/ngay trên, dưới, trái hoặc phải/)).toBeVisible()
  const level = domino.generate('arena', 4)
  const solution = domino.solve(level, domino.initial(level))
  const cell = (index: number) => page.getByRole('button', {
    name: 'Ô ' + (Math.floor(index / level.cols) + 1) + ', ' + (index % level.cols + 1), exact: true,
  })
  await page.getByRole('button', { name: 'Tô hai màu' }).click()
  for (const index of solution.witness) await cell(index).click()
  await submit(page)
  await expect(page.getByText(/đúng toàn bộ hàng xóm/)).toBeVisible()
  await page.getByRole('button', { name: /Chọn N\(S\)/ }).click()
  for (const index of solution.neighborhood) await cell(index).click()
  await submit(page)
  await expect(page.getByText('HOÀN THÀNH', { exact: true })).toBeVisible()
})

test('the advanced counting goal requires a valid configuration and the exact count', async ({ page }) => {
  const progress = emptyProgress()
  progress.unlocked.circle = 4
  await page.addInitScript(({ key, save }) => localStorage.setItem(key, save), { key: storageKey, save: serialize(progress) })
  await page.goto('/#/play/circle/4')
  const problem = page.getByRole('region', { name: 'Đề bài' })
  await expect(problem.getByText(/rồi nhập tổng số nhóm/)).toBeVisible()
  await expect(problem.getByText(/thứ tự khác nhau vẫn là một nhóm/)).toBeVisible()
  const level = circle.generate('arena', 4)
  const result = circle.solve(level, circle.initial(level))
  const input = page.getByLabel(/Có tất cả bao nhiêu cách chọn/)
  await input.fill(String(result.count))
  await submit(page)
  await expect(page.getByText(/Bạn đang chọn .* Hãy chọn thêm/)).toBeVisible()
  for (const index of result.example.filter(index => !level.required.includes(index))) {
    await page.getByRole('button', { name: 'Vị trí ' + (index + 1), exact: true }).click()
  }
  await input.fill(String(result.count - 1))
  await submit(page)
  await expect(page.getByText(/kiểm tra lại tổng số cách chọn/)).toBeVisible()
  await input.fill(String(result.count))
  await submit(page)
  await expect(page.getByText('HOÀN THÀNH', { exact: true })).toBeVisible()
})

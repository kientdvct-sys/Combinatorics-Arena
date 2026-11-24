import { range, seeded } from '../engine/core'
import type { Rank } from '../engine/core'
import { winningNim } from '../games/nim'
import type { NimLevel } from '../games/nim'
import { adjacent, solveCircle } from '../games/circle'
import type { CircleLevel } from '../games/circle'
import { ringSignature, sample } from './sampling'
import type { Candidate } from './sampling'

export function candidateNim(rank: Rank, trial: number): Candidate<NimLevel> | undefined {
  const random = seeded('questions-nim-v1:' + rank + ':' + trial)
  const rule = rank === 3 ? 'misere' : rank === 4 ? 'bounded' : 'normal'
  const count = [3, 4, 5, 5, 6][rank]
  const limit = rule === 'bounded' ? random.integer(2, 5) : 99
  const piles = range(count).map(index => {
    if (rank === 3 && index < 2 && trial % 3 === 0) return 1
    return random.integer(1, [14, 12, 15, 8, 8][rank])
  })
  if (!winningNim({ rule, limit }, piles)) return
  const level: NimLevel = {
    piles, rule, limit,
    title: ['Ba đống đá', 'Mở đầu có chiến lược', 'Thế cờ nhiều đống', 'Ai lấy viên cuối?', 'Lượt lấy giới hạn'][rank],
    goal: rule === 'bounded' ? 'Mỗi lượt lấy 1–' + limit + ' viên trong một đống. Hãy giành viên cuối.'
      : rule === 'misere' ? 'Ép đối thủ lấy viên cuối cùng.' : 'Hãy lấy viên đá cuối cùng trước đối thủ.',
    complexity: piles.join(' · ') + ' viên ở các đống',
  }
  return { level, signature: [rule, limit, ...[...piles].sort((a, b) => a - b)].join(':') }
}

export function candidateCircle(rank: Rank, trial: number): Candidate<CircleLevel> | undefined {
  const random = seeded('questions-circle-v1:' + rank + ':' + trial)
  const [min, max] = [[10, 14], [11, 16], [13, 18], [15, 20], [17, 22]][rank]
  const size = random.integer(min, max)
  const mode = rank === 0 ? 'construct' : rank === 1 || rank === 3 ? 'maximize' : 'count'
  const target = mode === 'maximize' ? 0 : random.integer([2, 0, 3, 0, 5][rank], [4, 0, 6, 0, 8][rank])
  const requiredCount = random.integer([0, 1, 0, 2, 2][rank], [1, 3, 2, 4, 4][rank])
  const required: number[] = []
  for (const index of sample(range(size), size, random)) {
    if (required.length === requiredCount) break
    if (required.every(other => !adjacent(index, other, size))) required.push(index)
  }
  if (required.length !== requiredCount) return
  const forbidden = sample(range(size).filter(index => !required.includes(index)),
    random.integer([1, 2, 0, 3, 2][rank], [4, 4, 4, 6, 6][rank]), random)
  const level: CircleLevel = {
    title: mode === 'construct' ? 'Xếp chỗ quanh vòng' : mode === 'maximize' ? 'Tối đa ghế khả dụng' : 'Đếm cấu hình vòng tròn',
    goal: mode === 'construct' ? 'Chọn ' + target + ' vị trí hợp lệ, không kề nhau.' : mode === 'maximize'
      ? 'Chọn nhiều vị trí hợp lệ nhất.' : 'Chọn mẫu gồm ' + target + ' vị trí và nhập tổng số cấu hình.',
    complexity: size + ' vị trí · ' + required.length + ' bắt buộc · ' + forbidden.length + ' bị cấm',
    size, required, forbidden, mode, target,
  }
  const solution = solveCircle(level)
  if (mode === 'maximize' ? solution.maximum < requiredCount + 2 : solution.count < 2) return
  const pattern = range(size).map(index => required.includes(index) ? 'R' : forbidden.includes(index) ? 'F' : '.')
  return { level, signature: [mode, target, ringSignature(pattern)].join(':') }
}

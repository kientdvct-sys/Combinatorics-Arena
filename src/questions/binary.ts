import { range, seeded } from '../engine/core'
import type { Rank } from '../engine/core'
import { affected, solveLights } from '../games/binary'
import type { BinaryLevel } from '../games/binary'
import { gridSignature, sample } from './sampling'
import type { Candidate } from './sampling'

export function candidateBinary(rank: Rank, trial: number): Candidate<BinaryLevel> | undefined {
  const random = seeded('questions-binary-v1:' + rank + ':' + trial)
  // Use some 3×3 boards, then fill Apprentice with 4×4 boards after accepting them.
  const size = rank === 0 ? (trial < 125 ? 3 : 4) : 5
  const count = random.integer([2, 4, 6, 8, 11][rank], [6, 8, 11, 13, 17][rank])
  const cells = range(size * size)
  const lights = cells.map(() => 0)
  for (const cell of sample(cells, count, random)) for (const index of affected(size, cell)) lights[index] ^= 1
  const solution = solveLights(size, lights)
  if (!solution || solution.weight < [2, 3, 5, 7, 9][rank]) return
  const requireOptimal = rank >= 3
  const level: BinaryLevel = {
    title: requireOptimal ? 'Tắt đèn với ít lượt bấm nhất' : 'Giải bảng đèn',
    goal: requireOptimal ? 'Tắt hết đèn bằng số lượt bấm ít nhất.' : 'Tắt hết các đèn trên bảng.',
    complexity: size + ' × ' + size + ' · ' + lights.filter(Boolean).length + ' đèn đang sáng',
    size, lights, optimum: solution.weight, requireOptimal,
  }
  return { level, signature: gridSignature(size, size, lights) }
}

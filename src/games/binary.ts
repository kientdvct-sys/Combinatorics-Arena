import { isIndex, pending, range, seeded, won } from '../engine/core'
import type { Challenge, Game } from '../engine/core'
import { campaignVariant } from '../engine/campaign'
import { extraTitles } from './bank'

export interface BinaryLevel extends Challenge { size: number; lights: number[]; optimum: number; requireOptimal: boolean }
export interface BinaryState { lights: number[]; pressed: number[]; moves: number }

export interface AffineSpace {
  particular: number[]
  basis: number[][]
  rank: number
}

export function eliminateGF2(matrix: number[][], rhs: number[], columns = matrix[0]?.length ?? 0): AffineSpace | null {
  if (matrix.length !== rhs.length || matrix.some(row => row.length !== columns) ||
      rhs.some(bit => bit !== 0 && bit !== 1) || matrix.some(row => row.some(bit => bit !== 0 && bit !== 1))) {
    throw new Error('Expected a binary matrix and matching right-hand side.')
  }
  const rows = matrix.map((row, index) => [...row, rhs[index]])
  const pivots: number[] = []
  for (const col of range(columns)) {
    const top = pivots.length
    const pivot = rows.findIndex((row, index) => index >= top && row[col] === 1)
    if (pivot === -1) continue
    ;[rows[top], rows[pivot]] = [rows[pivot], rows[top]]
    for (const row of range(rows.length)) {
      if (row === top || rows[row][col] === 0) continue
      for (let position = col; position <= columns; position++) rows[row][position] ^= rows[top][position]
    }
    pivots.push(col)
  }
  if (rows.slice(pivots.length).some(row => row[columns] === 1)) return null
  const particular = range(columns).map(() => 0)
  pivots.forEach((col, position) => { particular[col] = rows[position][columns] })
  const basis = range(columns).filter(col => !pivots.includes(col)).map(free =>
    range(columns).map(col => col === free ? 1 : pivots.includes(col) ? rows[pivots.indexOf(col)][free] : 0))
  return { particular, basis, rank: pivots.length }
}

const weight = (bits: number[]) => bits.reduce((total, bit) => total + bit, 0)

export function minimumGF2(space: AffineSpace) {
  if (space.basis.length > 16) throw new Error('Exact minimization supports at most 16 free variables.')
  let best = [...space.particular]
  let bestWeight = weight(best)
  const current = [...best]

  function inspect(index: number) {
    if (index === space.basis.length) {
      const presses = weight(current)
      if (presses < bestWeight) {
        best = [...current]
        bestWeight = presses
      }
      return
    }
    inspect(index + 1)
    const vector = space.basis[index]
    for (const col of range(current.length)) current[col] ^= vector[col]
    inspect(index + 1)
    for (const col of range(current.length)) current[col] ^= vector[col]
  }

  inspect(0)
  return { vector: best, weight: bestWeight, solutions: 2 ** space.basis.length }
}

export function affected(size: number, cell: number) {
  const row = Math.floor(cell / size)
  const col = cell % size
  return [[row, col], [row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]]
    .filter(([r, c]) => isIndex(r, size) && isIndex(c, size)).map(([r, c]) => r * size + c)
}

function flip(size: number, lights: number[], cell: number) {
  const next = [...lights]
  for (const index of affected(size, cell)) next[index] ^= 1
  return next
}

export function solveLights(size: number, lights: number[]) {
  const matrix = range(size * size).map(out => range(size * size).map(press => Number(affected(size, press).includes(out))))
  const space = eliminateGF2(matrix, lights)
  return space ? { ...minimumGF2(space), rank: space.rank, nullity: space.basis.length } : null
}

export const binary: Game<BinaryState, number, BinaryLevel, ReturnType<typeof solveLights>> = {
  generate(seed, rank) {
    const size = [3, 4, 5, 5, 5][rank]
    const requireOptimal = rank >= 3
    const roll = seeded('binary:' + seed)
    const threshold = [2, 3, 5, 7, 9][rank]
    let lights = range(size * size).map(() => 0)
    let optimum = 0
    const blank = range(size * size).map(() => 0)
    for (let attempt = 0; attempt < 100; attempt++) {
      const cells = range(size * size)
      const picks: number[] = []
      while (picks.length < [3, 5, 7, 9, 12][rank]) picks.push(cells.splice(roll.integer(0, cells.length - 1), 1)[0])
      const presses = seed === 'arena' && rank === 0 ? [0, 4, 8] : picks
      lights = presses.reduce((board, index) => flip(size, board, index), blank)
      optimum = solveLights(size, lights)!.weight
      if (optimum >= threshold) break
    }
    if (optimum < threshold) {
      // Use a verified scramble if repeated seeded attempts all fall below the difficulty threshold.
      const fallback = [
        [0, 4, 8], [2, 5, 15], [5, 9, 12, 13, 16, 17, 20],
        [5, 9, 10, 12, 13, 16, 17, 20, 21], [0, 3, 5, 9, 11, 12, 14, 16, 17, 23],
      ][rank]
      lights = fallback.reduce((board, index) => flip(size, board, index), blank)
      optimum = solveLights(size, lights)!.weight
    }
    if (optimum < threshold) throw new Error('No sufficiently challenging Binary Matrix board found.')
    return {
      title: extraTitles.binary[rank][campaignVariant(seed) - 1] ?? ['Tắt đèn', 'Nhiều đường tắt', 'Tự do trong hệ nhị phân', 'Lời giải ngắn nhất', 'Tối ưu trên không gian nghiệm'][rank],
      goal: requireOptimal ? 'Tắt mọi đèn bằng số lần bấm tối thiểu.' : 'Tắt tất cả đèn.',
      complexity: ['Phân tích phạm vi thay đổi của mỗi ô.', 'Xử lý nhiều nghiệm do biến tự do.', 'Lập hệ phương trình trên GF(2) cho bảng 25 ô.', 'So sánh trọng số của mọi nghiệm.', 'Tìm nghiệm có ít nhất 9 thao tác và chứng nhận tối ưu.'][rank],
      size, lights, optimum, requireOptimal,
    }
  },
  initial: level => ({ lights: [...level.lights], pressed: range(level.size ** 2).map(() => 0), moves: 0 }),
  apply(level, state, cell) {
    if (!isIndex(cell, level.size ** 2)) return state
    const pressed = [...state.pressed]
    pressed[cell] ^= 1
    return { lights: flip(level.size, state.lights, cell), pressed, moves: state.moves + 1 }
  },
  validate(level, state) {
    if (state.lights.some(Boolean)) return pending('Còn ' + weight(state.lights) + ' đèn đang bật.')
    if (level.requireOptimal && state.moves !== level.optimum) return pending('Tất cả đèn đã tắt. Có thể hoàn thành bằng ' + level.optimum + ' lần bấm. Hãy hoàn tác hoặc thử lại.')
    return won(state.moves === level.optimum ? 'Đã tắt toàn bộ đèn với số bước tối thiểu.' : 'Đã tắt toàn bộ đèn.')
  },
  solve: (level, state) => solveLights(level.size, state.lights),
  hint(level, state, tier) {
    if (tier === 1) return 'Bấm một ô hai lần triệt tiêu nhau. Thứ tự bấm không ảnh hưởng tới trạng thái cuối.'
    if (tier === 2) return 'Gọi xᵢ là số lần bấm ô i theo modulo 2. Mỗi đèn cho một phương trình chứa ô đó và các ô kề cạnh.'
    const result = solveLights(level.size, state.lights)
    const index = result?.vector.indexOf(1) ?? -1
    return index >= 0 ? 'Từ trạng thái hiện tại, một lời giải ngắn nhất có bấm ô hàng ' + (Math.floor(index / level.size) + 1) +
      ', cột ' + (index % level.size + 1) + '. Bạn cần tìm các ô còn lại.' : 'Nếu đã tắt đèn, hãy khử các lần bấm lặp và so sánh những nghiệm khác.'
  },
  explain(level) {
    const result = solveLights(level.size, level.lights)!
    return 'Đặt xᵢ = 1 khi cần bấm ô i. Hệ Ax = b trên GF(2) mô tả các ô bị đảo. Khử Gauss cho hạng ' +
      result.rank + ' và ' + result.nullity + ' biến tự do, nên màn gốc có ' + result.solutions +
      ' nghiệm. Liệt kê các tổ hợp của cơ sở hạt nhân rồi cộng với một nghiệm riêng. Trọng số nhỏ nhất là ' + result.weight + ' lần bấm.'
  },
}

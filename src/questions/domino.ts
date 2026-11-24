import { range, seeded } from '../engine/core'
import type { Rank } from '../engine/core'
import { dominoTask } from '../engine/lessons'
import { boardCounts, parity, solveDomino } from '../games/domino'
import type { DominoLevel, Tile } from '../games/domino'
import { gridSignature, sample } from './sampling'
import type { Candidate, Random } from './sampling'

const sizes = [
  [[4, 6], [5, 6], [4, 8]],
  [[4, 6], [5, 6], [6, 6]],
  [[6, 6], [6, 8], [5, 8], [6, 10]],
  [[5, 7], [6, 8], [6, 9]],
  [[6, 9], [7, 9], [7, 10]],
] as const

function tilingHoles(rows: number, cols: number, rank: Rank, random: Random) {
  const pairs: Tile[] = []
  for (const row of range(rows)) for (let col = 0; col < cols; col += 2) {
    pairs.push([row * cols + col, row * cols + col + 1])
  }
  for (let turn = 0; turn < rows * cols; turn++) {
    const top = random.integer(0, rows - 2) * cols + random.integer(0, cols - 2)
    const area = [top, top + 1, top + cols, top + cols + 1]
    const interior = pairs.flatMap((pair, index) => pair.every(cell => area.includes(cell)) ? [index] : [])
    if (interior.length !== 2) continue
    const [i, j] = interior
    const vertical = pairs[i][1] - pairs[i][0] === cols
    pairs[i] = [top, top + (vertical ? 1 : cols)]
    pairs[j] = vertical ? [top + cols, top + cols + 1] : [top + 1, top + 1 + cols]
  }
  return sample(pairs, rank === 0 ? random.integer(2, 5) : random.integer(5, 10), random).flat()
}

function rectangleNeighbors(cell: number, rows: number, cols: number) {
  const result: number[] = []
  if (cell >= cols) result.push(cell - cols)
  if (cell < (rows - 1) * cols) result.push(cell + cols)
  if (cell % cols > 0) result.push(cell - 1)
  if (cell % cols < cols - 1) result.push(cell + 1)
  return result
}

function hallHoles(rows: number, cols: number, rank: Rank, random: Random) {
  const count = rank === 3 ? random.integer(2, 3) : random.integer(3, Math.min(5, Math.floor((cols + 1) / 2)))
  // The first row is an alternating path. Its endpoints have the same color.
  // The connector touches an interior neighbor and supplies one extra cell of the other color.
  const kept = new Set([...range(2 * count - 1), cols + 1, 2 * cols + 1, 2 * cols + 2, 2 * cols + 3, 3 * cols + 2])
  const allCells = range(rows * cols)
  const growth = random.integer(rank === 3 ? 3 : 5, rank === 3 ? 8 : 13)
  for (let turn = 0; turn < growth; turn++) {
    const options: Tile[] = []
    for (const cell of allCells) {
      if (cell < 2 * cols || kept.has(cell)) continue
      for (const next of rectangleNeighbors(cell, rows, cols)) {
        if (next <= cell || kept.has(next)) continue
        if (rectangleNeighbors(cell, rows, cols).some(near => kept.has(near)) ||
            rectangleNeighbors(next, rows, cols).some(near => kept.has(near))) options.push([cell, next])
      }
    }
    if (!options.length) break
    for (const cell of options[random.integer(0, options.length - 1)]) kept.add(cell)
  }
  return allCells.filter(index => !kept.has(index))
}

export function candidateDomino(rank: Rank, trial: number): Candidate<DominoLevel> | undefined {
  const random = seeded('questions-domino-v1:' + rank + ':' + trial)
  const options = sizes[rank]
  const [rows, cols] = options[random.integer(0, options.length - 1)]
  const objective = rank === 1 ? 'imbalance' : rank >= 3 ? 'hall' : 'tile'
  const level: DominoLevel = {
    title: objective === 'tile' ? 'Phủ kín bàn khuyết' : objective === 'hall' ? 'Nhóm ô thiếu chỗ ghép' : 'So sánh số ô hai màu',
    goal: dominoTask(objective),
    complexity: '', rows, cols, holes: [], objective,
  }
  const cells = range(rows * cols)
  if (objective === 'tile') level.holes = tilingHoles(rows, cols, rank, random)
  else if (objective === 'hall') level.holes = hallHoles(rows, cols, rank, random)
  else {
    const color = random.integer(0, 1)
    level.holes = sample(cells.filter(cell => parity(level, cell) === color), random.integer(2, 6), random)
  }
  const matching = solveDomino(level)
  const [a, b] = boardCounts(level)
  if (matching.tileable !== (objective === 'tile') ||
      (objective === 'hall' && (a !== b || matching.witness.length <= matching.neighborhood.length)) ||
      (objective === 'imbalance' && a === b)) return
  level.complexity = rows + ' × ' + cols + ' · ' + (rows * cols - level.holes.length) + ' ô còn lại'
  return { level, signature: gridSignature(rows, cols, cells.map(cell => Number(level.holes.includes(cell)))) }
}

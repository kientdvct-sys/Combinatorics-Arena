import { isIndex, pending, range, seeded, won } from '../engine/core'
import type { Challenge, Game } from '../engine/core'
import { campaignVariant } from '../engine/campaign'
import { extraDomino, extraTitles } from './bank'

export interface DominoLevel extends Challenge {
  rows: number
  cols: number
  holes: number[]
  objective: 'tile' | 'imbalance' | 'hall'
}
export type Tile = [number, number]
export interface DominoState {
  tiles: Tile[]
  checkered: boolean
  proof: { marks: number[]; neighbors: number[]; side: number }
}
export type DominoAction =
  | { type: 'place'; cell: number; vertical: boolean }
  | { type: 'remove'; cell: number }
  | { type: 'checker' }
  | { type: 'mark' | 'neighbor' | 'side'; cell: number }

export const parity = (level: DominoLevel, cell: number) => (Math.floor(cell / level.cols) + cell % level.cols) % 2

export function neighborsOf(level: DominoLevel, cell: number) {
  const deltas = [-level.cols, level.cols]
  if (cell % level.cols > 0) deltas.push(-1)
  if (cell % level.cols < level.cols - 1) deltas.push(1)
  return deltas.map(delta => cell + delta)
    .filter(next => isIndex(next, level.rows * level.cols) && !level.holes.includes(next))
}

export function boardCounts(level: DominoLevel) {
  const counts = [0, 0]
  for (const cell of range(level.rows * level.cols)) {
    if (!level.holes.includes(cell)) counts[parity(level, cell)]++
  }
  return counts
}

export function solveDomino(level: DominoLevel) {
  const available = range(level.rows * level.cols).filter(cell => !level.holes.includes(cell))
  const left = available.filter(cell => parity(level, cell) === 0)
  const right = available.filter(cell => parity(level, cell) === 1)
  const pair = new Map<number, number>()

  function augment(cell: number, visited: Set<number>): boolean {
    for (const neighbor of neighborsOf(level, cell)) {
      if (visited.has(neighbor)) continue
      visited.add(neighbor)
      const old = pair.get(neighbor)
      if (old === undefined || augment(old, visited)) {
        pair.set(neighbor, cell)
        return true
      }
    }
    return false
  }

  for (const cell of left) augment(cell, new Set())
  const tiles: Tile[] = [...pair].map(([b, a]) => [a, b])
  const tileable = 2 * tiles.length === available.length
  const witness = new Set<number>()
  const neighborhood = new Set<number>()
  if (!tileable) {
    const flip = left.length < right.length
    const matchedAcross = flip ? new Map(tiles) : pair
    const matchedStart = new Set(matchedAcross.values())
    for (const cell of flip ? right : left) if (!matchedStart.has(cell)) witness.add(cell)
    // Set iteration expands the alternating search from unmatched vertices.
    for (const cell of witness) for (const next of neighborsOf(level, cell)) {
      neighborhood.add(next)
      const matched = matchedAcross.get(next)
      if (matched !== undefined) witness.add(matched)
    }
  }
  return { tileable, tiles, witness: [...witness], neighborhood: [...neighborhood] }
}

const toggle = (cells: number[], cell: number) => cells.includes(cell) ? cells.filter(index => index !== cell) : [...cells, cell]
const sameSet = (a: number[], b: number[]) => a.length === b.length && new Set(a).size === a.length && a.every(cell => b.includes(cell))

export function validateProof(level: DominoLevel, state: DominoState) {
  const { marks, neighbors, side } = state.proof
  if (!state.checkered) return pending('Bật tô hai màu để xác định màu của các ô.')
  if (level.objective === 'imbalance') {
    if (!sameSet(marks, level.holes)) return pending('Đánh dấu chính xác tất cả ô bị xóa.')
    const counts = boardCounts(level)
    if (!isIndex(side, 2) || counts[side] <= counts[1 - side]) return pending('Chọn màu có nhiều ô còn lại hơn.')
    return won('Chứng minh hợp lệ. Mỗi domino dùng một ô mỗi màu, nhưng hai màu còn lại có số ô khác nhau.')
  }
  if (level.objective !== 'hall') return pending('Màn này yêu cầu phủ kín bàn.')
  if (!marks.length || new Set(marks).size !== marks.length ||
      marks.some(cell => !isIndex(cell, level.rows * level.cols) || level.holes.includes(cell) ||
        parity(level, cell) !== parity(level, marks[0]))) return pending('Tập S phải gồm các ô có cùng màu và còn trên bàn.')
  const actual = [...new Set(marks.flatMap(cell => neighborsOf(level, cell)))]
  if (!sameSet(neighbors, actual)) return pending('Đánh dấu đúng toàn bộ hàng xóm kề cạnh của S vào tập N(S).')
  if (actual.length >= marks.length) return pending('Tập này chưa thiếu hàng xóm. Tìm S sao cho |N(S)| < |S|.')
  return won('Chứng minh hợp lệ. ' + marks.length + ' ô trong S chỉ có ' + actual.length + ' hàng xóm khả dụng.')
}

export const domino: Game<DominoState, DominoAction, DominoLevel, ReturnType<typeof solveDomino>> = {
  generate(seed, rank) {
    const variant = campaignVariant(seed)
    const extra = extraDomino(rank, variant)
    const rows = extra?.rows ?? [4, 4, 5, 4, 6][rank]
    const cols = extra?.cols ?? [4, 4, 6, 4, 7][rank]
    const olympiad = [
      0, 1, 2, 3, 4, 8, 15, 16, 17, 23,
      ...[3, 4, 5].flatMap(row => [3, 4, 5, 6].map(col => row * cols + col)),
    ]
    const patterns = [[0, 1], [0, 15], [0, 1, 4, 5, 20, 21, 24, 25], [3, 4, 6, 7, 8, 12, 13, 15], range(rows * cols).filter(cell => !olympiad.includes(cell))]
    const orientation = seed === 'arena' ? 0 : seeded('domino:' + seed).integer(0, 3)
    const holes = (extra?.holes ?? patterns[rank]).map(cell => {
      const row = Math.floor(cell / cols)
      const col = cell % cols
      return (orientation & 1 ? rows - 1 - row : row) * cols + (orientation & 2 ? cols - 1 - col : col)
    })
    const objective = rank === 1 ? 'imbalance' : rank > 2 ? 'hall' : 'tile'
    const level: DominoLevel = {
      title: extraTitles.domino[rank][variant - 1] ?? ['Những ô khuyết', 'Bàn cờ mất góc', 'Nút thắt khi phủ', 'Thiếu hàng xóm', 'Chướng ngại cân bằng'][rank],
      goal: objective === 'tile' ? 'Phủ kín tất cả các ô còn lại bằng domino 1 × 2.'
        : objective === 'imbalance' ? 'Chứng minh không thể phủ bằng bất biến hai màu.'
        : 'Tìm tập S cùng màu có ít hàng xóm kề cạnh hơn số ô trong S.',
      complexity: ['Thử ghép ô kề nhau và giữ các ô góc.', 'Mỗi domino luôn chiếm đúng một ô mỗi màu.', 'Tránh để ô lẻ và túi ô cô lập khi phủ.', 'Hai màu cân bằng. Tìm thất bại cục bộ của điều kiện Hall.', 'Tìm chứng chỉ Hall qua nhiều đỉnh bị thắt cổ chai liên tiếp.'][rank],
      rows, cols, holes, objective,
    }
    const solution = solveDomino(level)
    const counts = boardCounts(level)
    if (solution.tileable !== (objective === 'tile') ||
        (objective === 'imbalance' && counts[0] === counts[1]) ||
        (objective === 'hall' && (counts[0] !== counts[1] || solution.witness.length <= solution.neighborhood.length))) throw new Error('Invalid domino goal.')
    return level
  },
  initial: () => ({ tiles: [], checkered: false, proof: { marks: [], neighbors: [], side: -1 } }),
  apply(level, state, action) {
    if (action.type === 'checker') return { ...state, checkered: !state.checkered }
    if (action.type === 'side') return level.objective === 'imbalance' && isIndex(action.cell, 2) && action.cell !== state.proof.side
      ? { ...state, proof: { ...state.proof, side: action.cell } } : state
    if (!isIndex(action.cell, level.rows * level.cols)) return state
    const hole = level.holes.includes(action.cell)
    if (action.type === 'mark' && (level.objective === 'imbalance' || (level.objective === 'hall' && !hole))) {
      return { ...state, proof: { ...state.proof, marks: toggle(state.proof.marks, action.cell) } }
    }
    if (action.type === 'neighbor' && level.objective === 'hall' && !hole) {
      return { ...state, proof: { ...state.proof, neighbors: toggle(state.proof.neighbors, action.cell) } }
    }
    if (level.objective !== 'tile' || hole) return state
    if (action.type === 'remove' && state.tiles.some(tile => tile.includes(action.cell))) {
      return { ...state, tiles: state.tiles.filter(tile => !tile.includes(action.cell)) }
    }
    if (action.type !== 'place') return state
    const next = action.cell + (action.vertical ? level.cols : 1)
    if (!neighborsOf(level, action.cell).includes(next) ||
        state.tiles.some(tile => tile.includes(action.cell) || tile.includes(next))) return state
    return { ...state, tiles: [...state.tiles, [action.cell, next]] }
  },
  validate(level, state) {
    if (level.objective !== 'tile') return validateProof(level, state)
    const cells = state.tiles.flat()
    if (new Set(cells).size !== cells.length || state.tiles.some(([start, end]) =>
      !isIndex(start, level.rows * level.cols) || level.holes.includes(start) || !neighborsOf(level, start).includes(end))) {
      return pending('Có domino nằm sai vị trí.')
    }
    const remaining = level.rows * level.cols - level.holes.length - cells.length
    return remaining ? pending('Còn ' + remaining + ' ô cần phủ.') : won('Bạn đã phủ kín bàn bằng các domino hợp lệ.')
  },
  solve: solveDomino,
  hint(level, _state, tier) {
    if (tier === 1) return 'Tô hai màu. Quan sát các vùng bị thu hẹp bởi biên bàn hoặc ô khuyết.'
    if (tier === 2) return level.objective === 'hall' ? 'Mỗi ô trong S cần một hàng xóm riêng biệt. Hãy tìm vài ô đang phải tranh cùng hàng xóm.'
      : 'Mỗi domino ghép hai ô kề cạnh, vì thế luôn lấy một ô mỗi màu.'
    if (level.objective === 'imbalance') return 'Bàn ban đầu có số ô hai màu bằng nhau. So sánh màu của các ô mất để xác định màu còn dư.'
    if (level.objective === 'hall') return 'Tìm các ô bậc một trước. Thêm các ô cùng màu có hàng xóm trùng với chúng và đếm lại N(S).'
    return 'Xử lý các ô chỉ có một hướng đặt trước. Giữ các ô ở biên khuyết có ít nhất một cách ghép.'
  },
  explain(level) {
    const solution = solveDomino(level)
    if (level.objective === 'tile') return 'Tách bàn thành hai phía theo màu. Một domino tương ứng với một cạnh ghép nối hai màu. Cách phủ của bạn là ghép cặp hoàn hảo gồm ' + solution.tiles.length + ' cạnh.'
    if (level.objective === 'imbalance') {
      const [a, b] = boardCounts(level)
      return 'Bàn còn ' + a + ' ô màu A và ' + b + ' ô màu B. Mỗi domino dùng một ô mỗi màu, nên bất biến hiệu số loại trừ mọi cách phủ.'
    }
    return 'Mỗi ô trong S cần một đối tác riêng thuộc N(S). Khi |S| > |N(S)|, nguyên lý Dirichlet loại trừ cách ghép. Hai màu của bàn vẫn cân bằng. Bộ giải ghép cặp cực đại còn có thể tự dựng chứng chỉ qua các đường xen kẽ từ ô chưa ghép.'
  },
}

import { expect, it } from 'vitest'
import type { Rank } from '../../src/engine/core'
import { adjacent, circle, kaplansky, solveCircle, validChoice } from '../../src/games/circle'
import { conflicts, exactColor, graph } from '../../src/games/graph'

it('rejects wraparound adjacency, duplicate selections and forbidden points', () => {
  const level = circle.generate('arena', 0)
  expect(adjacent(0, 7, 8)).toBe(true)
  expect(validChoice(level, [0, 7])).toBe(false)
  expect(validChoice(level, [0, 0])).toBe(false)
  expect(validChoice(level, [0, 2, 4])).toBe(true)
  expect(validChoice({ ...level, required: [6], forbidden: [0] }, [0, 2, 4])).toBe(false)
})

it('matches Kaplansky against backtracking and independently verifies every published goal', () => {
  const base = circle.generate('arena', 0)
  expect(kaplansky(8, 3)).toBe(16)
  for (let size = 3; size <= 15; size++) for (let target = 0; target <= size; target++) {
    expect(kaplansky(size, target)).toBe(solveCircle({ ...base, size, target }).count)
  }
  for (const seed of ['arena', 'ring']) for (let rank = 0; rank < 5; rank++) {
    const level = circle.generate(seed, rank as Rank)
    const solution = solveCircle(level)
    expect(circle.validate(level, { chosen: level.mode === 'maximize' ? solution.largest : solution.example, answer: String(solution.count) }).status).toBe('won')
  }
})

it('reports edge conflicts, checks locks and certifies exact chromatic numbers', () => {
  expect(conflicts([[0, 1], [1, 2]], [1, 1, -1])).toEqual([[0, 1]])
  for (const seed of ['arena', 'chromatic']) for (let rank = 0; rank < 5; rank++) {
    const level = graph.generate(seed, rank as Rank)
    const result = exactColor(level)!
    expect(result.minimum).toBe([3, 2, 4, 4, 5][rank])
    expect(graph.validate(level, result.colors).status).toBe('won')
    if (rank === 4) expect(graph.apply(level, result.colors, { vertex: 11, color: -1 })).toBe(result.colors)
  }
  const triangle = { ...graph.generate('arena', 0), size: 3, edges: [[0, 1], [1, 2], [2, 0]] as [number, number][], palette: 2 }
  expect(exactColor(triangle)).toBeNull()
})

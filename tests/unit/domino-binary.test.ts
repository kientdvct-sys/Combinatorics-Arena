import { expect, it } from 'vitest'
import type { Rank } from '../../src/engine/core'
import type { DominoAction } from '../../src/games/domino'
import { boardCounts, domino, solveDomino } from '../../src/games/domino'
import { affected, binary, eliminateGF2, minimumGF2, solveLights } from '../../src/games/binary'

it('validates perfect matchings and structured certificates, including balanced impossible boards', () => {
  for (const seed of ['arena', 'reflect', 'domino']) for (let rank = 0; rank < 5; rank++) {
    const level = domino.generate(seed, rank as Rank)
    const solution = solveDomino(level)
    let state = domino.initial(level)
    const act = (action: DominoAction) => { state = domino.apply(level, state, action) }
    expect(domino.validate(level, state).status).toBe('pending')
    expect(solution.tileable).toBe(level.objective === 'tile')
    if (level.objective === 'tile') {
      for (const [a, b] of solution.tiles) act({ type: 'place', cell: Math.min(a, b), vertical: Math.abs(a - b) === level.cols })
    } else {
      act({ type: 'checker' })
      const counts = boardCounts(level)
      if (level.objective === 'imbalance') {
        expect(counts[0]).not.toBe(counts[1])
        for (const cell of level.holes) act({ type: 'mark', cell })
        act({ type: 'side', cell: counts[0] > counts[1] ? 0 : 1 })
      } else {
        expect(counts[0]).toBe(counts[1])
        expect(solution.witness.length).toBeGreaterThan(solution.neighborhood.length)
        for (const cell of solution.witness) act({ type: 'mark', cell })
        expect(domino.validate(level, state).status).toBe('pending')
        for (const cell of solution.neighborhood) act({ type: 'neighbor', cell })
      }
    }
    expect(domino.validate(level, state).status).toBe('won')
  }
})

it('rejects overlap, holes and wraparound placement', () => {
  const level = domino.generate('arena', 0)
  const state = domino.initial(level)
  expect(domino.apply(level, state, { type: 'place', cell: 3, vertical: false })).toBe(state)
  expect(domino.apply(level, state, { type: 'place', cell: 0, vertical: true })).toBe(state)
  const placed = domino.apply(level, state, { type: 'place', cell: 2, vertical: false })
  expect(domino.apply(level, placed, { type: 'place', cell: 2, vertical: true })).toBe(placed)
})

it('detects inconsistency, finds multiple solutions and proves minimum GF(2) weight', () => {
  expect(eliminateGF2([[1, 1], [1, 1]], [0, 1])).toBeNull()
  const space = eliminateGF2([[1, 1, 0], [1, 0, 1]], [1, 1])!
  expect(space.rank).toBe(2)
  expect(minimumGF2(space)).toEqual({ vector: [1, 0, 0], weight: 1, solutions: 2 })
  expect(affected(3, 2).sort((a, b) => a - b)).toEqual([1, 2, 5])
})

it('publishes deterministic solvable boards and validates optimal states', () => {
  for (const seed of ['arena', 'field', 'binary']) for (let rank = 0; rank < 5; rank++) {
    const level = binary.generate(seed, rank as Rank)
    expect(level).toEqual(binary.generate(seed, rank as Rank))
    const optimum = solveLights(level.size, level.lights)!
    expect(optimum.weight).toBe(level.optimum)
    let state = binary.initial(level)
    optimum.vector.forEach((press, index) => { if (press) state = binary.apply(level, state, index) })
    expect(binary.validate(level, state).status).toBe('won')
    if (level.requireOptimal) expect(binary.validate(level, { ...state, moves: state.moves + 2 }).status).toBe('pending')
  }
})

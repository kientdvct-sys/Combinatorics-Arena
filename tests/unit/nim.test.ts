import { expect, it } from 'vitest'
import { nim, nimSum, optimalNim } from '../../src/games/nim'
import type { Rank } from '../../src/engine/core'

it('makes the optimal normal Nim move and wins against the deterministic AI', () => {
  const level = nim.generate('arena', 0)
  expect(nimSum(level.piles)).toBe(7)
  expect(optimalNim(level, level.piles)).toEqual({ winning: true, move: { pile: 2, take: 1 } })
  let state = nim.initial(level)
  expect(nim.apply(level, state, { pile: 0, take: 2 })).toBe(state)
  expect(nim.apply(level, state, { pile: 0, take: -1 })).toBe(state)
  while (!state.winner) state = nim.apply(level, state, nim.solve(level, state).move!)
  expect(nim.validate(level, state).status).toBe('won')
  expect(nim.validate(level, { ...state, winner: 'ai' }).status).toBe('lost')
})

it('uses the real terminal and move rules for both variants', () => {
  const misere = nim.generate('arena', 3)
  const bounded = nim.generate('arena', 4)
  expect(optimalNim(misere, [1]).winning).toBe(false)
  expect(optimalNim(misere, [1, 1]).winning).toBe(true)
  expect(nim.apply(misere, { piles: [1], winner: null, reply: null }, { pile: 0, take: 1 }).winner).toBe('ai')
  expect(optimalNim(bounded, [4]).winning).toBe(false)
  expect(optimalNim(bounded, [5]).move?.take).toBe(1)
})

it('always publishes a reproducible winning opening', () => {
  for (let tier = 0; tier < 5; tier++) for (const seed of ['arena', 'Hải Phòng', 'sun', 'polytope', '42']) {
    const level = nim.generate(seed, tier as Rank)
    expect(level).toEqual(nim.generate(seed, tier as Rank))
    expect(optimalNim(level, level.piles).winning).toBe(true)
  }
})

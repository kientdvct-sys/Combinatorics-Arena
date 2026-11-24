import { expect, it } from 'vitest'
import { campaignLevelCount, campaignSeeds } from '../../src/engine/campaign'
import type { Rank } from '../../src/engine/core'
import { binary } from '../../src/games/binary'
import { circle } from '../../src/games/circle'
import { domino } from '../../src/games/domino'
import { graph } from '../../src/games/graph'
import { nim } from '../../src/games/nim'

it('publishes distinct verified boards for all 100 ranked challenges', () => {
  expect(campaignLevelCount).toBe(100)
  for (let index = 0; index < 5; index++) {
    const rank = index as Rank
    const signatures = Array.from({ length: 5 }, () => new Set<string>())
    for (const seed of campaignSeeds) {
      const n = nim.generate(seed, rank)
      expect(nim.solve(n, nim.initial(n)).winning, n.title).toBe(true)
      signatures[0].add(JSON.stringify([n.limit, [...n.piles].sort((a, b) => a - b)]))

      const c = circle.generate(seed, rank)
      const independent = circle.solve(c, circle.initial(c))
      expect(circle.validate(c, {
        chosen: c.mode === 'maximize' ? independent.largest : independent.example,
        answer: String(independent.count),
      }).status, c.title).toBe('won')
      signatures[1].add(JSON.stringify([c.size, c.target, c.required, c.forbidden]))

      const g = graph.generate(seed, rank)
      const coloring = graph.solve(g, graph.initial(g))!
      expect(graph.validate(g, coloring.colors).status, g.title).toBe('won')
      signatures[2].add(JSON.stringify([g.size, g.edges, g.locked]))

      const d = domino.generate(seed, rank)
      const matching = domino.solve(d, domino.initial(d))
      expect(matching.tileable, d.title).toBe(d.objective === 'tile')
      if (d.objective === 'hall') {
        const state = domino.initial(d)
        state.checkered = true
        state.proof.marks = matching.witness
        state.proof.neighbors = matching.neighborhood
        expect(domino.validate(d, state).status, d.title).toBe('won')
      }
      signatures[3].add(JSON.stringify([d.rows, d.cols, d.holes]))

      const b = binary.generate(seed, rank)
      let board = binary.initial(b)
      const solution = binary.solve(b, board)!
      for (const [cell, bit] of solution.vector.entries()) {
        if (bit) board = binary.apply(b, board, cell)
      }
      expect(binary.validate(b, board).status, b.title).toBe('won')
      signatures[4].add(JSON.stringify(b.lights))
    }
    for (const [game, seen] of signatures.entries()) expect(seen.size, ['nim', 'circle', 'graph', 'domino', 'binary'][game] + ' rank ' + rank).toBe(campaignSeeds.length)
  }
})

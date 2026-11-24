import { expect, it } from 'vitest'
import { range } from '../../src/engine/core'
import type { Rank } from '../../src/engine/core'
import { campaignLevelCount, campaignSeeds } from '../../src/engine/campaign'
import { describeLesson } from '../../src/engine/lessons'
import type { ArenaLevel } from '../../src/engine/lessons'
import { challengeKey, deserialize, emptyProgress, outcome, serialize, withBookmark, withCompletion, withDraft } from '../../src/engine/storage'
import type { Draft } from '../../src/engine/storage'
import { nim, optimalNim, winningNim } from '../../src/games/nim'
import { circle } from '../../src/games/circle'
import { graph } from '../../src/games/graph'
import { domino } from '../../src/games/domino'
import { binary } from '../../src/games/binary'
import { questionAddress, questionCount, questionFromKey, questionModes, questionSeed, readQuestion } from '../../src/questions/address'
import { candidates } from '../../src/questions/candidates'
import index from '../../src/questions/index.generated'
import extra from '../../src/questions/extra.generated'

function checkProblem(level: ArenaLevel, label: string) {
  const problem = describeLesson(level)
  if (!(problem.setup.trim() && problem.rules.length && problem.rules.every(rule => rule.trim()) &&
        problem.steps.length && problem.example.trim() && problem.task === level.goal)) {
    throw new Error('Incomplete problem at ' + label)
  }
}

it('contains 11,000 distinct boards with complete problems and accepted winning states', () => {
  let verified = 0
  for (const mode of questionModes) {
    const seen = new Set<string>()
    for (const [rankIndex, trials] of index[mode].entries()) {
      const rank = rankIndex as Rank
      expect(trials).toHaveLength(400)
      expect(extra[mode][rank]).toHaveLength(40)
      for (const trial of [...trials, ...extra[mode][rank]]) {
        const candidate = candidates[mode](rank, trial)
        if (!candidate) throw new Error(mode + ' has an invalid candidate at ' + rank + ':' + trial)
        if (seen.has(candidate.signature)) throw new Error(mode + ' has a duplicate at ' + rank + ':' + trial)
        seen.add(candidate.signature)
        checkProblem(candidate.level, mode + ':' + rank + ':' + trial)
        // These checks exercise the validators with witnesses from each mode's solver.
        if (mode === 'nim') {
          const level = candidates.nim(rank, trial)!.level
          let state = nim.initial(level)
          while (!state.winner) state = nim.apply(level, state, nim.solve(level, state).move!)
          expect(nim.validate(level, state).status).toBe('won')
        } else if (mode === 'circle') {
          const level = candidates.circle(rank, trial)!.level
          const solution = circle.solve(level, circle.initial(level))
          const chosen = level.mode === 'maximize' ? solution.largest : solution.example
          expect(circle.validate(level, { chosen, answer: String(solution.count) }).status).toBe('won')
        } else if (mode === 'graph') {
          const level = candidates.graph(rank, trial)!.level
          expect(graph.validate(level, graph.solve(level, graph.initial(level))!.colors).status).toBe('won')
        } else if (mode === 'domino') {
          const level = candidates.domino(rank, trial)!.level
          const state = domino.initial(level)
          const solution = domino.solve(level, state)
          if (level.objective === 'tile') state.tiles = solution.tiles
          else {
            state.checkered = true
            state.proof.marks = level.objective === 'hall' ? solution.witness : level.holes
            state.proof.neighbors = solution.neighborhood
            if (level.objective === 'imbalance' && domino.validate(level, {
              ...state, proof: { ...state.proof, side: 0 },
            }).status !== 'won') state.proof.side = 1
            else if (level.objective === 'imbalance') state.proof.side = 0
          }
          expect(domino.validate(level, state).status).toBe('won')
        } else {
          const level = candidates.binary(rank, trial)!.level
          let state = binary.initial(level)
          const solution = binary.solve(level, state)!
          for (const [cell, bit] of solution.vector.entries()) if (bit) state = binary.apply(level, state, cell)
          expect(binary.validate(level, state).status).toBe('won')
        }
        verified++
      }
    }
  }
  expect(verified).toBe(questionCount)
}, 30_000)

it('provides a full problem for every campaign level', () => {
  const games = { nim, circle, graph, domino, binary }
  let checked = 0
  for (const mode of questionModes) for (const rank of [0, 1, 2, 3, 4] as const) {
    for (const seed of campaignSeeds) {
      checkProblem(games[mode].generate(seed, rank), mode + ':' + rank + ':' + seed)
      checked++
    }
  }
  expect(checked).toBe(campaignLevelCount)
})

it('uses stable question codes without advancing campaign unlocks and keeps all records', () => {
  expect(questionAddress(1)).toEqual({ number: 1, mode: 'nim', rank: 0, index: 0 })
  const last = { number: 10000, mode: 'binary', rank: 4, index: 399 }
  expect(readQuestion(questionSeed(10000))).toEqual(last)
  expect(readQuestion(questionSeed(10001))).toEqual({ number: 10001, mode: 'nim', rank: 0, index: 400 })
  expect(readQuestion(questionSeed(11000))).toEqual({ number: 11000, mode: 'binary', rank: 4, index: 439 })
  expect(readQuestion(questionSeed(11001))).toBeUndefined()
  expect(questionFromKey('binary:4:' + questionSeed(10000))).toEqual(last)
  expect(questionFromKey('nim:4:' + questionSeed(10000))).toBeUndefined()

  let progress = emptyProgress()
  const finished: Draft = { done: true, hints: 0, actions: [], cursor: 0, elapsed: 12 }
  const campaignKey = challengeKey('nim', 0, 'arena')
  progress = withDraft(progress, campaignKey, finished)
  for (let number = 1; number <= 26; number++) {
    const seed = questionSeed(number)
    const key = challengeKey('nim', 0, seed)
    progress = withCompletion(progress, 'nim', 0, seed, outcome(0, 3, 12, 0))
    progress = withDraft(progress, key, finished)
  }
  expect(progress.unlocked.nim).toBeUndefined()
  expect(Object.keys(progress.achievements)).toHaveLength(26)
  expect(Object.keys(progress.drafts)).toHaveLength(25)
  expect(progress.drafts[campaignKey]).toBeDefined()
  expect(progress.drafts[challengeKey('nim', 0, questionSeed(1))]).toBeUndefined()
})

it('imports old profiles and preserves new bookmarks by question code', () => {
  const old = JSON.parse(serialize(emptyProgress()))
  delete old.bookmarks
  const loaded = deserialize(JSON.stringify(old))
  expect(loaded.bookmarks).toEqual([])
  const saved = withBookmark(withBookmark(loaded, 1), 11000)
  expect(deserialize(serialize(saved)).bookmarks).toEqual([1, 11000])
  expect(withBookmark(saved, 1).bookmarks).toEqual([11000])
  expect(withBookmark(saved, 11001)).toBe(saved)
})

it('agrees with exhaustive move enumeration for small misère and bounded positions', () => {
  for (const rule of ['misere', 'bounded'] as const) for (const limit of [2, 3, 4, 5]) {
    const level = { ...nim.generate('arena', 0), rule, limit }
    const cache = new Map<string, boolean>()
    function winning(piles: number[]): boolean {
      const key = piles.join(',')
      const previous = cache.get(key)
      if (previous !== undefined) return previous
      const next = piles.flatMap((size, pile) => range(rule === 'bounded' ? Math.min(size, limit) : size)
        .map(take => piles.map((count, index) => index === pile ? count - take - 1 : count)))
      const result = next.length ? next.some(position => !winning(position)) : rule === 'misere'
      cache.set(key, result)
      return result
    }
    for (const a of range(6)) for (const b of range(6)) for (const c of range(6)) {
      const piles = [a, b, c]
      expect(winningNim(level, piles)).toBe(winning(piles))
      if (!winning(piles)) continue
      const move = optimalNim(level, piles).move
      if (move) expect(winning(piles.map((size, index) => move.pile === index ? size - move.take : size))).toBe(false)
    }
  }
})

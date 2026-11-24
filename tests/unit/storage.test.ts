import { expect, it } from 'vitest'
import { circle } from '../../src/games/circle'
import type { CircleAction } from '../../src/games/circle'
import { redo } from '../../src/engine/core'
import { restore, toDraft } from '../../src/engine/session'
import { challengeKey, deserialize, emptyProgress, outcome, serialize, withCompletion } from '../../src/engine/storage'
import { scoreBreakdown } from '../../src/engine/scoring'

it('serializes achievement, unlocked rank, scores and settings with schema versioning', () => {
  const progress = emptyProgress()
  progress.settings.reducedMotion = true
  const first = withCompletion(progress, 'nim', 0, 'arena', outcome(0, 5, 9_000, 2))
  const second = withCompletion(first, 'nim', 0, 'arena', outcome(0, 6, 10_000, 0))
  expect(deserialize(serialize(second))).toEqual(second)
  expect(second.unlocked.nim).toBe(1)
  expect(second.achievements[challengeKey('nim', 0, 'arena')]).toEqual({
    medal: 'gold', points: 990, scoreVersion: 2, bestMoves: 5, bestTime: 9_000, leastHints: 0, completions: 2,
  })
  expect(() => deserialize('{"version":2}')).toThrow()
  expect(() => deserialize('not json')).toThrow()
  expect(() => deserialize(JSON.stringify({ ...second, unlocked: { nim: 9 } }))).toThrow()
})

it('restores only accepted actions and reconstructs redo history', () => {
  const level = circle.generate('arena', 0)
  const frame = restore(circle, level, value => typeof value === 'number' ? ({ type: 'toggle', index: value } satisfies CircleAction) : undefined, {
    actions: [0, 2, 999, 4, 'x'], cursor: 2, hints: 1, elapsed: 1200, done: false,
  })
  expect(frame.current.state.chosen).toEqual([0, 2])
  expect(redo(frame).current.state.chosen).toEqual([0, 2, 4])
  expect(toDraft(frame, 1200, 1, null)).toEqual({
    actions: [{ type: 'toggle', index: 0 }, { type: 'toggle', index: 2 }, { type: 'toggle', index: 4 }],
    cursor: 2, hints: 1, elapsed: 1200, done: false, timingStarted: true, scoreVersion: 2,
  })
})

it('deducts whole seconds and hints, with a zero floor', () => {
  expect(scoreBreakdown(0, 42_999, 1)).toEqual({
    base: 1000, seconds: 42, timePenalty: 42, hintPenalty: 150, points: 808,
  })
  expect(scoreBreakdown(4, 999, 0).points).toBe(2000)
  expect(scoreBreakdown(0, 2_000_000, 3).points).toBe(0)
  expect(scoreBreakdown(0, 42_000, 1, false).points).toBe(850)
})

it('preserves legacy progress and compares new scores under the new rules', () => {
  const key = challengeKey('nim', 0, 'arena')
  const progress = emptyProgress()
  progress.achievements[key] = { points: 1000, medal: 'gold', bestMoves: 3, bestTime: 2000, leastHints: 0, completions: 1 }
  const legacy = deserialize(serialize(progress))
  expect(legacy.achievements[key].points).toBe(1000)
  const replayed = withCompletion(legacy, 'nim', 0, 'arena', outcome(0, 4, 45_000, 1))
  const slower = withCompletion(replayed, 'nim', 0, 'arena', outcome(0, 6, 46_000, 1))
  expect(slower.achievements[key]).toEqual({
    points: 805, medal: 'gold', bestMoves: 3, bestTime: 2000, leastHints: 0, completions: 3, scoreVersion: 2,
  })
})

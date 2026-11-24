import { expect, it } from 'vitest'
import { circle } from '../../src/games/circle'
import type { CircleAction } from '../../src/games/circle'
import { redo } from '../../src/engine/core'
import { restore, toDraft } from '../../src/engine/session'
import { challengeKey, deserialize, emptyProgress, outcome, serialize, withCompletion } from '../../src/engine/storage'

it('serializes achievement, unlocked rank, scores and settings with schema versioning', () => {
  const progress = emptyProgress()
  progress.settings.reducedMotion = true
  const first = withCompletion(progress, 'nim', 0, 'arena', outcome(0, 5, 9_000, 2))
  const second = withCompletion(first, 'nim', 0, 'arena', outcome(0, 6, 10_000, 0))
  expect(deserialize(serialize(second))).toEqual(second)
  expect(second.unlocked.nim).toBe(1)
  expect(second.achievements[challengeKey('nim', 0, 'arena')]).toEqual({
    medal: 'gold', points: 1000, bestMoves: 5, bestTime: 9_000, leastHints: 0, completions: 2,
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
    cursor: 2, hints: 1, elapsed: 1200, done: false,
  })
})

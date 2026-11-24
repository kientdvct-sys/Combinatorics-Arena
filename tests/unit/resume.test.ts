import { afterEach, expect, test, vi } from 'vitest'
import { challengeKey, deserialize, emptyProgress, latestUnfinished, serialize, withDraft } from '../../src/engine/storage'
import type { Draft } from '../../src/engine/storage'

const unfinished: Draft = { actions: [2], cursor: 1, hints: 0, elapsed: 0, done: false }
afterEach(() => vi.useRealTimers())

test('resumes the most recently played unfinished game after export and import', () => {
  vi.useFakeTimers()
  vi.setSystemTime(100)
  const first = withDraft(emptyProgress(), challengeKey('nim', 0, 'arena'), unfinished)
  vi.setSystemTime(250)
  const second = withDraft(first, challengeKey('binary', 0, 'arena'), unfinished)
  vi.setSystemTime(400)
  const third = withDraft(second, challengeKey('circle', 0, 'arena'), { ...unfinished, done: true })
  expect(latestUnfinished(deserialize(serialize(third)))?.href).toBe('#/play/binary/0/arena')
  vi.setSystemTime(600)
  const resumed = withDraft(third, challengeKey('nim', 0, 'arena'), unfinished)
  expect(latestUnfinished(resumed)?.href).toBe('#/play/nim/0/arena')
})

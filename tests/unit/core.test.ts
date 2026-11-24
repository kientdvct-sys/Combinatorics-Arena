import { describe, expect, it } from 'vitest'
import { record, redo, seeded, start, undo } from '../../src/engine/core'

describe('shared engine', () => {
  it('replays seed and stays in the requested range', () => {
    const a = seeded('arena')
    const b = seeded('arena')
    const values = Array.from({ length: 20 }, () => a.integer(-4, 6))
    expect(values).toEqual(Array.from({ length: 20 }, () => b.integer(-4, 6)))
    expect(new Set(values).size).toBeGreaterThan(4)
    expect(values.every(value => value >= -4 && value <= 6)).toBe(true)
  })

  it('undoes, redoes and clears the abandoned branch', () => {
    const history = record(record(start(1), 2), 3)
    expect(redo(undo(history))).toEqual(history)
    expect(record(undo(history), 4)).toEqual({ past: [1, 2], current: 4, future: [] })
    expect(record(history, 3)).toBe(history)
  })
})

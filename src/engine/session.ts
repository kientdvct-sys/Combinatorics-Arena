import { record, start, undo } from './core'
import type { Challenge, Game, History, Result } from './core'
import { isRecord } from './storage'
import type { Draft } from './storage'
import { scoreVersion } from './scoring'

export interface Frame<S, A> { state: S; action: A | null }
type Parser<A> = (value: unknown) => A | undefined

export function restore<S, A, L extends Challenge>(game: Game<S, A, L>, level: L, parser: Parser<A>, draft?: Draft) {
  let history = start<Frame<S, A>>({ state: game.initial(level), action: null })
  if (!draft) return history
  let validFuture = 0
  for (const [index, raw] of draft.actions.entries()) {
    const action = parser(raw)
    if (action === undefined) continue
    const state = game.apply(level, history.current.state, action)
    if (state === history.current.state) continue
    history = record(history, { state, action })
    if (index >= draft.cursor) validFuture++
  }
  for (let move = 0; move < validFuture; move++) history = undo(history)
  return history
}

export function toDraft<S, A>(history: History<Frame<S, A>>, elapsed: number, hints: number, result: Result | null, timingStarted = elapsed > 0): Draft {
  return {
    actions: [...history.past, history.current, ...history.future].slice(1).map(frame => frame.action),
    cursor: history.past.length, elapsed, hints, done: result?.status === 'won', timingStarted, scoreVersion,
  }
}

export function numericAction<T extends string>(value: unknown, fields: readonly T[]): Record<T, number> | undefined {
  if (!isRecord(value) || fields.some(field => typeof value[field] !== 'number' || !Number.isInteger(value[field]))) return undefined
  return Object.fromEntries(fields.map(field => [field, value[field]])) as Record<T, number>
}

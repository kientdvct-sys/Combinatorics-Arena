export const ranks = ['Apprentice', 'Strategist', 'Mathematician', 'Grandmaster', 'Olympiad'] as const
export type Rank = 0 | 1 | 2 | 3 | 4

export interface Challenge {
  title: string
  goal: string
  complexity: string
}

export type Result = { status: 'pending' | 'won' | 'lost'; message: string }

export interface Game<S, A, L extends Challenge, Solution = unknown> {
  generate(seed: string, rank: Rank): L
  initial(level: L): S
  apply(level: L, state: S, action: A): S
  validate(level: L, state: S): Result
  solve(level: L, state: S): Solution
  hint(level: L, state: S, tier: number): string
  explain(level: L, state: S): string
}

export interface History<S> {
  past: S[]
  current: S
  future: S[]
}

export const start = <S>(current: S): History<S> => ({ past: [], current, future: [] })

export function record<S>(history: History<S>, current: S): History<S> {
  if (current === history.current) return history
  return { past: [...history.past, history.current], current, future: [] }
}

export function undo<S>(history: History<S>): History<S> {
  if (!history.past.length) return history
  return {
    past: history.past.slice(0, -1),
    current: history.past[history.past.length - 1],
    future: [history.current, ...history.future],
  }
}

export function redo<S>(history: History<S>): History<S> {
  if (!history.future.length) return history
  return {
    past: [...history.past, history.current],
    current: history.future[0],
    future: history.future.slice(1),
  }
}

export function seeded(seed: string) {
  let state = 2166136261
  for (const letter of seed) state = Math.imul(state ^ letter.codePointAt(0)!, 16777619)
  return {
    integer(min: number, max: number) {
      state = (state + 0x6d2b79f5) | 0
      let value = Math.imul(state ^ (state >>> 15), state | 1)
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
      return min + Math.floor((((value ^ (value >>> 14)) >>> 0) / 4294967296) * (max - min + 1))
    },
  }
}

export const range = (length: number) => Array.from({ length }, (_, index) => index)
export const isIndex = (value: number, length: number) => Number.isInteger(value) && value >= 0 && value < length
export const pending = (message: string): Result => ({ status: 'pending', message })
export const won = (message: string): Result => ({ status: 'won', message })

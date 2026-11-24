import type { Rank } from './core'

export const scoreVersion = 2
export const hintCost = 150
export const secondCost = 1
export const baseScore = (rank: Rank) => 1000 + 250 * rank
export const elapsedSeconds = (milliseconds: number) => Math.floor(milliseconds / 1000)

export function scoreBreakdown(rank: Rank, elapsed: number, hints: number, includeTime = true) {
  const base = baseScore(rank)
  const seconds = elapsedSeconds(elapsed)
  const timePenalty = includeTime ? seconds * secondCost : 0
  const hintPenalty = hints * hintCost
  const points = Math.max(0, base - timePenalty - hintPenalty)
  return { base, seconds, timePenalty, hintPenalty, points }
}

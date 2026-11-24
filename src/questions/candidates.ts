import { extraQuestionsPerRank, questionModes, questionsPerRank } from './address'
import type { ModeId } from '../engine/catalog'
import { candidateNim, candidateCircle } from './nimCircle'
import { candidateGraph } from './graph'
import { candidateDomino } from './domino'
import { candidateBinary } from './binary'
import type { Rank } from '../engine/core'

export const candidates = {
  nim: candidateNim, circle: candidateCircle, graph: candidateGraph, domino: candidateDomino, binary: candidateBinary,
}

type QuestionIndex = Record<ModeId, number[][]>

export function buildQuestionIndex(): QuestionIndex {
  return Object.fromEntries(questionModes.map(mode => {
    const seen = new Set<string>()
    const ranks = []
    for (let rank = 0; rank < 5; rank++) {
      const indices: number[] = []
      for (let trial = 0; trial < 100_000 && indices.length < questionsPerRank; trial++) {
        const candidate = candidates[mode](rank as Rank, trial)
        if (!candidate || seen.has(candidate.signature)) continue
        indices.push(trial)
        seen.add(candidate.signature)
      }
      if (indices.length !== questionsPerRank) throw new Error(mode + ' rank ' + rank + ' only produced ' + indices.length)
      ranks.push(indices)
    }
    return [mode, ranks]
  })) as QuestionIndex
}

export function buildQuestionExtension(base: QuestionIndex): QuestionIndex {
  return Object.fromEntries(questionModes.map(mode => {
    const seen = new Set<string>()
    for (const [rank, trials] of base[mode].entries()) {
      for (const trial of trials) {
        const candidate = candidates[mode](rank as Rank, trial)
        if (candidate) seen.add(candidate.signature)
      }
    }
    const ranks = base[mode].map((prior, rank) => {
      const indices: number[] = []
      for (let trial = prior[prior.length - 1] + 1; trial < 150_000 && indices.length < extraQuestionsPerRank; trial++) {
        const candidate = candidates[mode](rank as Rank, trial)
        if (!candidate || seen.has(candidate.signature)) continue
        indices.push(trial)
        seen.add(candidate.signature)
      }
      if (indices.length !== extraQuestionsPerRank) throw new Error(mode + ' rank ' + rank + ' has too few new exercises')
      return indices
    })
    return [mode, ranks]
  })) as QuestionIndex
}

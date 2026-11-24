import type { Challenge, Game } from '../engine/core'
import type { ArenaLevel } from '../engine/lessons'
import type { QuestionAddress } from './address'
import { questionsPerRank, readQuestion } from './address'
import { candidates } from './candidates'
import type { Candidate } from './sampling'
import index from './index.generated'
import extra from './extra.generated'

function trialFor(address: QuestionAddress) {
  return address.index < questionsPerRank
    ? index[address.mode][address.rank][address.index]
    : extra[address.mode][address.rank][address.index - questionsPerRank]
}

export function questionPreview(address: QuestionAddress): ArenaLevel {
  const result = candidates[address.mode](address.rank, trialFor(address))
  if (!result) throw new Error('Question index points to an invalid exercise: ' + address.number)
  return result.level
}

export function withQuestionLibrary<S, A, L extends Challenge, R>(
  mode: QuestionAddress['mode'],
  game: Game<S, A, L, R>,
  candidate: (rank: QuestionAddress['rank'], trial: number) => Candidate<L> | undefined,
): Game<S, A, L, R> {
  return {
    ...game,
    generate(seed, rank) {
      const address = readQuestion(seed)
      if (!address || address.mode !== mode || address.rank !== rank) return game.generate(seed, rank)
      const result = candidate(rank, trialFor(address))
      if (!result) throw new Error('Question index points to an invalid exercise: ' + address.number)
      return result.level
    },
  }
}

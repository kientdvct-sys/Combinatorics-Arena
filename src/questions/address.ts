import type { ModeId } from '../engine/catalog'
import type { Rank } from '../engine/core'
import { extraQuestionsPerRank, originalQuestionCount, questionCount, questionsPerRank, rankCount } from './settings.mjs'

export const questionModes = ['nim', 'circle', 'graph', 'domino', 'binary'] as const satisfies readonly ModeId[]
export { questionCount, questionsPerRank, extraQuestionsPerRank }
export const exercisesPerMode = rankCount * (questionsPerRank + extraQuestionsPerRank)

export interface QuestionAddress { number: number; mode: ModeId; rank: Rank; index: number }

export function questionAddress(number: number): QuestionAddress | undefined {
  if (!Number.isInteger(number) || number < 1 || number > questionCount) return
  const extra = number > originalQuestionCount
  const offset = number - 1 - (extra ? originalQuestionCount : 0)
  const perRank = extra ? extraQuestionsPerRank : questionsPerRank
  const perMode = rankCount * perRank
  return {
    number,
    mode: questionModes[Math.floor(offset / perMode)],
    rank: Math.floor((offset % perMode) / perRank) as Rank,
    index: offset % perRank + (extra ? questionsPerRank : 0),
  }
}

export const questionSeed = (number: number) => 'question-v1-' + number
export const questionCode = (number: number) => String(number).padStart(5, '0')

export function readQuestion(seed: string): QuestionAddress | undefined {
  const match = /^question-v1-([1-9]\d{0,4})$/.exec(seed)
  return match ? questionAddress(Number(match[1])) : undefined
}

export function questionFromKey(key: string): QuestionAddress | undefined {
  const [mode, rank, seed, extra] = key.split(':')
  if (!seed || extra !== undefined) return
  const question = readQuestion(seed)
  if (question?.mode === mode && String(question.rank) === rank) return question
}

export function questionLink({ number, mode, rank }: QuestionAddress) {
  return '#/play/' + mode + '/' + rank + '/' + questionSeed(number)
}

export function questionsLink(mode: ModeId, rank?: Rank) {
  return '#/questions/' + mode + (rank === undefined ? '' : '/' + rank)
}

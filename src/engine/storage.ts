import { modeById } from './catalog'
import type { ModeId } from './catalog'
import type { Rank } from './core'
import { questionAddress, questionFromKey } from '../questions/address'

export const storageKey = 'combinatorics-arena-v1'
export type Medal = 'gold' | 'silver' | 'bronze'
export interface Draft {
  actions: unknown[]
  cursor: number
  hints: number
  elapsed: number
  done: boolean
  updatedAt?: number
}
export interface Achievement {
  points: number
  medal: Medal
  bestMoves: number
  bestTime: number
  leastHints: number
  completions: number
}
export interface Progress {
  version: 1
  unlocked: Partial<Record<ModeId, Rank>>
  achievements: Record<string, Achievement>
  drafts: Record<string, Draft>
  bookmarks: number[]
  settings: { reducedMotion: boolean; practiceNim: boolean }
}
export const emptyProgress = (): Progress => ({
  version: 1,
  unlocked: {},
  achievements: {},
  drafts: {},
  bookmarks: [],
  settings: { reducedMotion: false, practiceNim: true },
})
export const validSeed = (seed: string) => seed.length > 0 && seed.length <= 48 && !/[\x00-\x1f\x7f]/.test(seed)
export const challengeKey = (mode: ModeId, rank: Rank, seed: string) => mode + ':' + rank + ':' + seed

export function outcome(rank: Rank, moves: number, elapsed: number, hints: number): Achievement {
  return {
    points: 1000 + 250 * rank - 150 * hints,
    medal: hints === 0 ? 'gold' : hints === 1 ? 'silver' : 'bronze',
    bestMoves: moves,
    bestTime: elapsed,
    leastHints: hints,
    completions: 1,
  }
}

export function withCompletion(progress: Progress, mode: ModeId, rank: Rank, seed: string, current: Achievement): Progress {
  const key = challengeKey(mode, rank, seed)
  const previous = progress.achievements[key]
  const best: Achievement = previous ? {
    points: Math.max(previous.points, current.points),
    medal: previous.leastHints <= current.leastHints ? previous.medal : current.medal,
    bestMoves: Math.min(previous.bestMoves, current.bestMoves),
    bestTime: Math.min(previous.bestTime, current.bestTime),
    leastHints: Math.min(previous.leastHints, current.leastHints),
    completions: previous.completions + 1,
  } : current
  const unlocked = questionFromKey(key) ? progress.unlocked : {
    ...progress.unlocked, [mode]: Math.max(progress.unlocked[mode] ?? 0, Math.min(rank + 1, 4)) as Rank,
  }
  return { ...progress, unlocked, achievements: { ...progress.achievements, [key]: best } }
}

export function withDraft(progress: Progress, key: string, draft: Draft): Progress {
  const drafts = { ...progress.drafts }
  const saved = { ...draft, updatedAt: Date.now() }
  if (draft.done && questionFromKey(key)) {
    delete drafts[key]
    drafts[key] = saved
    const completed = Object.keys(drafts).filter(entry => drafts[entry].done && questionFromKey(entry))
    for (const old of completed.slice(0, -24)) delete drafts[old]
  } else drafts[key] = saved
  return { ...progress, drafts }
}

export function latestUnfinished(progress: Progress) {
  let latest: { mode: NonNullable<ReturnType<typeof modeById>>; question: ReturnType<typeof questionFromKey>; href: string; updatedAt: number } | undefined
  for (const [key, draft] of Object.entries(progress.drafts)) {
    if (draft.done || draft.cursor < 1) continue
    const match = /^([a-z]+):([0-4]):(.+)$/u.exec(key)
    if (!match) continue
    const mode = modeById(match[1])
    const question = questionFromKey(key)
    if (!mode || !validSeed(match[3]) || (!question && Number(match[2]) > (progress.unlocked[mode.id] ?? 0))) continue
    const updatedAt = draft.updatedAt ?? 0
    if (!latest || updatedAt >= latest.updatedAt) latest = {
      mode, question, updatedAt, href: '#/play/' + mode.id + '/' + match[2] + '/' + encodeURIComponent(match[3]),
    }
  }
  return latest
}

export function withBookmark(progress: Progress, number: number): Progress {
  if (!questionAddress(number)) return progress
  const bookmarks = progress.bookmarks.includes(number)
    ? progress.bookmarks.filter(item => item !== number)
    : [...progress.bookmarks, number]
  return { ...progress, bookmarks }
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function integer(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max
}

function validKey(key: string) {
  const match = /^([a-z]+):([0-4]):(.+)$/u.exec(key)
  return Boolean(match && modeById(match[1]) && validSeed(match[3]))
}

function decodeDraft(value: unknown): Draft {
  if (!isRecord(value) || !Array.isArray(value.actions) || !integer(value.cursor, 0, value.actions.length) ||
    !integer(value.hints, 0, 3) || !integer(value.elapsed, 0, Number.MAX_SAFE_INTEGER) || typeof value.done !== 'boolean') {
    throw new Error('Một ván đang chơi có dữ liệu không hợp lệ.')
  }
  return {
    actions: value.actions, cursor: value.cursor, hints: value.hints, elapsed: value.elapsed, done: value.done,
    ...(integer(value.updatedAt, 0, Number.MAX_SAFE_INTEGER) ? { updatedAt: value.updatedAt } : {}),
  }
}

function decodeAchievement(value: unknown): Achievement {
  if (!isRecord(value) || !integer(value.points, 0, 2000) || !integer(value.bestMoves, 0, Number.MAX_SAFE_INTEGER) ||
    !integer(value.bestTime, 0, Number.MAX_SAFE_INTEGER) || !integer(value.leastHints, 0, 3) ||
    !integer(value.completions, 1, Number.MAX_SAFE_INTEGER) ||
    (value.medal !== 'gold' && value.medal !== 'silver' && value.medal !== 'bronze')) {
    throw new Error('Một thành tích có dữ liệu không hợp lệ.')
  }
  return {
    points: value.points, medal: value.medal, bestMoves: value.bestMoves, bestTime: value.bestTime,
    leastHints: value.leastHints, completions: value.completions,
  }
}

export function deserialize(raw: string): Progress {
  let value: unknown
  try { value = JSON.parse(raw) } catch { throw new Error('Tệp không phải là JSON hợp lệ.') }
  if (!isRecord(value) || value.version !== 1) throw new Error('Phiên bản dữ liệu không được hỗ trợ.')
  const { achievements, drafts, unlocked, settings } = value
  if (!isRecord(achievements) || !isRecord(drafts) || !isRecord(unlocked) || !isRecord(settings) ||
      typeof settings.reducedMotion !== 'boolean' || typeof settings.practiceNim !== 'boolean') throw new Error('Tệp thiếu thông tin tiến độ.')
  const progress = emptyProgress()
  if (value.bookmarks !== undefined && !Array.isArray(value.bookmarks)) throw new Error('Danh sách bài đã lưu không hợp lệ.')
  if (Array.isArray(value.bookmarks)) progress.bookmarks = [...new Set(value.bookmarks.filter(
    (item): item is number => typeof item === 'number' && Boolean(questionAddress(item)),
  ))]
  for (const [mode, rank] of Object.entries(unlocked)) {
    if (!modeById(mode) || !integer(rank, 0, 4)) throw new Error('Có cấp độ đã mở không hợp lệ.')
    progress.unlocked[mode as ModeId] = rank as Rank
  }
  for (const [key, entry] of Object.entries(achievements)) {
    if (!validKey(key)) throw new Error('Có mã thành tích không hợp lệ.')
    progress.achievements[key] = decodeAchievement(entry)
  }
  for (const [key, entry] of Object.entries(drafts)) {
    if (!validKey(key)) throw new Error('Có mã màn chơi không hợp lệ.')
    progress.drafts[key] = decodeDraft(entry)
  }
  progress.settings = { reducedMotion: settings.reducedMotion, practiceNim: settings.practiceNim }
  return progress
}

export const serialize = (progress: Progress) => JSON.stringify(progress, null, 2)

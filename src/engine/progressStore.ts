import { create } from 'zustand'
import { deserialize, emptyProgress, storageKey, withBookmark, withCompletion, withDraft } from './storage'
import type { Achievement, Draft, Progress } from './storage'
import type { ModeId } from './catalog'
import type { Rank } from './core'
import { readSession, writeSession } from './profiles'
import type { Profile } from './profiles'

export function progressKey(profile: Pick<Profile, 'id'> | null) {
  return profile ? storageKey + ':profile:' + profile.id : storageKey
}

function loadProgress(profile: Profile | null) {
  try {
    const raw = localStorage.getItem(progressKey(profile))
    return { progress: raw ? deserialize(raw) : emptyProgress(), error: '' }
  } catch {
    return { progress: emptyProgress(), error: 'Không đọc được tiến độ đã lưu trên trình duyệt.' }
  }
}

function initialize() {
  try {
    const profile = readSession(localStorage, sessionStorage)
    return { profile, ...loadProgress(profile) }
  } catch {
    return { profile: null, ...loadProgress(null) }
  }
}

function save(profile: Profile | null, progress: Progress) {
  try {
    localStorage.setItem(progressKey(profile), JSON.stringify(progress))
    return { progress, error: '' }
  } catch {
    return { progress, error: 'Không ghi được tiến độ trên thiết bị. Bạn có thể xuất JSON để giữ bản sao.' }
  }
}

interface Store {
  profile: Profile | null
  progress: Progress
  error: string
  activate: (profile: Profile | null, copyGuest?: boolean) => void
  saveDraft: (key: string, draft: Draft) => void
  finish: (mode: ModeId, rank: Rank, seed: string, key: string, draft: Draft, achievement: Achievement) => void
  settings: (patch: Partial<Progress['settings']>) => void
  toggleBookmark: (number: number) => void
  importProgress: (progress: Progress) => void
}

export const useProgress = create<Store>((set, get) => ({
  ...initialize(),
  activate: (profile, copyGuest) => {
    writeSession(sessionStorage, profile)
    const guest = get()
    const loaded = profile && copyGuest && !guest.profile
      ? save(profile, guest.progress)
      : loadProgress(profile)
    set({ profile, ...loaded })
  },
  saveDraft: (key, draft) => set(({ profile, progress }) => save(profile, withDraft(progress, key, draft))),
  finish: (mode, rank, seed, key, draft, achievement) => set(({ profile, progress }) =>
    save(profile, withDraft(withCompletion(progress, mode, rank, seed, achievement), key, draft))),
  settings: patch => set(({ profile, progress }) => save(profile, { ...progress, settings: { ...progress.settings, ...patch } })),
  toggleBookmark: number => set(({ profile, progress }) => save(profile, withBookmark(progress, number))),
  importProgress: progress => set(({ profile }) => save(profile, progress)),
}))

window.addEventListener('storage', ({ key }) => {
  const { profile } = useProgress.getState()
  if (key === progressKey(profile) || key === null) useProgress.setState(loadProgress(profile))
})

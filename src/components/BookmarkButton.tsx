import { Bookmark } from 'lucide-react'
import { useProgress } from '../engine/progressStore'
import { questionCode } from '../questions/address'

export function BookmarkButton({ number }: { number: number }) {
  const saved = useProgress(store => store.progress.bookmarks.includes(number))
  const toggleBookmark = useProgress(store => store.toggleBookmark)
  return <button type="button" className="icon-btn bookmark-button" aria-pressed={saved}
    aria-label={(saved ? 'Bỏ lưu bài #' : 'Lưu bài #') + questionCode(number)} onClick={() => toggleBookmark(number)}>
    <Bookmark size={17} fill={saved ? 'currentColor' : 'none'} />
  </button>
}

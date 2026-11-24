import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, BookOpen, Check, Shuffle } from 'lucide-react'
import { modeById, modes } from '../engine/catalog'
import type { ModeId } from '../engine/catalog'
import { range, ranks } from '../engine/core'
import type { Rank } from '../engine/core'
import { useProgress } from '../engine/progressStore'
import { challengeKey } from '../engine/storage'
import { questionAddress, questionCode, questionCount, questionLink, questionSeed } from '../questions/address'
import type { QuestionAddress } from '../questions/address'
import { questionPreview } from '../questions/library'
import { Pagination } from './Pagination'
import { BookmarkButton } from './BookmarkButton'
import { accentStyle } from './ui'

const allQuestions = range(questionCount).map(index => questionAddress(index + 1)!)
  .sort((a, b) => a.index - b.index || a.rank - b.rank || a.number - b.number)
const pageSize = 12
const formatCount = (count: number) => count.toLocaleString('vi-VN')
type CompletionFilter = 'all' | 'unsolved' | 'solved' | 'saved'

function QuestionCard({ question, completed }: { question: QuestionAddress; completed: boolean }) {
  const mode = modeById(question.mode)!
  const level = useMemo(() => questionPreview(question), [question])
  return <article className="question-card" style={accentStyle(mode.color)}>
    <a href={questionLink(question)} aria-label={'Mở bài ' + questionCode(question.number) + ' · ' + level.title}>
      <div className="question-card-top">
        <span className="mode-icon"><mode.icon size={22} strokeWidth={1.8} /></span>
        <span className="question-code">#{questionCode(question.number)}</span>
      </div>
      <p className="question-type">{mode.name} <span>·</span> {ranks[question.rank]}</p>
      <h2>{level.title}</h2>
      <p className="question-goal">{level.goal}</p>
      <div className="question-card-foot">
        {completed ? <span className="question-done"><Check size={15} /> Đã giải</span> : <span>{level.complexity}</span>}
        <span className="question-arrow"><ArrowRight size={17} /></span>
      </div>
    </a>
    <BookmarkButton number={question.number} />
  </article>
}

export function QuestionLibrary({ defaultMode, defaultRank, defaultCompletion = 'all' }: {
  defaultMode?: ModeId; defaultRank?: Rank; defaultCompletion?: CompletionFilter
}) {
  const achievements = useProgress(store => store.progress.achievements)
  const bookmarks = useProgress(store => store.progress.bookmarks)
  const saved = useMemo(() => new Set(bookmarks), [bookmarks])
  const [mode, setMode] = useState<ModeId | 'all'>(defaultMode ?? 'all')
  const [rank, setRank] = useState<Rank | 'all'>(defaultRank ?? 'all')
  const [completion, setCompletion] = useState<CompletionFilter>(defaultCompletion)
  const [page, setPage] = useState(0)
  const [query, setQuery] = useState('')
  const [feedback, setFeedback] = useState('')
  const solved = useMemo(() => new Set(allQuestions.filter(question =>
    achievements[challengeKey(question.mode, question.rank, questionSeed(question.number))]).map(question => question.number)), [achievements])
  const matches = useMemo(() => allQuestions.filter(question =>
    (mode === 'all' || mode === question.mode) && (rank === 'all' || rank === question.rank) &&
    (completion === 'all' || (completion === 'saved' ? saved.has(question.number) :
      (completion === 'solved') === solved.has(question.number)))), [mode, rank, completion, solved, saved])
  const pageCount = Math.max(1, Math.ceil(matches.length / pageSize))
  const activePage = Math.min(page, pageCount - 1)
  const start = activePage * pageSize

  function openNumber(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const match = /^#?(\d{1,5})$/.exec(query.trim())
    const address = match ? questionAddress(Number(match[1])) : undefined
    if (address) location.hash = questionLink(address).slice(1)
    else setFeedback('Nhập mã bài từ #00001 đến #' + questionCode(questionCount) + '.')
  }

  function selectPage(next: number) {
    setPage(next)
    document.getElementById('question-results')?.scrollIntoView({ block: 'start' })
  }

  function openRandom() {
    if (!matches.length) return
    const index = crypto.getRandomValues(new Uint32Array(1))[0] % matches.length
    location.hash = questionLink(matches[index]).slice(1)
  }

  return <section className="subpage question-library">
    <header className="library-banner">
      <div className="library-banner-copy">
        <p className="eyebrow"><BookOpen size={15} /> NGÂN HÀNG BÀI TẬP</p>
        <h1>{formatCount(questionCount)} bài toán.</h1>
        <p>Luyện tổ hợp qua năm đấu trường tương tác, từ tìm quy luật đến chứng minh tối ưu.</p>
        <button type="button" className="btn btn-primary" disabled={!matches.length} onClick={openRandom}><Shuffle size={17} /> Chơi bài ngẫu nhiên</button>
      </div>
      <div className="library-banner-progress">
        <strong>{formatCount(solved.size)}</strong>
        <span>Đã giải trong ngân hàng</span>
        <progress aria-label="Số bài đã giải" value={solved.size} max={questionCount} />
      </div>
    </header>
    <div className="panel library-controls">
      <div className="field"><label htmlFor="question-mode">Đấu trường</label><select id="question-mode" value={mode}
        onChange={event => { setMode(modeById(event.target.value)?.id ?? 'all'); setPage(0) }}>
        <option value="all">Tất cả</option>
        {modes.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}
      </select></div>
      <div className="field"><label htmlFor="question-rank">Cấp độ</label><select id="question-rank" value={rank}
        onChange={event => { setRank(event.target.value === 'all' ? 'all' : Number(event.target.value) as Rank); setPage(0) }}>
        <option value="all">Tất cả cấp độ</option>
        {ranks.map((name, index) => <option value={index} key={name}>{name}</option>)}
      </select></div>
      <div className="field"><label htmlFor="question-completion">Tiến độ</label><select id="question-completion" value={completion}
        onChange={event => { setCompletion(event.target.value as CompletionFilter); setPage(0) }}>
        <option value="all">Tất cả</option><option value="unsolved">Chưa giải</option><option value="solved">Đã giải</option><option value="saved">Đã lưu</option>
      </select></div>
      <form onSubmit={openNumber} className="question-lookup">
        <label className="field" htmlFor="question-number">Mở bài theo mã</label>
        <div>
          <input id="question-number" value={query} onChange={event => { setQuery(event.target.value); setFeedback('') }}
            placeholder="#00001" inputMode="numeric" maxLength={6} aria-invalid={Boolean(feedback)} />
          <button type="submit" className="btn btn-outline" aria-label="Mở mã bài"><ArrowRight size={18} /></button>
        </div>
        {feedback && <p role="alert">{feedback}</p>}
      </form>
    </div>
    <div className="library-results" id="question-results">
      <p role="status">{formatCount(matches.length)} bài phù hợp</p>
      <Pagination page={activePage} pageCount={pageCount} select={selectPage} />
    </div>
    {matches.length ? <div className="question-grid">
      {matches.slice(start, start + pageSize).map(question => <QuestionCard key={question.number} question={question} completed={solved.has(question.number)} />)}
    </div> : <div className="panel library-empty">Chưa có bài nào phù hợp với bộ lọc này.</div>}
    <div className="library-pagination-bottom">
      <Pagination page={activePage} pageCount={pageCount} select={selectPage} label="Phân trang cuối danh sách" />
    </div>
  </section>
}

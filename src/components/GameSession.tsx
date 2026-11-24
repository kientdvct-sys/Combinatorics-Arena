import { useCallback, useEffect, useRef, useState } from 'react'
import type { ComponentType, FormEvent } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, CircleHelp, Flag, Lightbulb, Redo2, RotateCcw, Sparkles, Trophy, Undo2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useProgress } from '../engine/progressStore'
import { campaignSeeds } from '../engine/campaign'
import { BookmarkButton } from './BookmarkButton'
import { questionAddress, questionCode, questionLink, questionsLink, readQuestion } from '../questions/address'
import { ranks, record, redo, start, undo } from '../engine/core'
import type { Challenge, Game, Rank, Result } from '../engine/core'
import type { ModeInfo } from '../engine/catalog'
import type { Lesson } from '../engine/lessons'
import { hintCost, scoreBreakdown } from '../engine/scoring'
import { challengeKey, outcome, validSeed } from '../engine/storage'
import { restore, toDraft } from '../engine/session'
import type { BoardProps } from './Boards'
import { accentStyle, Time } from './ui'
import { medalLabels } from './Progress'
import { LiveScore, PlayClock, PlayGuide, ScoreRows } from './PlayGuide'

interface PlayProps<S, A, L extends Challenge> {
  mode: ModeInfo
  game: Game<S, A, L>
  rank: Rank
  seed: string
  board: ComponentType<BoardProps<S, A, L>>
  parse: (input: unknown) => A | undefined
  lesson: (level: L) => Lesson
}

export function GameSession<S, A, L extends Challenge>({ mode, game, rank, seed, board: Board, parse, lesson }: PlayProps<S, A, L>) {
  const key = challengeKey(mode.id, rank, seed)
  const question = readQuestion(seed)
  const nextQuestion = question ? questionAddress(question.number + 1) : undefined
  const returnLink = question ? questionsLink(mode.id, rank) : '#/games/' + mode.id + '/' + rank
  const profileId = useProgress(store => store.profile?.id ?? null)
  const campaignIndex = campaignSeeds.findIndex(entry => entry === seed)
  const nextSeed = campaignIndex >= 0 ? campaignSeeds[campaignIndex + 1] : undefined
  const [level] = useState(() => game.generate(seed, rank))
  const [saved] = useState(() => useProgress.getState().progress.drafts[key])
  const [history, setHistory] = useState(() => restore(game, level, parse, saved))
  const [result, setResult] = useState<Result | null>(() => {
    if (!saved?.done) return null
    const checked = game.validate(level, history.current.state)
    return checked.status === 'won' ? checked : null
  })
  const [hintTier, setHintTier] = useState(saved?.hints ?? 0)
  const [hintText, setHintText] = useState(() => saved?.hints ? game.hint(level, history.current.state, saved.hints) : '')
  const [legacyScore, setLegacyScore] = useState(() => result?.status === 'won' && saved?.scoreVersion === undefined)
  const [seedInput, setSeedInput] = useState(seed)
  const [seedError, setSeedError] = useState('')
  const time = useRef({
    base: saved?.elapsed ?? 0,
    active: result?.status !== 'won' && (saved?.timingStarted ?? Boolean(saved?.elapsed || saved?.cursor)),
    started: null as number | null,
  })
  const practice = useProgress(store => store.progress.settings.practiceNim)
  const saveProgress = useProgress(store => store.finish)
  const saveDraft = useProgress(store => store.saveDraft)
  const hasWon = result?.status === 'won'
  const mayUndo = mode.id !== 'nim' || practice
  const state = history.current.state
  const moves = history.past.length
  const reward = outcome(rank, moves, time.current.base, hintTier)
  const completedScore = hasWon ? scoreBreakdown(rank, time.current.base, hintTier, !legacyScore) : null
  const resultPanel = useRef<HTMLDivElement>(null)
  const boardTitle = useRef<HTMLHeadingElement>(null)
  const showResult = useRef(false)

  useEffect(() => {
    if (hasWon && showResult.current) {
      resultPanel.current?.scrollIntoView({ block: 'nearest' })
      showResult.current = false
    }
  }, [hasWon])
  const readTime = useCallback(() => Math.floor(time.current.base +
    (time.current.started === null ? 0 : performance.now() - time.current.started)), [])

  function startTime() {
    time.current.active = true
    if (!document.hidden) time.current.started ??= performance.now()
  }

  function saveAttempt() {
    if (!hasWon) saveDraft(key, toDraft(history, readTime(), hintTier, result, time.current.active))
  }

  useEffect(() => {
    if (hasWon) return
    const persist = () => {
      if (time.current.active && (useProgress.getState().profile?.id ?? null) === profileId) {
        saveDraft(key, toDraft(history, readTime(), hintTier, result, true))
      }
    }
    const pause = () => {
      time.current.base = readTime()
      time.current.started = null
      persist()
    }
    const visibility = () => {
      if (document.hidden) pause()
      else if (time.current.active) time.current.started ??= performance.now()
    }
    if (time.current.active && !document.hidden) time.current.started ??= performance.now()
    const ticker = window.setInterval(persist, 10_000)
    window.addEventListener('pagehide', pause)
    window.addEventListener('pageshow', visibility)
    window.addEventListener('hashchange', persist)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      window.clearInterval(ticker)
      window.removeEventListener('pagehide', pause)
      window.removeEventListener('pageshow', visibility)
      window.removeEventListener('hashchange', persist)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [key, history, result, hintTier, saveDraft, profileId, hasWon, readTime])

  function apply(action: A) {
    if (hasWon) return false
    const next = game.apply(level, state, action)
    if (next === state) return false
    startTime()
    const nextHistory = record(history, { state: next, action })
    setHistory(nextHistory)
    setResult(null)
    saveDraft(key, toDraft(nextHistory, readTime(), hintTier, null, true))
    return true
  }

  function rewind(direction: 'undo' | 'redo') {
    const next = direction === 'undo' ? undo(history) : redo(history)
    if (hasWon || !mayUndo || next === history) return
    startTime()
    setHistory(next)
    setResult(null)
    saveDraft(key, toDraft(next, readTime(), hintTier, null, true))
  }

  function restart() {
    const next = start({ state: game.initial(level), action: null })
    time.current = { base: 0, active: false, started: null }
    setLegacyScore(false)
    setResult(null)
    setHistory(next)
    setHintText(hintTier ? game.hint(level, next.current.state, hintTier) : '')
    saveDraft(key, toDraft(next, 0, hintTier, null))
  }

  function requestHint() {
    if (hintTier >= 3 || hasWon) return
    startTime()
    const tier = hintTier + 1
    setHintTier(tier)
    setHintText(game.hint(level, state, tier))
    saveDraft(key, toDraft(history, readTime(), tier, result, true))
  }

  function validate() {
    if (hasWon) return
    startTime()
    const checked = game.validate(level, state)
    setResult(checked)
    const elapsed = readTime()
    if (checked.status === 'won') {
      showResult.current = true
      time.current = { base: elapsed, active: false, started: null }
      saveProgress(mode.id, rank, seed, key, toDraft(history, elapsed, hintTier, checked, true), outcome(rank, moves, elapsed, hintTier))
    } else {
      saveDraft(key, toDraft(history, elapsed, hintTier, checked, true))
    }
  }

  function changeSeed(next: string) {
    const clean = next.trim()
    if (!validSeed(clean)) {
      setSeedError('Nhập mã seed từ 1 đến 48 ký tự.')
      return
    }
    saveAttempt()
    setSeedError('')
    if (clean !== seed) window.location.hash = '/play/' + mode.id + '/' + rank + '/' + encodeURIComponent(clean)
  }

  function seedSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    changeSeed(seedInput)
  }

  const moveLabel = mode.id === 'nim' ? 'Lượt của bạn' : 'Thao tác'

  return <section className="subpage play-page" style={accentStyle(mode.color)}>
    <a className="back-link" href={returnLink}
      onClick={saveAttempt}><ArrowLeft size={16} /> {question ? 'Ngân hàng bài tập' : mode.name}</a>
    <div className="play-heading">
      <div className="play-identity">
        <span className="mode-icon"><mode.icon size={22} aria-hidden="true" /></span>
        <div><p className="mode-tag">{ranks[rank]} <span>·</span> {question ? 'Bài #' + questionCode(question.number) : campaignIndex < 0 ? mode.label : 'Bài ' + (campaignIndex + 1)}</p><h1>{level.title}</h1></div>
      </div>
      <div className="play-metrics">{question && <BookmarkButton number={question.number} />}<span><Flag size={15} /> {moveLabel} <b data-testid="move-count">{moves}</b></span><PlayClock read={readTime} rank={rank} hints={hintTier} finished={hasWon} /></div>
    </div>
    <div className="play-layout">
      <PlayGuide lesson={lesson(level)} onJumpToBoard={() => {
        boardTitle.current?.focus({ preventScroll: true })
        boardTitle.current?.scrollIntoView({ block: 'start' })
      }} />
      <section className="panel board-panel" aria-labelledby="play-board-title">
        <header className="board-header"><h2 id="play-board-title" ref={boardTitle} tabIndex={-1}>Bàn chơi</h2><span>{mode.name}</span></header>
        <Board level={level} state={state} dispatch={apply} disabled={hasWon} />
        <div className="board-toolbar">
          <button type="button" className="icon-btn" aria-label="Hoàn tác" title="Hoàn tác" onClick={() => rewind('undo')}
            disabled={hasWon || !mayUndo || !history.past.length}><Undo2 size={19} /></button>
          <button type="button" className="icon-btn" aria-label="Làm lại" title="Làm lại" onClick={() => rewind('redo')}
            disabled={hasWon || !mayUndo || !history.future.length}><Redo2 size={19} /></button>
          <button type="button" className="btn btn-quiet" onClick={restart}><RotateCcw size={17} /> Chơi lại</button>
          <button type="button" className="btn btn-primary validate-btn" onClick={validate} disabled={hasWon}><CheckCircle2 size={18} /> Kiểm tra</button>
        </div>
        {result && !hasWon && <div className="check-feedback" role="status"><CircleHelp size={20} /><p>{result.message}</p></div>}
      </section>
      <aside className="play-side">
        <div className="panel side-card hint-card"><h2><Lightbulb size={18} /> Gợi ý <small>{hintTier}/3</small></h2>
          {hintText && <p className="hint-text" aria-live="polite">{hintText}</p>}
          <button type="button" className="btn btn-outline" onClick={requestHint} disabled={hintTier >= 3 || hasWon}>
            {hintTier < 3 ? 'Mở gợi ý ' + (hintTier + 1) + ' · −' + hintCost + ' điểm' : 'Đã mở cả ba gợi ý'}
          </button>
        </div>
        {!hasWon && <LiveScore rank={rank} hints={hintTier} read={readTime} started={time.current.active} />}
        {!question && <details className="panel side-card seed-card"><summary><CircleHelp size={18} /> Seed của màn <code>{seed}</code></summary>
          <form className="seed-form" onSubmit={seedSubmit}>
            <label className="field">Nhập seed<input value={seedInput} maxLength={48} onChange={event => setSeedInput(event.target.value)} /></label>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn btn-outline">Dùng seed</button>
              <button type="button" className="btn btn-quiet" onClick={() => changeSeed(crypto.getRandomValues(new Uint32Array(1))[0].toString(36))}><Sparkles size={15} /> Seed mới</button>
            </div>
            {seedError && <span role="alert">{seedError}</span>}
          </form>
        </details>}
      </aside>
    </div>
    <AnimatePresence initial={false}>
      {result && completedScore && <motion.div ref={resultPanel} key={result.status} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className={'panel result-panel result-' + result.status} role="status" aria-live="polite">
        <>
          <div className="result-title"><Trophy size={27} /><div><p className="eyebrow">HOÀN THÀNH</p><h2>{result.message}</h2></div></div>
          <div className="result-rewards">
            <span className={'medal-' + reward.medal}>Huy chương {medalLabels[reward.medal].toLowerCase()}</span>
            <span data-testid="final-score">{completedScore.points.toLocaleString('vi-VN')} điểm</span><span>{moves} thao tác</span><Time elapsed={readTime()} />
          </div>
          <ScoreRows score={completedScore} />
          {legacyScore && <p>Kết quả này dùng luật tính điểm cũ. Luật trừ điểm theo thời gian áp dụng cho lượt chơi mới.</p>}
          <h3>{mode.math}</h3><p>{game.explain(level, state)}</p>
          {nextSeed && <a className="btn btn-outline" href={'#/play/' + mode.id + '/' + rank + '/' + encodeURIComponent(nextSeed)}>Bài tiếp theo <ArrowRight size={16} /></a>}
          {nextQuestion?.mode === question?.mode && nextQuestion && <a className="btn btn-primary" href={questionLink(nextQuestion)}>Bài tiếp theo <ArrowRight size={16} /></a>}
          {!question && rank < 4 && <a className="btn btn-primary" href={'#/play/' + mode.id + '/' + (rank + 1)}>Màn tiếp theo <ArrowRight size={16} /></a>}
          <a className="btn btn-outline" href="#/progress">Xem thành tích</a>
        </>
      </motion.div>}
    </AnimatePresence>
  </section>
}

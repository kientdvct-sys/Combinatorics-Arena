import { Component, useEffect, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { BookOpen, Compass, LibraryBig, Trophy, UserRound } from 'lucide-react'
import { MotionConfig } from 'motion/react'
import { binary } from './games/binary'
import { circle } from './games/circle'
import { domino } from './games/domino'
import { graph } from './games/graph'
import { nim } from './games/nim'
import { modeById } from './engine/catalog'
import type { ModeInfo } from './engine/catalog'
import type { Rank } from './engine/core'
import { useProgress } from './engine/progressStore'
import { numericAction } from './engine/session'
import { validSeed } from './engine/storage'
import { BinaryBoard, CircleBoard, DominoBoard, GraphBoard, NimBoard, parseCircle, parseDomino } from './components/Boards'
import { GameSession } from './components/GameSession'
import { Guide, Home, ModeGrid } from './components/Home'
import { LevelPicker } from './components/Levels'
import { Account } from './components/Account'
import { Administration } from './components/Administration'
import { ProgressPage } from './components/Progress'
import { Privacy } from './components/Privacy'
import { Brand, PageTitle } from './components/ui'
import { QuestionLibrary } from './components/QuestionLibrary'
import { readQuestion } from './questions/address'
import { withQuestionLibrary } from './questions/library'
import { candidates } from './questions/candidates'

const games = {
  nim: withQuestionLibrary('nim', nim, candidates.nim),
  circle: withQuestionLibrary('circle', circle, candidates.circle),
  graph: withQuestionLibrary('graph', graph, candidates.graph),
  domino: withQuestionLibrary('domino', domino, candidates.domino),
  binary: withQuestionLibrary('binary', binary, candidates.binary),
}
const routes = [
  { url: '/games', text: 'Đấu trường', icon: Compass },
  { url: '/questions', text: 'Bài tập', icon: LibraryBig },
  { url: '/guide', text: 'Hướng dẫn', icon: BookOpen },
  { url: '/progress', text: 'Thành tích', icon: Trophy },
]

function Play({ mode, rank, seed }: { mode: ModeInfo; rank: Rank; seed: string }) {
  const unlocked = useProgress(store => store.progress.unlocked[mode.id] ?? 0)
  if (rank > unlocked && !readQuestion(seed)) return <section className="subpage">
    <PageTitle title="Màn đang khóa" overline={mode.name}>Hoàn thành màn trước để mở cấp độ này.</PageTitle>
    <a className="btn btn-primary" href={'#/games/' + mode.id}>Xem các màn</a>
  </section>
  const common = { mode, rank, seed }
  switch (mode.id) {
    case 'nim': return <GameSession {...common} game={games.nim} board={NimBoard} parse={value => numericAction(value, ['pile', 'take'])} />
    case 'circle': return <GameSession {...common} game={games.circle} board={CircleBoard} parse={parseCircle} />
    case 'graph': return <GameSession {...common} game={games.graph} board={GraphBoard} parse={value => numericAction(value, ['vertex', 'color'])} />
    case 'domino': return <GameSession {...common} game={games.domino} board={DominoBoard} parse={parseDomino} />
    case 'binary': return <GameSession {...common} game={games.binary} board={BinaryBoard} parse={value => typeof value === 'number' ? value : undefined} />
  }
}

function usePath() {
  const [route, setRoute] = useState(() => location.hash.slice(1) || location.pathname)
  useEffect(() => {
    const change = () => {
      setRoute(location.hash.slice(1) || location.pathname)
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
    window.addEventListener('hashchange', change)
    return () => window.removeEventListener('hashchange', change)
  }, [])
  return route
}

function Content({ path }: { path: string }) {
  const [, page, id, tier, ...seedParts] = path.split('/')
  const mode = modeById(id)
  if (!page) return <Home />
  if (page === 'games' && !id) return <ModeGrid standalone />
  if (page === 'games' && mode && (!tier || /^[0-4]$/.test(tier))) {
    return <LevelPicker mode={mode} rank={Number(tier ?? 0) as Rank} generate={games[mode.id].generate} />
  }
  if (page === 'questions' && id === 'saved' && !tier) return <QuestionLibrary defaultCompletion="saved" />
  if (page === 'admin' && !id) return <Administration />
  if (page === 'questions' && (!id || mode) && (!tier || /^[0-4]$/.test(tier))) {
    return <QuestionLibrary defaultMode={mode?.id} defaultRank={tier ? Number(tier) as Rank : undefined} />
  }
  if (page === 'account') return <Account />
  if (page === 'guide') return <Guide />
  if (page === 'privacy') return <Privacy />
  if (page === 'progress') return <ProgressPage />
  if (page === 'play' && mode && /^[0-4]$/.test(tier ?? '')) {
    let seed = ''
    try { seed = seedParts.length ? decodeURIComponent(seedParts.join('/')) : 'arena' } catch { /* Unknown route. */ }
    const question = readQuestion(seed)
    const rank = Number(tier) as Rank
    if (validSeed(seed) && (!question || (question.mode === mode.id && question.rank === rank))) {
      return <Play key={mode.id + tier + seed} mode={mode} rank={rank} seed={seed} />
    }
  }
  return <section className="subpage"><PageTitle title="Không tìm thấy màn này" overline="COMBINATORICS ARENA" />
    <a className="btn btn-primary" href="#/games">Về đấu trường</a></section>
}

class RouteBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, details: ErrorInfo) { console.error(error, details.componentStack) }
  render() {
    if (this.state.failed) return <section className="subpage"><PageTitle title="Không thể mở màn này" overline="COMBINATORICS ARENA">Đã xảy ra lỗi khi tải dữ liệu của màn.</PageTitle><a className="btn btn-primary" href="#/games">Về đấu trường</a></section>
    return this.props.children
  }
}

export default function App() {
  const path = usePath()
  const reduced = useProgress(store => store.progress.settings.reducedMotion)
  const error = useProgress(store => store.error)
  const profile = useProgress(store => store.profile)
  return <MotionConfig reducedMotion={reduced ? 'always' : 'user'}>
    <div className={reduced ? 'site-shell reduce-motion' : 'site-shell'}>
      <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus() }}>Chuyển đến nội dung</a>
      <header className="site-header"><div className="site-width header-inner">
        <Brand />
        <nav aria-label="Điều hướng chính">{routes.map(route => {
          const [, page, , , seed] = path.split('/')
          const questionPlay = page === 'play' && Boolean(readQuestion(seed ?? ''))
          const active = path.startsWith(route.url) ||
            (route.url === '/questions' && questionPlay) ||
            (route.url === '/games' && (path === '/' || (page === 'play' && !questionPlay)))
          return <a href={'#' + route.url} key={route.url} className={active ? 'nav-active' : ''} aria-current={active ? 'page' : undefined} aria-label={route.text}>
            <route.icon size={16} /> <span className={route.url === '/games' ? 'nav-text-wide' : undefined}>{route.text}</span>
            {route.url === '/games' && <span className="nav-text-narrow" aria-hidden="true">Chơi</span>}
          </a>
        })}<a href="#/account" className={path === '/account' || path === '/admin' ? 'nav-account nav-active' : 'nav-account'}
          aria-current={path === '/account' ? 'page' : undefined} aria-label={profile ? 'Hồ sơ ' + profile.name : 'Tài khoản'}>
          <UserRound size={16} /><span>{profile?.name ?? 'Tài khoản'}</span>
        </a></nav>
      </div></header>
      <main className="site-width" id="main-content" tabIndex={-1}>
        {error && <p className="storage-error" role="alert">{error}</p>}
        <RouteBoundary key={path + '|' + (profile?.id ?? 'guest')}><Content path={path} /></RouteBoundary>
      </main>
      <footer className="site-footer"><div className="site-width footer-inner"><Brand small />
        <div className="footer-links"><a href="#/guide">Cẩm nang <BookOpen size={15} /></a>
          <a href="#/privacy">Dữ liệu và quyền riêng tư</a></div>
      </div></footer>
    </div>
  </MotionConfig>
}

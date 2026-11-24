import { ArrowLeft, ArrowRight, BookOpen, Check, LibraryBig, LockKeyhole } from 'lucide-react'
import { campaignSeeds } from '../engine/campaign'
import type { ModeInfo } from '../engine/catalog'
import { ranks } from '../engine/core'
import type { Rank } from '../engine/core'
import { describeLesson } from '../engine/lessons'
import type { ArenaLevel } from '../engine/lessons'
import { useProgress } from '../engine/progressStore'
import { challengeKey } from '../engine/storage'
import { accentStyle, PageTitle } from './ui'
import { questionsLink } from '../questions/address'

interface Props {
  mode: ModeInfo
  rank: Rank
  generate: (seed: string, rank: Rank) => ArenaLevel
}

export function LevelPicker({ mode, rank, generate }: Props) {
  const unlocked = useProgress(store => store.progress.unlocked[mode.id] ?? 0)
  const achievements = useProgress(store => store.progress.achievements)
  const drafts = useProgress(store => store.progress.drafts)
  const locked = rank > unlocked
  const completedCount = campaignSeeds.filter(seed => achievements[challengeKey(mode.id, rank, seed)]).length

  return <section className="subpage" style={accentStyle(mode.color)}>
    <a href="#/games" className="back-link"><ArrowLeft size={16} /> Tất cả đấu trường</a>
    <div className="mode-page-title"><span className="mode-icon"><mode.icon size={32} /></span>
      <PageTitle overline={mode.label} title={mode.name}>{mode.summary}</PageTitle>
      <a href={questionsLink(mode.id, rank)} className="btn btn-outline level-bank-link"><LibraryBig size={17} /> Bài luyện thêm</a>
    </div>
    <a className="text-link level-guide-link" href="#/guide"><BookOpen size={16} /> Đọc luật và xem ví dụ</a>
    <nav className="rank-tabs" aria-label="Cấp độ">
      {ranks.map((name, index) => <a key={name} className="rank-tab" aria-current={index === rank ? 'page' : undefined}
        href={'#/games/' + mode.id + '/' + index}>
        <span>{name}</span>{index > unlocked && <LockKeyhole size={13} aria-label="Đang khóa" />}
      </a>)}
    </nav>
    <div className="bank-heading">
      <div><h2>{ranks[rank]}</h2><p className="muted">
        {locked ? 'Hoàn thành một bài ở cấp trước để mở.' : rank === 4 ? 'Cấp cuối của chiến dịch.' : 'Hoàn thành một bài để mở cấp kế tiếp.'}
      </p></div>
      <span className="bank-count">{completedCount}/{campaignSeeds.length} đã giải</span>
    </div>
    <div className="level-list">
      {campaignSeeds.map((seed, index) => {
        const level = generate(seed, rank)
        const lesson = describeLesson(level)
        const key = challengeKey(mode.id, rank, seed)
        const completed = achievements[key]
        const resume = drafts[key]?.cursor > 0 && !drafts[key].done
        const href = '#/play/' + mode.id + '/' + rank + (index ? '/' + encodeURIComponent(seed) : '')
        const label = completed ? 'Chơi lại' : resume ? 'Tiếp tục' : 'Chơi'
        return <article className={'level-row' + (locked ? ' level-locked' : '')} key={seed}>
          <span className="rank-number">{String(index + 1).padStart(2, '0')}</span>
          <div><p className="mode-tag">Bài {index + 1}</p><h3>{level.title}</h3>
            <p>{lesson.task}</p><p className="level-focus">{lesson.setup}</p></div>
          {locked ? <span className="level-status"><LockKeyhole size={17} /> <span>Đang khóa</span></span> :
            <a className="btn btn-outline" aria-label={index ? label + ' bài ' + (index + 1) : label} href={href}>
              {completed && <Check size={16} />}{label} <ArrowRight size={16} /></a>}
        </article>
      })}
    </div>
  </section>
}

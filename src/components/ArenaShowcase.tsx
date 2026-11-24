import { useEffect, useState } from 'react'
import { ArrowRight, CalendarDays, Check, Sparkles } from 'lucide-react'
import { modeById } from '../engine/catalog'
import { useProgress } from '../engine/progressStore'
import { challengeKey } from '../engine/storage'
import { featureApi } from '../engine/featureApi'
import type { PublishedFeature } from '../engine/featureApi'
import { extraQuestionsPerRank, questionAddress, questionCode, questionLink, questionModes, questionSeed } from '../questions/address'
import { dailyQuestion } from '../questions/daily'
import { questionPreview } from '../questions/library'
import { originalQuestionCount, rankCount } from '../questions/settings.mjs'
import { accentStyle } from './ui'

const defaults = questionModes.map((modeId, index) => {
  const number = originalQuestionCount + index * rankCount * extraQuestionsPerRank + 1
  const address = questionAddress(number)!
  const level = questionPreview(address)
  return { id: modeId, question: number, title: level.title, note: level.goal, updatedAt: '' }
})

export function DailyChallenge() {
  const address = dailyQuestion()
  const mode = modeById(address.mode)!
  const completed = useProgress(store => Boolean(store.progress.achievements[
    challengeKey(address.mode, address.rank, questionSeed(address.number))
  ]))
  const level = questionPreview(address)
  return <article className="daily-challenge" style={accentStyle(mode.color)}>
    <span className="daily-emblem"><CalendarDays size={30} strokeWidth={1.65} /></span>
    <div className="daily-copy"><p className="eyebrow">THỬ THÁCH HÔM NAY</p>
      <h2>{level.title}</h2><p>{mode.name} · #{questionCode(address.number)}</p></div>
    <a className="btn btn-primary" href={questionLink(address)}>
      {completed ? <><Check size={16} /> Đã giải · Chơi lại</> : <>Chơi thử thách <ArrowRight size={16} /></>}
    </a>
  </article>
}

export function ArenaShowcase({ showDaily = true }: { showDaily?: boolean }) {
  const [published, setPublished] = useState<PublishedFeature[]>([])
  useEffect(() => {
    const controller = new AbortController()
    void featureApi<{ features: PublishedFeature[] }>('/api/arena/featured', 'GET', undefined, controller.signal)
      .then(result => { if (!controller.signal.aborted) setPublished(result.features) })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  const selections = published.length ? published.slice(0, 6) : defaults
  return <section className="arena-showcase">
    {showDaily && <DailyChallenge />}
    <div className="section-heading arena-feature-heading">
      <h2><Sparkles size={22} /> {published.length ? 'Bài nổi bật' : 'Bài mới theo đấu trường'}</h2>
      <a className="text-link" href="#/questions">Xem ngân hàng bài tập <ArrowRight size={16} /></a>
    </div>
    <div className="arena-feature-grid">
      {selections.map(feature => {
        const address = questionAddress(feature.question)
        if (!address) return null
        const mode = modeById(address.mode)!
        return <a className="arena-feature panel" href={questionLink(address)} key={feature.id} style={accentStyle(mode.color)}>
          <span className="mode-icon"><mode.icon size={22} strokeWidth={1.8} /></span>
          <div><small>{mode.name} · #{questionCode(feature.question)}</small>
            <h3>{feature.title}</h3>{feature.note && <p>{feature.note}</p>}</div>
          <ArrowRight size={16} className="feature-arrow" />
        </a>
      })}
    </div>
  </section>
}

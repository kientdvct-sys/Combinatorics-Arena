import { useEffect, useState } from 'react'
import { BookOpen, Target } from 'lucide-react'
import type { Rank } from '../engine/core'
import type { Lesson } from '../engine/lessons'
import { hintCost, scoreBreakdown, secondCost } from '../engine/scoring'
import { Time } from './ui'

export function PlayGuide({ lesson, onJumpToBoard }: { lesson: Lesson; onJumpToBoard: () => void }) {
  return <section className="panel play-guide" aria-labelledby="exercise-heading">
    <div className="exercise-problem">
      <div className="exercise-header">
        <h2 id="exercise-heading"><Target size={19} aria-hidden="true" /> Đề bài</h2>
        <button type="button" className="jump-to-board" onClick={onJumpToBoard}>Tới bàn chơi <span aria-hidden="true">↓</span></button>
      </div>
      <p>{lesson.setup}</p>
      <p className="exercise-task">{lesson.task}</p>
      <ul aria-label="Điều kiện của bài">{lesson.rules.map(rule => <li key={rule}>{rule}</li>)}</ul>
    </div>
    <details>
      <summary><BookOpen size={18} aria-hidden="true" /> Cách làm trên bàn và ví dụ</summary>
      <ol>{lesson.steps.map(step => <li key={step}>{step}</li>)}</ol>
      <p className="play-guide-example"><strong>Ví dụ nhỏ.</strong> {lesson.example}</p>
    </details>
  </section>
}

export function useDisplayedTime(read: () => number) {
  const [elapsed, setElapsed] = useState(read)
  useEffect(() => {
    const refresh = () => setElapsed(read())
    refresh()
    const interval = window.setInterval(refresh, 250)
    return () => window.clearInterval(interval)
  }, [read])
  return elapsed
}

export function PlayClock({ read, rank, hints, finished }: {
  read: () => number; rank: Rank; hints: number; finished: boolean
}) {
  const elapsed = useDisplayedTime(read)
  const score = scoreBreakdown(rank, elapsed, hints)
  return <>
    <Time elapsed={elapsed} />
    {!finished && <span className="play-current-score">Điểm <b data-testid="live-score">{score.points.toLocaleString('vi-VN')}</b></span>}
  </>
}

export function ScoreRows({ score }: { score: ReturnType<typeof scoreBreakdown> }) {
  return <dl className="score-rows">
    <div><dt>Điểm ban đầu</dt><dd>{score.base}</dd></div>
    <div><dt>Thời gian</dt><dd>−{score.timePenalty}</dd></div>
    <div><dt>Gợi ý</dt><dd>−{score.hintPenalty}</dd></div>
  </dl>
}

export function LiveScore({ rank, hints, read, started }: {
  rank: Rank; hints: number; read: () => number; started: boolean
}) {
  const score = scoreBreakdown(rank, useDisplayedTime(read), hints)
  return <details className="panel side-card score-card">
    <summary>Cách tính điểm</summary>
    <ScoreRows score={score} />
    <p>{started ? 'Đồng hồ tính thời gian khi tab bài đang hiển thị.'
      : 'Đồng hồ bắt đầu khi bạn thực hiện thao tác trên bài, mở gợi ý hoặc bấm Kiểm tra.'}</p>
    <p>Mỗi giây tròn trừ {secondCost} điểm. Mỗi gợi ý trừ {hintCost} điểm. Bấm Kiểm tra khi bài đúng để chốt điểm.</p>
    <p>Điểm thấp nhất là 0. Kiểm tra sai không trừ thêm điểm. Huy chương chỉ dựa trên số gợi ý đã mở.</p>
  </details>
}

import { useState } from 'react'
import { ArrowRight, Bookmark, CircleHelp, Gamepad2, Lightbulb, Play, RotateCcw, Trophy } from 'lucide-react'
import { binary } from '../games/binary'
import { latestUnfinished } from '../engine/storage'
import { useProgress } from '../engine/progressStore'
import { questionCode } from '../questions/address'
import { accentStyle } from './ui'

const demo = binary.generate('arena', 0)

export function BinaryPreview() {
  const [state, setState] = useState(() => binary.initial(demo))
  const done = binary.validate(demo, state).status === 'won'
  const lit = state.lights.filter(Boolean).length

  return <section className="live-preview" aria-labelledby="preview-title">
    <div className="preview-top">
      <span className="preview-kicker"><i /> CHƠI THỬ</span>
      <span className="preview-count">3 × 3</span>
    </div>
    <h2 id="preview-title">Binary Matrix</h2>
    <p className="preview-rule">Tắt hết đèn. Bấm một ô để đổi chính ô đó và các ô ngay trên, dưới, trái, phải.</p>
    <div className="preview-board" role="group" aria-label="Bàn đèn chơi thử">
      {state.lights.map((light, index) => <button key={index} type="button" aria-pressed={Boolean(light)}
        aria-label={'Đèn thử hàng ' + (Math.floor(index / 3) + 1) + ' cột ' + (index % 3 + 1)}
        className={light ? 'preview-cell lit' : 'preview-cell'} disabled={done}
        onClick={() => setState(current => binary.apply(demo, current, index))}>
        <Lightbulb size={22} strokeWidth={1.65} />
      </button>)}
    </div>
    <div className="preview-bottom">
      <span aria-live="polite">{done ? 'Đã tắt toàn bộ đèn.' : lit + ' đèn sáng · ' + state.moves + ' lượt'}</span>
      <button className="icon-btn preview-reset" type="button" aria-label="Đặt lại bàn thử"
        onClick={() => setState(binary.initial(demo))}><RotateCcw size={16} /></button>
    </div>
  </section>
}

export function PracticePanel() {
  const progress = useProgress(store => store.progress)
  const profile = useProgress(store => store.profile)
  const recent = latestUnfinished(progress)
  const completed = Object.keys(progress.achievements).length

  return <section className="practice-panel" aria-labelledby="practice-title">
    <div className="practice-head">
      <div><h2 id="practice-title">Góc luyện tập{profile ? ' của ' + profile.name : ''}</h2>
        <p className="muted">Ván đang chơi và các bài bạn muốn quay lại.</p></div>
      <a href="#/progress" className="text-link">Xem thành tích <ArrowRight size={16} /></a>
    </div>
    <div className="practice-cards">
      <article className="practice-card practice-resume panel" style={accentStyle(recent?.mode.color ?? '#9cebd6')}>
        <span className="mode-icon">{recent ? <recent.mode.icon size={22} /> : <Gamepad2 size={22} />}</span>
        <div><h3>{recent ? 'Tiếp tục luyện' : 'Bắt đầu ván đầu tiên'}</h3>
          <p>{recent ? recent.mode.name + (recent.question ? ' · #' + questionCode(recent.question.number) : '') : 'Chọn một đấu trường và giải theo nhịp của bạn.'}</p></div>
        <a className="btn btn-primary" href={recent?.href ?? '#/games'}><Play size={16} /> {recent ? 'Chơi tiếp' : 'Chọn chế độ'}</a>
      </article>
      <a className="practice-card panel" href="#/questions/saved">
        <span className="mode-icon"><Bookmark size={22} /></span>
        <div><h3>Bài đã lưu</h3><p>{progress.bookmarks.length.toLocaleString('vi-VN')} bài trong danh sách</p></div>
        <ArrowRight className="practice-arrow" size={18} />
      </a>
      <a className="practice-card panel" href="#/progress">
        <span className="mode-icon"><Trophy size={22} /></span>
        <div><h3>Tiến độ của bạn</h3><p>{completed.toLocaleString('vi-VN')} bài đã giải</p></div>
        <ArrowRight className="practice-arrow" size={18} />
      </a>
    </div>
  </section>
}

export function GetStarted() {
  return <section className="learning-banner panel">
    <CircleHelp size={25} />
    <div><h2>Lần đầu làm quen?</h2><p>Xem cách chơi, cách dùng gợi ý và ý tưởng toán học sau mỗi chế độ.</p></div>
    <a className="btn btn-outline" href="#/guide">Mở cẩm nang <ArrowRight size={16} /></a>
  </section>
}

import { ArrowRight, Bookmark, CircleHelp, LibraryBig, Swords } from 'lucide-react'
import { motion } from 'motion/react'
import { modes } from '../engine/catalog'
import { campaignLevelCount } from '../engine/campaign'
import { exercisesPerMode, questionCount, questionsLink } from '../questions/address'
import { ArenaShowcase, DailyChallenge } from './ArenaShowcase'
import { BinaryPreview, GetStarted, PracticePanel } from './LandingPractice'
import { accentStyle, PageTitle } from './ui'

export function ModeGrid({ standalone = false }: { standalone?: boolean }) {
  return <section className={'mode-section' + (standalone ? ' mode-standalone' : '')} id="modes">
    {standalone ? <div className="arena-intro">
      <PageTitle overline="COMBINATORICS ARENA" title="Chọn đấu trường">Chọn chiến dịch hoặc mở thẳng bài luyện của từng chế độ.</PageTitle>
      <a className="btn btn-outline" href="#/questions/saved"><Bookmark size={16} /> Bài đã lưu</a>
    </div> :
      <div className="section-heading"><div><p className="eyebrow"><span className="line-mark" /> CHẾ ĐỘ CHƠI</p><h2>Chọn đấu trường.</h2></div>
        <p className="muted">Năm thử thách. Năm cách tư duy.</p></div>}
    <div className="mode-grid">
      {modes.map(mode => <motion.article whileHover={{ y: -3 }} key={mode.id} className="mode-card arena-mode-card" style={accentStyle(mode.color)}>
        <a className="arena-mode-main" href={'#/games/' + mode.id}>
          <div className="mode-card-top"><span className="mode-icon"><mode.icon size={24} strokeWidth={1.7} /></span><ArrowRight size={18} className="mode-arrow" /></div>
          <p className="mode-tag">{mode.label}</p>
          <h3>{mode.name}</h3>
          <p className="mode-summary">{mode.summary}</p>
        </a>
        <a className="arena-mode-bank" href={questionsLink(mode.id)} aria-label={'Bài luyện cho ' + mode.name}>
          <LibraryBig size={16} /> {exercisesPerMode.toLocaleString('vi-VN')} bài luyện <ArrowRight size={15} />
        </a>
      </motion.article>)}
    </div>
    {standalone && <ArenaShowcase />}
  </section>
}

export function Home() {
  return <div className="product-home">
    <section className="product-hero" aria-labelledby="landing-title">
      <div className="product-copy">
        <p className="product-kicker"><span /> ĐẤU TRƯỜNG TOÁN HỌC</p>
        <h1 id="landing-title">Chơi một ván.<br /><em>Hiểu cách giải.</em></h1>
        <p className="product-description">Giải bài toán bằng cách đi nước cờ, tô màu đồ thị và thử chiến lược trực tiếp trên bàn chơi.</p>
        <div className="product-actions">
          <a href="#/games" className="btn btn-primary"><Swords size={18} /> Vào đấu trường <ArrowRight size={17} /></a>
          <a href="#/questions" className="btn btn-outline"><LibraryBig size={17} /> Ngân hàng bài tập</a>
        </div>
        <dl className="product-metrics">
          <div><dt>{(questionCount + campaignLevelCount).toLocaleString('vi-VN')}</dt><dd>Bài luyện và chiến dịch</dd></div>
          <div><dt>5</dt><dd>Đấu trường</dd></div>
          <div><dt>5</dt><dd>Cấp độ</dd></div>
        </dl>
      </div>
      <div className="product-visual"><BinaryPreview /></div>
    </section>
    <PracticePanel />
    <ModeGrid />
    <DailyChallenge />
    <ArenaShowcase showDaily={false} />
    <GetStarted />
  </div>
}

export function Guide() {
  return <section className="subpage">
    <PageTitle overline="CẨM NANG" title="Toán học sau bàn chơi.">Đọc luật, tìm bất biến và kiểm tra lập luận bằng thao tác trên bàn.</PageTitle>
    <div className="guide-grid">
      {modes.map(mode => <article key={mode.id} className="panel guide-card" style={accentStyle(mode.color)}>
        <span className="mode-icon"><mode.icon size={22} /></span><h2>{mode.name}</h2>
        <p className="muted">{mode.rule}</p><h3>{mode.math}</h3><p className="muted">{mode.note}</p>
        <a className="text-link" href={'#/games/' + mode.id}>Xem thử thách <ArrowRight size={15} /></a>
      </article>)}
      <article className="panel guide-card"><span className="mode-icon"><CircleHelp size={22} /></span>
        <h2>Gợi ý và huy chương</h2>
        <p className="muted">Mỗi màn có ba cấp gợi ý. Mỗi gợi ý trừ 150 điểm. Kết thúc với 0, 1, hoặc từ 2 gợi ý trở lên tương ứng với huy chương vàng, bạc, hoặc đồng.</p>
        <p className="muted">Hoàn thành một bài trong mỗi cấp để mở cấp kế tiếp trong cùng đấu trường. Mã seed tái tạo cùng một bàn chơi.</p>
      </article>
    </div>
  </section>
}

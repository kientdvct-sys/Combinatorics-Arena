import { ArrowRight, Bookmark, CircleHelp, LibraryBig, Swords } from 'lucide-react'
import { motion } from 'motion/react'
import { modes } from '../engine/catalog'
import { campaignLevelCount } from '../engine/campaign'
import { baseScore, hintCost, scoreBreakdown, secondCost } from '../engine/scoring'
import { exercisesPerMode, questionCount, questionsLink } from '../questions/address'
import { ArenaShowcase, DailyChallenge } from './ArenaShowcase'
import { ArenaArt } from './ArenaArt'
import { BinaryPreview, GetStarted, PracticePanel } from './LandingPractice'
import { accentStyle, PageTitle } from './ui'

export function ModeGrid({ standalone = false }: { standalone?: boolean }) {
  return <section className={'mode-section' + (standalone ? ' mode-standalone' : '')} id="modes">
    {standalone ? <div className="arena-intro">
      <PageTitle overline="COMBINATORICS ARENA" title="Chọn đấu trường">Chọn chiến dịch hoặc mở thẳng bài luyện của từng chế độ.</PageTitle>
      <a className="btn btn-outline" href="#/questions/saved"><Bookmark size={16} /> Bài đã lưu</a>
    </div> :
      <div className="section-heading"><h2>Chọn đấu trường</h2><a className="text-link" href="#/guide">Xem luật chơi <ArrowRight size={16} /></a></div>}
    <div className="mode-grid">
      {modes.map(mode => <motion.article whileHover={{ y: -3 }} key={mode.id} className="mode-card arena-mode-card" style={accentStyle(mode.color)}>
        <a className="arena-mode-main" href={'#/games/' + mode.id}>
          <div className="mode-card-top"><ArenaArt mode={mode.id} /><ArrowRight size={18} className="mode-arrow" /></div>
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
        <p className="product-kicker">Trò chơi suy luận</p>
        <h1 id="landing-title">Đấu trường<br /><em>tổ hợp</em></h1>
        <p className="product-description">Chọn ô, ghép quân, tắt đèn hoặc đấu với máy. Mỗi bài có đề rõ ràng và một bàn để bạn tự thử cách giải.</p>
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
    <ModeGrid />
    <PracticePanel />
    <DailyChallenge />
    <ArenaShowcase showDaily={false} />
    <GetStarted />
  </div>
}

export function Guide() {
  const example = scoreBreakdown(0, 42_000, 1)
  const examples = {
    nim: 'Hai đống đều có ba viên. Nếu máy lấy hai viên ở đống thứ nhất, lấy hai viên ở đống thứ hai để đưa hai đống về cùng kích thước. Lặp lại cách đáp này trong Nim thường.',
    circle: 'Trên vòng có 10 ô, 10 và 1 đứng liền nhau. Ô 10 và ô 2 cách nhau qua ô 1, kể cả khi ô 1 có dấu cấm.',
    graph: 'Ba chấm nối thành một tam giác cần ba màu. Chọn bất kỳ hai chấm nào trong ba chấm cũng thấy một đường nối.',
    domino: 'Nếu còn 8 ô A và 6 ô B, nhiều nhất ghép được 6 quân. Hai ô A phải còn thừa vì mỗi quân dùng một ô mỗi màu.',
    binary: 'Bấm góc trên trái làm ba đèn đổi trạng thái. Bấm lại góc đó thì cả ba đèn trở về như cũ.',
  }
  return <section className="subpage">
    <PageTitle overline="CẨM NANG" title="Học cách chơi từng đấu trường">Xem một ví dụ nhỏ trước, sau đó mở bài đầu để thử trên bàn.</PageTitle>
    <div className="guide-grid">
      {modes.map(mode => <article key={mode.id} className="panel guide-card" style={accentStyle(mode.color)}>
        <span className="mode-icon"><mode.icon size={22} /></span><h2>{mode.name}</h2>
        <p className="muted">{mode.rule}</p>
        <h3>Ví dụ</h3><p className="muted">{examples[mode.id]}</p>
        <details className="guide-theory"><summary>{mode.math}</summary><p className="muted">{mode.note}</p></details>
        <a className="text-link" href={'#/play/' + mode.id + '/0'}>Thử bài đầu <ArrowRight size={15} /></a>
      </article>)}
      <article className="panel guide-card"><span className="mode-icon"><CircleHelp size={22} /></span>
        <h2>Điểm và huy chương</h2>
        <p className="muted">Bài đầu có {baseScore(0).toLocaleString('vi-VN')} điểm ban đầu. Mỗi cấp tăng 250 điểm. Mỗi giây tròn trừ {secondCost} điểm, mỗi gợi ý trừ {hintCost} điểm. Điểm thấp nhất là 0.</p>
        <p className="muted">Ví dụ, hoàn thành bài đầu trong {example.seconds} giây và mở một gợi ý thì được {example.base} − {example.timePenalty} − {example.hintPenalty} = {example.points} điểm.</p>
        <p className="muted">0 gợi ý nhận Vàng, 1 nhận Bạc, 2 hoặc 3 nhận Đồng. Chơi lại đưa đồng hồ về 0 và giữ số gợi ý đã mở ở bài đó.</p>
      </article>
    </div>
  </section>
}

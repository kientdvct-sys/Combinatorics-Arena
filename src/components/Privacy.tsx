import { Database, LockKeyhole, ShieldCheck } from 'lucide-react'
import { PageTitle } from './ui'

export function Privacy() {
  return <section className="subpage privacy-page">
    <PageTitle overline="COMBINATORICS ARENA" title="Dữ liệu và quyền riêng tư">
      Nơi lưu tiến độ, hồ sơ người chơi và dữ liệu quản trị.
    </PageTitle>
    <div className="privacy-grid">
      <article className="panel privacy-card"><span className="mode-icon"><Database size={21} /></span>
        <h2>Tiến độ trên trình duyệt</h2>
        <p>Ván đang chơi, bài đã lưu và thành tích nằm trong trình duyệt hiện tại. Bạn có thể xuất bản sao JSON ở mục Thành tích và nhập lại khi đổi thiết bị hoặc địa chỉ website.</p>
        <a className="text-link" href="#/progress">Mở mục Thành tích</a>
      </article>
      <article className="panel privacy-card"><span className="mode-icon"><LockKeyhole size={21} /></span>
        <h2>Hồ sơ người chơi</h2>
        <p>Mỗi hồ sơ tách tiến độ trên cùng trình duyệt. Phiên người chơi thuộc tab đang mở. Xóa dữ liệu website trong trình duyệt sẽ xóa các bản lưu trên thiết bị đó.</p>
        <a className="text-link" href="#/account">Quản lý hồ sơ</a>
      </article>
      <article className="panel privacy-card"><span className="mode-icon"><ShieldCheck size={21} /></span>
        <h2>Quản trị nội dung</h2>
        <p>Máy chủ lưu bài do quản trị viên biên tập và nhật ký chỉnh sửa. Trên Vercel, phiên quản trị dùng cookie bảo mật. Trang công khai chỉ nhận các bài đã đến thời điểm xuất bản.</p>
      </article>
    </div>
  </section>
}

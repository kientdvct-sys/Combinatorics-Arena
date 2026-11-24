import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowUpRight, CalendarClock, CheckCircle2, FileText, KeyRound, LogOut, Pencil, Plus, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react'
import { FeatureApiError, featureApi } from '../engine/featureApi'
import type { AdminSession, Editorial, FeatureDraft, ManagedFeature } from '../engine/featureApi'
import { questionAddress, questionCode, questionCount, questionLink } from '../questions/address'
import { Pagination } from './Pagination'
import { PageTitle } from './ui'

const blank: FeatureDraft = { question: 0, title: '', note: '', status: 'draft', priority: 0, publishAt: null }
const emptyEditorial: Editorial = { features: [], activity: [] }
const timeLabel = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
const actionLabels = { created: 'Đã thêm', updated: 'Đã cập nhật', removed: 'Đã gỡ' }
const scheduled = (item: Pick<FeatureDraft, 'status' | 'publishAt'>) =>
  item.status === 'published' && Boolean(item.publishAt && Date.parse(item.publishAt) > Date.now())

function localInput(iso: string | null) {
  if (!iso) return ''
  const time = new Date(iso)
  return new Date(time.getTime() - time.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}
const featuresPath = '/api/admin/featured'
const sessionPath = '/api/admin/session'
const onLoopback = ['localhost', '127.0.0.1'].includes(location.hostname)
const featureUrl = (id: string) => featuresPath + '?id=' + encodeURIComponent(id)

export function Administration() {
  const [session, setSession] = useState<AdminSession | null>(null)
  const [availability, setAvailability] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const [editorial, setEditorial] = useState<Editorial>(emptyEditorial)
  const { features, activity } = editorial
  const [draft, setDraft] = useState<FeatureDraft>(blank)
  const [editing, setEditing] = useState<Pick<ManagedFeature, 'id' | 'revision'> | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [page, setPage] = useState(0)
  const pageSize = 12
  const pageCount = Math.max(1, Math.ceil(features.length / pageSize))
  const activePage = Math.min(page, pageCount - 1)
  const scheduledCount = features.filter(scheduled).length
  const published = features.filter(feature => feature.status === 'published').length - scheduledCount

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const current = await featureApi<AdminSession>(sessionPath, 'GET', undefined, controller.signal)
        if (current.email) {
          const result = await featureApi<Editorial>(featuresPath, 'GET', undefined, controller.signal)
          if (!controller.signal.aborted) setEditorial(result)
        }
        if (!controller.signal.aborted) {
          setSession(current)
          setAvailability('ready')
        }
      } catch {
        if (!controller.signal.aborted) setAvailability('unavailable')
      }
    }
    void load()
    return () => controller.abort()
  }, [])

  function clearDraft() {
    setDraft(blank)
    setEditing(null)
    setConfirmDelete(null)
  }

  async function operate(action: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try { await action() }
    catch (failure) {
      if (session?.email && failure instanceof FeatureApiError && failure.status === 401) {
        setSession(current => current ? { ...current, email: null } : null)
        setEditorial(emptyEditorial)
        clearDraft()
      }
      setError(failure instanceof Error ? failure.message : 'Không xử lý được yêu cầu.')
    } finally { setBusy(false) }
  }

  function logIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void operate(async () => {
      const loginPassword = password
      setPassword('')
      const current = await featureApi<{ email: string }>('/api/admin/login', 'POST', { email, password: loginPassword })
      const result = await featureApi<Editorial>(featuresPath)
      setEditorial(result)
      setSession(session => ({ ...session, initialized: true, email: current.email }))
    })
  }

  function signOut() {
    void operate(async () => {
      await featureApi('/api/admin/logout', 'POST')
      setEditorial(emptyEditorial)
      clearDraft()
      setSession(current => current ? { ...current, email: null } : null)
    })
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void operate(async () => {
      const result = await featureApi<Editorial>(editing ? featureUrl(editing.id) : featuresPath,
        editing ? 'PUT' : 'POST', draft, undefined, editing?.revision)
      setEditorial(result)
      setPage(0)
      clearDraft()
      setNotice(scheduled(draft) ? 'Đã lên lịch công khai bài.' : draft.status === 'published'
        ? 'Bài đã xuất hiện ở trang Chọn đấu trường.' : 'Đã lưu bản nháp.')
    })
  }

  function remove(feature: ManagedFeature) {
    void operate(async () => {
      const result = await featureApi<Editorial>(featureUrl(feature.id), 'DELETE', undefined, undefined, feature.revision)
      setEditorial(result)
      if (editing?.id === feature.id) clearDraft()
      setConfirmDelete(null)
      setNotice('Đã gỡ bài khỏi khu vực nổi bật.')
    })
  }

  function refresh() {
    void operate(async () => {
      setEditorial(await featureApi<Editorial>(featuresPath))
      setNotice('Đã tải danh sách mới nhất.')
    })
  }

  return <section className="subpage admin-page">
    <PageTitle overline="COMBINATORICS ARENA" title="Quản trị nội dung">Chọn bài để giới thiệu ngay trên trang Chọn đấu trường.</PageTitle>
    {availability === 'loading' && <p role="status">Đang kết nối máy chủ quản trị…</p>}
    {availability === 'unavailable' && <div className="panel account-panel admin-help">
      <KeyRound size={24} /><h2>Chưa kết nối được máy chủ quản trị</h2>
      {onLoopback ? <p>Mở PowerShell trong thư mục dự án rồi chạy <code>npm start</code>.</p> :
        <p>Mở địa chỉ Production của dự án trên Vercel. Xem phần thiết lập quản trị trong README nếu API vẫn chưa phản hồi.</p>}
      <button type="button" className="btn btn-outline" onClick={() => location.reload()}>Thử lại</button>
    </div>}
    {availability === 'ready' && !session?.email && <div className="panel account-panel admin-help">
      <ShieldCheck size={24} /><h2>Đăng nhập quản trị</h2>
      {session?.initialized ? <form onSubmit={logIn} className="account-form">
        <label className="field">Email quản trị<input type="email" autoComplete="username" value={email}
          onChange={event => setEmail(event.target.value)} maxLength={254} required /></label>
        <label className="field">Mật khẩu quản trị<input type="password" autoComplete="current-password" value={password}
          onChange={event => setPassword(event.target.value)} maxLength={128} required /></label>
        {error && <p role="alert" className="account-error">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}><KeyRound size={17} /> Đăng nhập quản trị</button>
      </form> : <>
        {session?.hosting === 'vercel' ? <p>Chủ dự án cần đặt biến quản trị và kết nối Redis trong Vercel Production, sau đó redeploy theo README.</p> :
          <p>Chạy <code>npm run admin:setup</code> trong PowerShell để tạo tài khoản, sau đó tải lại trang này.</p>}
        <button type="button" className="btn btn-outline" onClick={() => location.reload()}>Tải lại</button>
      </>}
    </div>}
    {session?.email && <>
      <div className="panel admin-account">
        <span className="mode-icon"><ShieldCheck size={21} /></span>
        <div><strong>Quản trị viên</strong><small>{session.email}</small></div>
        <button type="button" className="btn btn-outline" disabled={busy} onClick={signOut}><LogOut size={16} /> Đăng xuất</button>
      </div>
      <div className="admin-stats">
        <div className="panel"><FileText size={19} /><b>{features.length}</b><span>Bài nổi bật</span></div>
        <div className="panel"><CheckCircle2 size={19} /><b>{published}</b><span>Đã công khai</span></div>
        <div className="panel"><CalendarClock size={19} /><b>{scheduledCount}</b><span>Đã lên lịch</span></div>
        <div className="panel"><Pencil size={19} /><b>{features.length - published - scheduledCount}</b><span>Bản nháp</span></div>
      </div>
      <div className="admin-workspace">
        <section className="panel account-panel admin-editor" id="feature-editor">
          <h2>{editing ? 'Chỉnh sửa bài nổi bật' : 'Thêm bài nổi bật'}</h2>
          <form onSubmit={save} className="account-form">
            <label className="field">Mã bài<input type="number" min={1} max={questionCount} step={1} required
              value={draft.question || ''} onChange={event => setDraft({ ...draft, question: Number(event.target.value) })} /></label>
            <label className="field">Tiêu đề<input required maxLength={80} value={draft.title}
              onChange={event => setDraft({ ...draft, title: event.target.value })} /></label>
            <label className="field">Lời giới thiệu<textarea rows={3} maxLength={240} value={draft.note}
              onChange={event => setDraft({ ...draft, note: event.target.value })}/></label>
            <div className="admin-field field"><label htmlFor="feature-status">Trạng thái</label>
              <select id="feature-status" value={draft.status} onChange={event =>
                setDraft({ ...draft, status: event.target.value === 'published' ? 'published' : 'draft' })}>
                <option value="draft">Bản nháp</option><option value="published">Công khai</option>
              </select>
            </div>
            <label className="field">Công khai lúc<input type="datetime-local" value={localInput(draft.publishAt)}
              onChange={event => {
                const date = new Date(event.currentTarget.value)
                setDraft(current => ({ ...current, publishAt: Number.isFinite(date.getTime()) ? date.toISOString() : null }))
              }} /></label>
            <label className="field">Độ ưu tiên<input type="number" min={0} max={100} step={1} value={draft.priority}
              onChange={event => setDraft({ ...draft, priority: Number(event.target.value) })} required /></label>
            <p className="muted editor-guidance">Bài công khai xuất hiện đúng giờ đã chọn. Độ ưu tiên cao hơn được xếp trước.</p>
            <div className="account-actions"><button className="btn btn-primary" type="submit" disabled={busy}><Plus size={16} /> Lưu bài nổi bật</button>
              {editing && <button className="btn btn-quiet" type="button" disabled={busy} onClick={clearDraft}>Hủy sửa</button>}</div>
            {notice && <p role="status" className="admin-notice">{notice}</p>}
            {error && <p role="alert" className="account-error">{error}</p>}
          </form>
        </section>
        <section className="panel account-panel admin-list">
          <div className="editorial-heading"><h2>Danh sách bài nổi bật</h2>
            <button type="button" className="icon-btn" aria-label="Tải lại danh sách" disabled={busy} onClick={refresh}><RefreshCw size={16} /></button></div>
          {features.length === 0 && <p className="muted">Chưa có bài do quản trị viên thêm.</p>}
          {features.slice(activePage * pageSize, (activePage + 1) * pageSize).map(feature => {
            const address = questionAddress(feature.question)
            return <article className="admin-feature" key={feature.id}>
              <div><p className="admin-feature-tag">#{questionCode(feature.question)} · {scheduled(feature) ? 'Đã lên lịch ' + timeLabel.format(new Date(feature.publishAt!)) : feature.status === 'published' ? 'Công khai' : 'Bản nháp'}</p>
                <h3>{feature.title}</h3>{feature.note && <p className="muted">{feature.note}</p>}</div>
              <div className="admin-feature-actions">
                {address && <a href={questionLink(address)} className="icon-btn" aria-label={'Mở bài ' + feature.title}><ArrowUpRight size={16} /></a>}
                <button type="button" className="icon-btn" disabled={busy} aria-label={'Sửa ' + feature.title} onClick={() => {
                  setEditing({ id: feature.id, revision: feature.revision })
                  setDraft({
                    question: feature.question, title: feature.title, note: feature.note, status: feature.status,
                    priority: feature.priority, publishAt: feature.publishAt,
                  })
                  setConfirmDelete(null); setError(''); setNotice('')
                  document.getElementById('feature-editor')?.scrollIntoView({ block: 'nearest' })
                }}><Pencil size={16} /></button>
                <button type="button" className="icon-btn" disabled={busy} aria-label={'Gỡ ' + feature.title}
                  onClick={() => setConfirmDelete(feature.id)}><Trash2 size={16} /></button>
              </div>
              {confirmDelete === feature.id && <div className="admin-delete">
                <p>Gỡ bài khỏi khu vực nổi bật?</p>
                <button type="button" className="btn btn-outline" disabled={busy} onClick={() => remove(feature)}>Xác nhận gỡ</button>
                <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => setConfirmDelete(null)}>Hủy</button>
              </div>}
            </article>
          })}
          <Pagination page={activePage} pageCount={pageCount} select={setPage} />
        </section>
      </div>
      <section className="panel account-panel editorial-history" aria-labelledby="activity-title">
        <h2 id="activity-title">Nhật ký chỉnh sửa</h2>
        {activity.length ? <ol>{activity.slice(0, 12).map(entry => <li key={entry.id}>
          <span>{actionLabels[entry.action]} <strong>{entry.title}</strong> <small>#{questionCode(entry.question)}</small></span>
          <time dateTime={entry.at}>{timeLabel.format(new Date(entry.at))}</time>
        </li>)}</ol> : <p className="muted">Nhật ký bắt đầu từ lần lưu tiếp theo.</p>}
      </section>
    </>}
  </section>
}

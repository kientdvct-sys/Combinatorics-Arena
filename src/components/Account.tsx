import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, LogIn, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { useProgress } from '../engine/progressStore'
import { registerProfile, signIn } from '../engine/profiles'
import { PageTitle } from './ui'

export function Account() {
  const profile = useProgress(store => store.profile)
  const activate = useProgress(store => store.activate)
  const hasGuestData = useProgress(store => !store.profile &&
    (Object.keys(store.progress.drafts).length > 0 || Object.keys(store.progress.achievements).length > 0))
  const [registering, setRegistering] = useState(false)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [copyGuest, setCopyGuest] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const current = registering
        ? await registerProfile(localStorage, name, password)
        : await signIn(localStorage, name, password)
      activate(current, registering && hasGuestData && copyGuest)
      setPassword('')
      location.hash = '/games'
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Không lưu được hồ sơ.')
    } finally {
      setBusy(false)
    }
  }

  function signOut() {
    try {
      activate(null)
      setName('')
      setRegistering(false)
    } catch {
      setError('Không thể cập nhật phiên đăng nhập trên trình duyệt này.')
    }
  }

  return <section className="subpage account-page">
    <PageTitle overline="HỒ SƠ NGƯỜI CHƠI" title="Tài khoản.">Mỗi hồ sơ lưu ván chơi và thành tích riêng trong trình duyệt này.</PageTitle>
    {profile ? <section className="panel account-panel">
      <div className="account-summary"><span className="mode-icon"><UserRound size={24} /></span>
        <div><p className="eyebrow">ĐANG ĐĂNG NHẬP</p><h2>{profile.name}</h2></div></div>
      <div className="account-actions">
        <a className="btn btn-primary" href="#/progress">Xem thành tích <ArrowRight size={17} /></a>
        <button type="button" className="btn btn-outline" onClick={signOut}><LogOut size={16} /> Đăng xuất</button>
      </div>
      {error && <p className="account-error" role="alert">{error}</p>}
    </section> : <div className="account-grid">
      <section className="panel account-panel">
        <div className="account-tabs" role="group" aria-label="Thao tác tài khoản">
          <button type="button" className="btn btn-quiet" disabled={busy} aria-pressed={!registering}
            onClick={() => { setRegistering(false); setError(''); setPassword('') }}>Đăng nhập</button>
          <button type="button" className="btn btn-quiet" disabled={busy} aria-pressed={registering}
            onClick={() => { setRegistering(true); setError(''); setPassword('') }}>Tạo hồ sơ</button>
        </div>
        <form onSubmit={event => void submit(event)} className="account-form">
          <label className="field">Tên hồ sơ<input required maxLength={48} autoComplete="username" disabled={busy}
            value={name} onChange={event => setName(event.target.value)} /></label>
          <label className="field">Mật khẩu<input required type="password" autoComplete={registering ? 'new-password' : 'current-password'}
            disabled={busy} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} /></label>
          {registering && <p className="muted account-note">Dùng mật khẩu riêng cho hồ sơ, tối thiểu 8 ký tự.</p>}
          {registering && hasGuestData && <label className="setting">
            <input type="checkbox" disabled={busy} checked={copyGuest} onChange={event => setCopyGuest(event.target.checked)} />
            Sao chép tiến độ khách vào hồ sơ mới
          </label>}
          {error && <p className="account-error" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={busy}><LogIn size={16} />
            {busy ? 'Đang xử lý…' : registering ? 'Tạo và đăng nhập' : 'Đăng nhập vào game'}
          </button>
        </form>
      </section>
      <aside className="panel account-panel account-info">
        <ShieldCheck size={24} /><h2>Hồ sơ trên thiết bị</h2>
        <p>Phiên đăng nhập giữ khi tải lại trang trong cùng tab. Tiến độ tiếp tục được lưu sau khi đăng xuất.</p>
        <p>Bạn vẫn có thể chơi bằng hồ sơ khách và xuất tiến độ JSON trong Thành tích.</p>
        <a href="#/games" className="text-link">Tiếp tục chơi với tư cách khách <ArrowRight size={15} /></a>
      </aside>
    </div>}
    <a className="panel account-admin-link" href="#/admin">
      <span className="mode-icon"><ShieldCheck size={22} /></span>
      <span><strong>Quản trị nội dung</strong><small>Đăng nhập để quản lý bài nổi bật trên trang Đấu trường.</small></span>
      <ArrowRight size={18} />
    </a>
  </section>
}

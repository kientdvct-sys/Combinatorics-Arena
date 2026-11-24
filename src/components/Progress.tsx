import { useRef, useState } from 'react'
import { Award, Download, Medal as MedalIcon, Trophy, Upload } from 'lucide-react'
import { modeById } from '../engine/catalog'
import { ranks } from '../engine/core'
import { campaignSeeds } from '../engine/campaign'
import { questionCode, questionFromKey } from '../questions/address'
import { Pagination } from './Pagination'
import { useProgress } from '../engine/progressStore'
import { deserialize, serialize } from '../engine/storage'
import type { Medal, Progress } from '../engine/storage'
import { formatTime, PageTitle } from './ui'

export const medalLabels: Record<Medal, string> = { gold: 'Vàng', silver: 'Bạc', bronze: 'Đồng' }

function exportFile(progress: Progress) {
  const url = URL.createObjectURL(new Blob([serialize(progress)], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'combinatorics-arena-progress.json'
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function ProgressPage() {
  const progress = useProgress(store => store.progress)
  const profile = useProgress(store => store.profile)
  const saveSettings = useProgress(store => store.settings)
  const importProgress = useProgress(store => store.importProgress)
  const file = useRef<HTMLInputElement>(null)
  const [notice, setNotice] = useState('')
  const [page, setPage] = useState(0)
  const [candidate, setCandidate] = useState<Progress>()
  const entries = Object.entries(progress.achievements)
  const pageSize = 20
  const pageCount = Math.max(1, Math.ceil(entries.length / pageSize))
  const activePage = Math.min(page, pageCount - 1)
  const visible = [...entries].reverse().slice(activePage * pageSize, (activePage + 1) * pageSize)
  const points = entries.reduce((sum, [, entry]) => sum + entry.points, 0)
  const gold = entries.filter(([, entry]) => entry.medal === 'gold').length

  async function readFile(selected?: File) {
    if (!selected) return
    setCandidate(undefined)
    setNotice('')
    try {
      if (selected.size > 5_000_000) throw new Error('Tệp tiến độ quá lớn (tối đa 5 MB).')
      setCandidate(deserialize(await selected.text()))
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Không đọc được tệp.')
    }
    if (file.current) file.current.value = ''
  }

  return <section className="subpage">
    <PageTitle overline="HỒ SƠ NGƯỜI CHƠI" title="Thành tích.">{profile ? 'Kỷ lục của ' + profile.name + '.' : 'Kỷ lục của hồ sơ khách trên trình duyệt này.'}</PageTitle>
    <div className="progress-stats">
      <div className="panel progress-stat"><Trophy size={23} /><strong>{entries.length}</strong><span>Màn đã hoàn thành</span></div>
      <div className="panel progress-stat"><Award size={23} /><strong>{points.toLocaleString('vi-VN')}</strong><span>Tổng điểm cao nhất</span></div>
      <div className="panel progress-stat"><MedalIcon size={23} /><strong>{gold}</strong><span>Huy chương vàng</span></div>
    </div>
    <div className="panel progress-panel"><h2>Kỷ lục</h2>
      {entries.length === 0 ? <p className="muted">Hoàn thành màn đầu tiên để ghi thành tích.</p> :
        <div className="table-wrap"><table><thead><tr><th>Màn</th><th>Huy chương</th><th>Bước</th><th>Thời gian</th><th>Gợi ý</th><th>Điểm</th></tr></thead>
          <tbody>{visible.map(([key, info]) => {
            const [id, tier, ...parts] = key.split(':')
            const seed = parts.join(':')
            const label = modeById(id)?.name
            const campaignIndex = campaignSeeds.findIndex(entry => entry === seed)
            const question = questionFromKey(key)
            const detail = question ? ' · #' + questionCode(question.number) :
              campaignIndex > 0 ? ' · Bài ' + (campaignIndex + 1) : campaignIndex === 0 ? '' : ' · ' + seed
            return <tr key={key}><th scope="row"><a className="text-link" href={'#/play/' + id + '/' + tier + '/' + encodeURIComponent(seed)}>
              {label} · {ranks[Number(tier)]}{detail}</a></th>
              <td className={'medal-' + info.medal}>{medalLabels[info.medal]}</td><td>{info.bestMoves}</td>
              <td>{formatTime(info.bestTime)}</td><td>{info.leastHints}</td><td>{info.points}</td></tr>
          })}</tbody></table></div>}
      <Pagination page={activePage} pageCount={pageCount} select={setPage} />
    </div>
    <div className="panel progress-panel">
      <h2>Lưu trữ và giao diện</h2>
      <label className="setting"><input type="checkbox" checked={progress.settings.reducedMotion} onChange={event => saveSettings({ reducedMotion: event.target.checked })} /> Giảm chuyển động</label>
      <label className="setting"><input type="checkbox" checked={progress.settings.practiceNim} onChange={event => saveSettings({ practiceNim: event.target.checked })} /> Cho phép hoàn tác khi luyện Nim</label>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn btn-outline" onClick={() => exportFile(progress)}><Download size={16} /> Xuất JSON</button>
        <button type="button" className="btn btn-outline" onClick={() => file.current?.click()}><Upload size={16} /> Nhập JSON</button>
        <input type="file" accept=".json,application/json" ref={file} hidden aria-label="Tệp tiến độ" onChange={event => void readFile(event.target.files?.[0])} />
      </div>
      {candidate && <div className="import-confirm"><p>Tệp chứa {Object.keys(candidate.achievements).length} thành tích. Nhập tệp sẽ thay thế tiến độ hiện tại.</p>
        <div className="flex flex-wrap gap-3"><button type="button" className="btn btn-primary"
          onClick={() => { importProgress(candidate); setPage(0); setCandidate(undefined); setNotice('Đã nhập tiến độ.') }}>Thay thế tiến độ</button>
          <button type="button" className="btn btn-outline" onClick={() => setCandidate(undefined)}>Hủy</button></div></div>}
      {notice && <p role="status">{notice}</p>}
    </div>
  </section>
}

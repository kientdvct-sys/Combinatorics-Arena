import { randomUUID } from 'node:crypto'
import { questionCount } from '../src/questions/settings.mjs'
import { RequestError } from './request-error.mjs'

export const emptyEditorial = () => ({ features: [], activity: [] })

export function decodeEditorial(raw) {
  if (raw === null) return emptyEditorial()
  if (typeof raw !== 'string') throw new Error('Invalid featured data')
  const parsed = JSON.parse(raw)
  // The previous release stored an array at the same key and file.
  const value = Array.isArray(parsed) ? { features: parsed, activity: [] } : parsed
  if (!Array.isArray(value?.features) || !Array.isArray(value?.activity)) throw new Error('Invalid featured data')
  return {
    features: value.features.map(entry => ({
      ...entry,
      priority: entry.priority ?? 0,
      publishAt: entry.publishAt ?? null,
      revision: entry.revision ?? 1,
    })),
    activity: value.activity,
  }
}

export function featureInput({ question, status, title, note, priority = 0, publishAt = null }) {
  title = typeof title === 'string' ? title.trim() : ''
  note = typeof note === 'string' ? note.trim() : ''
  if (!Number.isInteger(question) || question < 1 || question > questionCount) {
    throw new RequestError(400, 'Mã bài phải nằm trong khoảng 1–' + questionCount + '.')
  }
  if (!title || title.length > 80 || note.length > 240 || (status !== 'draft' && status !== 'published')) {
    throw new RequestError(400, 'Nhập tiêu đề từ 1 đến 80 ký tự và lời giới thiệu tối đa 240 ký tự.')
  }
  if (!Number.isInteger(priority) || priority < 0 || priority > 100) {
    throw new RequestError(400, 'Độ ưu tiên phải là số nguyên từ 0 đến 100.')
  }
  if (publishAt !== null && (typeof publishAt !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(publishAt) ||
      !Number.isFinite(Date.parse(publishAt)) || new Date(publishAt).toISOString() !== publishAt)) {
    throw new RequestError(400, 'Thời điểm công khai không hợp lệ.')
  }
  return { question, title, note, status, priority, publishAt }
}

export function requiredRevision(header) {
  if (header === undefined) throw new RequestError(428, 'Hãy tải lại danh sách để lấy phiên bản mới của bài.')
  const match = /^"([1-9]\d{0,11})"$/.exec(header)
  if (!match) throw new RequestError(400, 'Phiên bản chỉnh sửa không hợp lệ.')
  return Number(match[1])
}

function currentFeature(features, id, revision) {
  const feature = features.find(item => item.id === id)
  if (!feature) throw new RequestError(404, 'Không tìm thấy bài nổi bật.')
  if (feature.revision !== revision) throw new RequestError(412, 'Bài đã thay đổi ở phiên khác. Hãy tải lại trước khi lưu.')
  return feature
}

export function featureChange(data, { id, input, revision, at, eventId }) {
  const existing = revision === null ? null : currentFeature(data.features, id, revision)
  if (input && data.features.some(item => item.question === input.question && item.id !== id)) {
    throw new RequestError(409, 'Bài này đã có trong danh sách quản trị.')
  }
  const remaining = data.features.filter(item => item.id !== id)
  const next = input ? { ...input, id, updatedAt: at, revision: (existing?.revision ?? 0) + 1 } : null
  const subject = next ?? existing
  const activity = {
    id: eventId, featureId: id, question: subject.question, title: subject.title,
    action: next ? existing ? 'updated' : 'created' : 'removed', at,
    status: subject.status, publishAt: subject.publishAt,
  }
  return { features: next ? [next, ...remaining] : remaining, activity: [activity, ...data.activity].slice(0, 60) }
}

export function publishedFeatures(features, now = Date.now()) {
  const start = entry => Date.parse(entry.publishAt ?? entry.updatedAt) || 0
  return features.filter(item => item.status === 'published' && (!item.publishAt || Date.parse(item.publishAt) <= now))
    .toSorted((a, b) => ((b.priority ?? 0) - (a.priority ?? 0)) || (start(b) - start(a)) || a.id.localeCompare(b.id))
    .slice(0, 6).map(({ id, question, title, note, updatedAt }) => ({ id, question, title, note, updatedAt }))
}

export function createFeatureChange(input, id, revision) {
  return {
    id: id ?? randomUUID(), input, revision,
    at: new Date().toISOString(), eventId: randomUUID(),
  }
}

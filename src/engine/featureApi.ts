export interface FeatureDraft {
  question: number
  title: string
  note: string
  status: 'draft' | 'published'
  priority: number
  publishAt: string | null
}

export interface PublishedFeature {
  id: string
  question: number
  title: string
  note: string
  updatedAt: string
}

export type ManagedFeature = PublishedFeature & Pick<FeatureDraft, 'status' | 'priority' | 'publishAt'> & { revision: number }
export interface EditorialActivity {
  id: string
  featureId: string
  question: number
  title: string
  action: 'created' | 'updated' | 'removed'
  at: string
  status: FeatureDraft['status']
  publishAt: string | null
}
export interface Editorial { features: ManagedFeature[]; activity: EditorialActivity[] }
export interface AdminSession { initialized: boolean; email: string | null; hosting?: 'vercel' }

export class FeatureApiError extends Error {
  constructor(readonly status: number, message: string) { super(message) }
}

export async function featureApi<T>(path: string, method = 'GET', payload?: unknown, signal?: AbortSignal, revision?: number): Promise<T> {
  const headers = new Headers({ Accept: 'application/json' })
  if (payload !== undefined) headers.set('Content-Type', 'application/json')
  if (revision !== undefined) headers.set('If-Match', '"' + revision + '"')
  const response = await fetch(path, {
    method, signal, credentials: 'same-origin', cache: 'no-store',
    headers,
    body: payload === undefined ? undefined : JSON.stringify(payload),
  })
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new FeatureApiError(503, 'Máy chủ quản trị chưa trả về dữ liệu.')
  }
  const value = await response.json()
  if (!response.ok) {
    const message = value.error || 'Không xử lý được yêu cầu.'
    const suffix = typeof value.requestId === 'string' ? ' Mã hỗ trợ: ' + value.requestId : ''
    throw new FeatureApiError(response.status, message + suffix)
  }
  return value as T
}

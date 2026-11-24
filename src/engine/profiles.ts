import { isRecord } from './storage'

const profilePrefix = 'combinatorics-arena-profile:'
const sessionKey = 'combinatorics-arena-session'
const iterations = 600_000

export interface Profile {
  id: string
  handle: string
  name: string
}

interface Credential extends Profile {
  version: 1
  salt: string
  hash: string
}

const hex = (bytes: Uint8Array) => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
const unhex = (value: string) => Uint8Array.from(value.match(/.{2}/g) ?? [], byte => Number.parseInt(byte, 16))
const storageKey = (handle: string) => profilePrefix + encodeURIComponent(handle)

export function normalizeName(input: string) {
  const name = input.normalize('NFC').trim().replace(/\s+/gu, ' ')
  if (!/^[\p{L}\p{N}][\p{L}\p{M}\p{N} ._-]{1,23}$/u.test(name)) {
    throw new Error('Tên hồ sơ cần từ 2 đến 24 ký tự, bắt đầu bằng chữ hoặc số.')
  }
  return { name, handle: name.toLocaleLowerCase('vi').normalize('NFC') }
}

function readCredential(storage: Storage, handle: string): Credential | null {
  const raw = storage.getItem(storageKey(handle))
  if (!raw) return null
  const value: unknown = JSON.parse(raw)
  if (!isRecord(value) || value.version !== 1 || value.handle !== handle || typeof value.name !== 'string' ||
      typeof value.id !== 'string' || !/^[a-f0-9]{32}$/.test(value.id) ||
      typeof value.salt !== 'string' || !/^[a-f0-9]{32}$/.test(value.salt) ||
      typeof value.hash !== 'string' || !/^[a-f0-9]{64}$/.test(value.hash)) {
    throw new Error('Hồ sơ đã lưu có dữ liệu không hợp lệ.')
  }
  return {
    version: 1, id: value.id, handle, name: value.name, salt: value.salt, hash: value.hash,
  }
}

function publicProfile({ id, handle, name }: Profile): Profile {
  return { id, handle, name }
}

async function derivePassword(password: string, salt: string) {
  if (!globalThis.crypto?.subtle) throw new Error('Đăng nhập cần mở game qua HTTPS hoặc localhost.')
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(salt), iterations }, key, 256)
  return hex(new Uint8Array(bits))
}

export async function registerProfile(storage: Storage, input: string, password: string): Promise<Profile> {
  const { name, handle } = normalizeName(input)
  if (password.length < 8 || password.length > 128) throw new Error('Mật khẩu cần từ 8 đến 128 ký tự.')
  if (storage.getItem(storageKey(handle))) throw new Error('Tên hồ sơ này đã được sử dụng.')
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)))
  const hash = await derivePassword(password, salt)
  const credential: Credential = { version: 1, id: hex(crypto.getRandomValues(new Uint8Array(16))), handle, name, salt, hash }
  const commit = () => {
    if (storage.getItem(storageKey(handle))) throw new Error('Tên hồ sơ này đã được sử dụng.')
    storage.setItem(storageKey(handle), JSON.stringify(credential))
    return publicProfile(credential)
  }
  const locks = globalThis.navigator?.locks
  return locks ? locks.request(storageKey(handle), commit) : commit()
}

export async function signIn(storage: Storage, input: string, password: string): Promise<Profile> {
  const badCredentials = new Error('Tên hồ sơ hoặc mật khẩu không đúng.')
  let handle: string
  try { handle = normalizeName(input).handle } catch { throw badCredentials }
  if (password.length < 8 || password.length > 128) throw badCredentials
  const profile = readCredential(storage, handle)
  if (!profile) throw badCredentials
  const actual = await derivePassword(password, profile.salt)
  let difference = 0
  for (let index = 0; index < actual.length; index++) {
    difference |= actual.charCodeAt(index) ^ profile.hash.charCodeAt(index)
  }
  if (difference !== 0) throw badCredentials
  return publicProfile(profile)
}

export function readSession(storage: Storage, session: Storage): Profile | null {
  const handle = session.getItem(sessionKey)
  const credential = handle ? readCredential(storage, handle) : null
  return credential ? publicProfile(credential) : null
}

export function writeSession(session: Storage, profile: Profile | null) {
  if (profile) session.setItem(sessionKey, profile.handle)
  else session.removeItem(sessionKey)
}

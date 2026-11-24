import { randomBytes, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { passwordRecord, verifyPassword } from './admin-credentials.mjs'
import { decodeEditorial } from './editorial.mjs'

export const ownerEmail = 'trungkienng12@gmail.com'
export const dataDirectory = () => resolve(process.env.ARENA_DATA_DIR || join(homedir(), '.combinatorics-arena'))

export async function provisionAdmin(directory = dataDirectory()) {
  mkdirSync(directory, { mode: 0o700, recursive: true })
  const file = join(directory, 'admin.json')
  if (existsSync(file)) return null
  const password = randomBytes(24).toString('base64url')
  const record = { email: ownerEmail, ...await passwordRecord(password) }
  try {
    writeFileSync(file, JSON.stringify(record), { encoding: 'utf8', flag: 'wx', mode: 0o600 })
  } catch (error) {
    if (error.code === 'EEXIST') return null
    throw error
  }
  return { email: ownerEmail, password }
}

export function adminInitialized(directory) {
  return existsSync(join(directory, 'admin.json'))
}

export async function verifyAdmin(directory, email, password) {
  if (!adminInitialized(directory)) return false
  const stored = JSON.parse(readFileSync(join(directory, 'admin.json'), 'utf8'))
  return verifyPassword(stored, email, password)
}

function readEditorial(directory) {
  const file = join(directory, 'featured.json')
  return decodeEditorial(existsSync(file) ? readFileSync(file, 'utf8') : null)
}

function replaceEditorial(directory, state) {
  mkdirSync(directory, { mode: 0o700, recursive: true })
  const temporary = join(directory, 'featured-' + randomUUID() + '.tmp')
  try {
    writeFileSync(temporary, JSON.stringify(state), { encoding: 'utf8', flag: 'wx', mode: 0o600 })
    renameSync(temporary, join(directory, 'featured.json'))
  } finally {
    rmSync(temporary, { force: true })
  }
}

export function localAdminBackend(directory) {
  const sessions = new Map()
  let loginReset = 0
  let attempts = 0
  return {
    email: ownerEmail,
    initialized: () => adminInitialized(directory),
    verify: (email, password) => verifyAdmin(directory, email, password),
    checkStorage: () => { readEditorial(directory); return true },
    readEditorial: () => readEditorial(directory),
    updateEditorial: change => {
      const next = change(readEditorial(directory))
      replaceEditorial(directory, next)
      return next
    },
    getSession: digest => {
      if ((sessions.get(digest) || 0) > Date.now()) return true
      sessions.delete(digest)
      return false
    },
    putSession: (digest, seconds) => {
      const now = Date.now()
      for (const [id, expires] of sessions) if (expires <= now) sessions.delete(id)
      if (sessions.size >= 32) sessions.delete(sessions.keys().next().value)
      sessions.set(digest, now + seconds * 1000)
    },
    deleteSession: digest => sessions.delete(digest),
    permitLogin: () => {
      const now = Date.now()
      if (now >= loginReset) { attempts = 0; loginReset = now + 5 * 60_000 }
      if (attempts >= 5) return Math.ceil((loginReset - now) / 1000)
      attempts++
      return 0
    },
  }
}

import { pbkdf2, randomBytes, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const deriveKey = promisify(pbkdf2)
const rounds = 600_000
const saltPattern = /^[a-f0-9]{32}$/
const keyPattern = /^[a-f0-9]{64}$/

export function normalizeEmail(value) {
  return typeof value === 'string' && value.length <= 254 ? value.trim().toLowerCase() : ''
}

export async function passwordRecord(password) {
  const salt = randomBytes(16)
  const hash = await deriveKey(password, salt, rounds, 32, 'sha256')
  return { salt: salt.toString('hex'), hash: hash.toString('hex') }
}

export function encodeVerifier({ salt, hash }) {
  return 'pbkdf2-sha256:' + rounds + ':' + salt + ':' + hash
}

export function decodeVerifier(value) {
  if (typeof value !== 'string') return null
  const [algorithm, iterations, salt, hash, ...extra] = value.split(':')
  return algorithm === 'pbkdf2-sha256' && iterations === String(rounds) &&
    saltPattern.test(salt || '') && keyPattern.test(hash || '') && extra.length === 0 ? { salt, hash } : null
}

export async function verifyPassword(record, email, password) {
  if (!record || !saltPattern.test(record.salt || '') || !keyPattern.test(record.hash || '') ||
      typeof password !== 'string' || password.length < 12 || password.length > 128) return false
  const derived = await deriveKey(password, Buffer.from(record.salt, 'hex'), rounds, 32, 'sha256')
  const matched = timingSafeEqual(derived, Buffer.from(record.hash, 'hex'))
  return matched && normalizeEmail(email) === record.email
}

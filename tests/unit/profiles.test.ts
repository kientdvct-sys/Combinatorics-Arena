import { expect, it } from 'vitest'
import { normalizeName, readSession, registerProfile, signIn, writeSession } from '../../src/engine/profiles'

function memoryStorage(): Storage {
  const entries = new Map<string, string>()
  return {
    get length() { return entries.size },
    getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => { entries.set(key, value) },
    removeItem: key => { entries.delete(key) },
    clear: () => entries.clear(),
    key: index => [...entries.keys()][index] ?? null,
  }
}

it('normalizes Vietnamese profile names and rejects malformed names', () => {
  expect(normalizeName('  Kiến   Trần  ')).toEqual({ name: 'Kiến Trần', handle: 'kiến trần' })
  expect(() => normalizeName('..')).toThrow()
  expect(() => normalizeName('M')).toThrow()
})

it('authenticates with unique salted derived passwords and restores the tab session', async () => {
  const storage = memoryStorage()
  const session = memoryStorage()
  const password = 'DauTruong2026!'
  const first = await registerProfile(storage, 'Kiên', password)
  const second = await registerProfile(storage, 'Linh', password)
  const records = [storage.key(0)!, storage.key(1)!].map(key => storage.getItem(key)!)
  expect(records.some(raw => raw.includes(password))).toBe(false)
  const credentials = records.map(raw => JSON.parse(raw))
  expect(credentials[0].hash).not.toBe(credentials[1].hash)
  expect(credentials[0].salt).not.toBe(credentials[1].salt)
  await expect(registerProfile(storage, ' KIÊN ', 'OtherPas$word')).rejects.toThrow(/đã được sử dụng/)
  await expect(signIn(storage, 'kiên', 'incorrect password')).rejects.toThrow(/không đúng/)
  await expect(signIn(storage, ' KIÊN ', password)).resolves.toEqual(first)
  await expect(signIn(storage, 'linh', password)).resolves.toEqual(second)
  expect(readSession(storage, session)).toBeNull()
  writeSession(session, first)
  expect(readSession(storage, session)).toEqual(first)
  writeSession(session, null)
  expect(readSession(storage, session)).toBeNull()
})

it('accepts only one registration when a profile name is submitted twice', async () => {
  const storage = memoryStorage()
  const results = await Promise.allSettled([
    registerProfile(storage, 'An Dương', 'first password'),
    registerProfile(storage, 'an dương', 'second password'),
  ])
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
  expect(storage.length).toBe(1)
})

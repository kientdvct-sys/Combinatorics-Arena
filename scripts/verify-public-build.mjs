import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = fileURLToPath(new URL('../dist/', import.meta.url))
const verifier = (process.env.ARENA_ADMIN_CREDENTIAL || '').trim()
const privateMarkers = [
  'ARENA_ADMIN_CREDENTIAL', 'UPSTASH_REDIS_REST_TOKEN', 'pbkdf2-sha256:600000:',
  verifier, verifier.split(':').at(-1), (process.env.UPSTASH_REDIS_REST_TOKEN || '').trim(),
].filter(value => value && value.length >= 16)

async function verify(root) {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name)
    if (entry.name.startsWith('.env') || entry.name === 'admin.json' ||
        entry.name === 'featured.json' || entry.name.endsWith('.map')) {
      throw new Error('Private or debug file in the public build: ' + entry.name)
    }
    if (entry.isDirectory()) await verify(path)
    else {
      const contents = await readFile(path)
      if (privateMarkers.some(marker => contents.includes(marker))) {
        throw new Error('A private configuration marker was found in the public build: ' + entry.name)
      }
    }
  }
}

await verify(dist)
console.log('Verified that dist contains no private admin configuration or source maps.')

import { createServer } from 'vite'
import { readFile, writeFile } from 'node:fs/promises'

const basePath = new URL('../src/questions/index.generated.ts', import.meta.url)
const extensionPath = new URL('../src/questions/extra.generated.ts', import.meta.url)
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' })
try {
  const { buildQuestionIndex, buildQuestionExtension } = await server.ssrLoadModule('/src/questions/candidates.ts')
  const base = buildQuestionIndex()
  const original = 'export default ' + JSON.stringify(base) + '\n'
  if ((await readFile(basePath, 'utf8')).trim() !== original.trim()) {
    throw new Error('Regenerating would change an existing exercise address.')
  }
  const extension = buildQuestionExtension(base)
  await writeFile(extensionPath, 'export default ' + JSON.stringify(extension) + '\n')
  const size = Object.values(base).flat(2).length + Object.values(extension).flat(2).length
  console.log('Verified ' + size + ' exercises and preserved the original addresses.')
} finally {
  await server.close()
}

import { seeded, range } from '../engine/core'

export type Random = ReturnType<typeof seeded>
export interface Candidate<L> { level: L; signature: string }

export function sample<T>(items: readonly T[], count: number, random: Random) {
  const copy = [...items]
  const limit = Math.min(count, copy.length)
  for (let index = 0; index < limit; index++) {
    const offset = random.integer(index, copy.length - 1)
    const value = copy[index]
    copy[index] = copy[offset]
    copy[offset] = value
  }
  return copy.slice(0, limit)
}

export function ringSignature(positions: string[]) {
  const forward = positions.join('')
  const backward = [...positions].reverse().join('')
  return [forward, backward].flatMap(text =>
    range(text.length).map(index => text.slice(index) + text.slice(0, index))).sort()[0]
}

export function gridSignature(rows: number, cols: number, bits: number[]) {
  const variants: string[] = []
  for (const transpose of [false, true]) {
    const height = transpose ? cols : rows
    const width = transpose ? rows : cols
    for (let flip = 0; flip < 4; flip++) {
      const shape = range(bits.length).map(index => {
        const row = Math.floor(index / width)
        const col = index % width
        const y = flip & 1 ? height - 1 - row : row
        const x = flip & 2 ? width - 1 - col : col
        return bits[transpose ? x * cols + y : y * cols + x]
      })
      variants.push(height + 'x' + width + ':' + shape.join(''))
    }
  }
  return variants.sort()[0]
}

import { range, seeded } from '../engine/core'
import type { Rank } from '../engine/core'
import { graphTask } from '../engine/lessons'
import { exactColor } from '../games/graph'
import type { Edge, GraphLevel } from '../games/graph'
import { sample } from './sampling'
import type { Candidate } from './sampling'

export function graphSignature(size: number, edges: Edge[]) {
  const neighbors = range(size).map(() => [] as number[])
  for (const [a, b] of edges) {
    neighbors[a].push(b)
    neighbors[b].push(a)
  }
  let labels = neighbors.map(list => list.length)
  const layers = [String([...labels].sort((a, b) => a - b))]
  for (let round = 0; round < 3; round++) {
    const descriptions = neighbors.map((list, vertex) =>
      labels[vertex] + ':' + list.map(index => labels[index]).sort((a, b) => a - b).join(','))
    const sorted = [...descriptions].sort()
    layers.push(sorted.join(';'))
    const dictionary = [...new Set(sorted)]
    labels = descriptions.map(value => dictionary.indexOf(value))
  }
  return layers.join('/')
}

export function candidateGraph(rank: Rank, trial: number): Candidate<GraphLevel> | undefined {
  const random = seeded('questions-graph-v1:' + rank + ':' + trial)
  const size = random.integer([7, 8, 9, 10, 11][rank], [9, 10, 11, 12, 13][rank])
  const colors = [trial % 3 === 0 ? 2 : 3, trial % 2 === 0 ? 2 : 3, trial % 3 === 0 ? 3 : 4, 4, trial % 4 === 0 ? 4 : 5][rank]
  const order = sample(range(size), size, random)
  const planted = range(size).map(index => index % colors)
  const edgeKeys = new Set<number>()
  function connect(a: number, b: number) {
    const x = order[a]
    const y = order[b]
    edgeKeys.add(Math.min(x, y) * size + Math.max(x, y))
  }

  for (let vertex = 1; vertex < size; vertex++) {
    const options = range(vertex).filter(index => planted[index] !== planted[vertex])
    connect(vertex, options[random.integer(0, options.length - 1)])
  }
  if (trial % 2 === 0 || rank === 4) {
    for (let a = 0; a < colors; a++) for (let b = a + 1; b < colors; b++) connect(a, b)
  }
  const minimumDensity = [16, 23, 23, 35, 35][rank]
  const probability = random.integer(minimumDensity, minimumDensity + 32)
  for (let a = 0; a < size; a++) for (let b = a + 1; b < size; b++) {
    if (planted[a] !== planted[b] && random.integer(1, 100) <= probability) connect(a, b)
  }

  const edges = [...edgeKeys].sort((a, b) => a - b).map((key): Edge => [Math.floor(key / size), key % size])
  const locked: Record<number, number> = {}
  const locks = rank === 0 ? 0 : trial % 3 === 0 ? 0 : random.integer(1, rank)
  for (const index of sample(range(size), locks, random)) locked[order[index]] = planted[index]
  const level: GraphLevel = {
    title: locks ? 'Tô màu với đỉnh khóa' : 'Tô màu ít nhất',
    goal: graphTask,
    complexity: size + ' chấm · ' + edges.length + ' đường nối' + (locks ? ' · ' + locks + ' chấm đã khóa màu' : ''),
    size, edges, locked, palette: rank < 2 ? 4 : 5, phase: 0, family: 'generated', layout: 'circle',
  }
  if (exactColor(level)?.minimum !== colors) return
  return { level, signature: graphSignature(size, edges) }
}

import { isIndex, pending, range, seeded, won } from '../engine/core'
import type { Challenge, Game } from '../engine/core'
import { graphTask } from '../engine/lessons'
import { campaignVariant } from '../engine/campaign'
import { cycle, extraGraph, extraTitles, mycielski, wheel } from './bank'
import type { GraphFamily, GraphLayout } from './bank'

export type Edge = [number, number]
export interface GraphLevel extends Challenge {
  size: number
  edges: Edge[]
  locked: Record<number, number>
  palette: number
  phase: number
  family: GraphFamily
  layout: GraphLayout
}
export type GraphState = number[]
export interface GraphAction { vertex: number; color: number }

export const palette = ['#54e5c9', '#a892ff', '#f2c06d', '#fa86a7', '#77b3ff'] as const

export function conflicts(edges: Edge[], colors: number[]) {
  return edges.filter(([a, b]) => colors[a] >= 0 && colors[a] === colors[b])
}

export function exactColor(level: GraphLevel) {
  const adjacent = range(level.size).map(() => [] as number[])
  for (const [a, b] of level.edges) {
    adjacent[a].push(b)
    adjacent[b].push(a)
  }
  const locked = range(level.size).map(vertex => level.locked[vertex] ?? -1)
  if (conflicts(level.edges, locked).length || locked.some(color => color >= level.palette)) return null
  const initialUsed = new Set(locked.filter(color => color >= 0))
  for (let limit = Math.max(1, initialUsed.size); limit <= level.palette; limit++) {
    const colors = [...locked]
    const used = new Set(initialUsed)

    function assign(): boolean {
      let next = -1
      let saturation = -1
      let degree = -1
      let unavailable = new Set<number>()
      for (const vertex of range(level.size)) {
        if (colors[vertex] !== -1) continue
        const seen = new Set(adjacent[vertex].map(neighbor => colors[neighbor]).filter(color => color >= 0))
        if (seen.size > saturation || (seen.size === saturation && adjacent[vertex].length > degree)) {
          next = vertex
          saturation = seen.size
          degree = adjacent[vertex].length
          unavailable = seen
        }
      }
      if (next === -1) return true
      const fresh = range(level.palette).find(color => !used.has(color))
      const options = [...used]
      if (fresh !== undefined && used.size < limit) options.push(fresh)
      for (const color of options) {
        if (unavailable.has(color)) continue
        colors[next] = color
        used.add(color)
        if (assign()) return true
        colors[next] = -1
        if (color === fresh) used.delete(color)
      }
      return false
    }

    if (assign()) return { minimum: limit, colors }
  }
  return null
}

const mycielskiArgument = 'Giả sử tô được lõi Mycielski bằng 3 màu. Tô lại mỗi đỉnh gốc trùng màu với đỉnh nối các bản sao bằng màu của bản sao tương ứng. Khi đó chu trình gốc C₅ chỉ dùng 2 màu, điều bất khả thi.'

const defaultFamilies: GraphFamily[] = ['odd', 'bipartite', 'wheel', 'lifted', 'universal']
const graphFocus: Record<GraphFamily, string> = {
  odd: 'Sự luân phiên hai màu gặp mâu thuẫn khi khép một chu trình lẻ.',
  bipartite: 'Tìm hai tập đỉnh sao cho mọi cạnh đều đi giữa hai tập.',
  triangle: 'Kiểm tra những đỉnh đôi một kề nhau để tìm cận dưới.',
  'locked-path': 'Xét số cạnh của đường đi giữa hai đỉnh khóa cùng màu.',
  wheel: 'Số màu của vành phụ thuộc vào tính chẵn lẻ. Đỉnh tâm kề tất cả đỉnh vành.',
  clique: 'Tìm một tập bốn đỉnh đôi một có cạnh nối.',
  lifted: 'Lõi chứa chu trình lẻ cùng các đỉnh sao chép. Tìm màu bị loại ở các bản sao.',
  universal: 'Một đỉnh nối với toàn bộ lõi và buộc phải dùng một màu riêng.',
  generated: 'Một nhóm đỉnh đôi một có cạnh nối buộc phải dùng các màu khác nhau. Hãy tìm nhóm như vậy để lập cận dưới.',
}

export const graph: Game<GraphState, GraphAction, GraphLevel, ReturnType<typeof exactColor>> = {
  generate(seed, rank) {
    const roll = seeded('graph:' + seed)
    const variant = campaignVariant(seed)
    const extra = extraGraph(rank, variant)
    const size = extra?.size ?? [5, 8, 8, 11, 12][rank]
    const orbit = [0, 0, 1, 0, 1][rank]
    const phase = seed === 'arena' ? 0 : roll.integer(0, 11)
    const wheelEdges = wheel(7)
    const crown: Edge[] = range(4).flatMap(a => range(4).filter(b => a !== b).map((b): Edge => [a * 2, b * 2 + 1]))
    const lifted = mycielski(5, cycle(5))
    const apexLinks = range(11).map((vertex): Edge => [vertex, 11])
    const level: GraphLevel = {
      title: extraTitles.graph[rank][variant - 1] ?? ['Chu trình lẻ', 'Hai phe đối diện', 'Bánh xe bảy nan', 'Đồ thị Grötzsch', 'Đỉnh phổ dụng'][rank],
      goal: graphTask,
      complexity: graphFocus[extra?.family ?? defaultFamilies[rank]],
      size, edges: extra?.edges ?? [cycle(5), crown, wheelEdges, lifted, [...lifted, ...apexLinks]][rank],
      locked: extra?.locked ?? {}, palette: [4, 4, 4, 5, 5][rank], phase,
      family: extra?.family ?? defaultFamilies[rank],
      layout: extra?.layout ?? (rank === 2 ? 'wheel' : rank >= 3 ? 'lifted' : 'circle'),
    }
    if (extra) {
      if (exactColor(level)?.minimum !== extra.optimum) throw new Error('Unexpected campaign chromatic number: ' + level.title)
      return level
    }
    if (rank === 4) {
      level.locked = { [11]: (phase + orbit) % 5, [phase % 5]: (phase + orbit + 1) % 5 }
    } else if (phase) {
      const outer = rank === 2 ? 7 : rank === 3 ? 5 : size
      function rotateVertex(vertex: number) {
        if (rank === 3 && vertex >= 5 && vertex < 10) return 5 + (vertex - 5 + phase) % 5
        return vertex < outer ? (vertex + phase) % outer : vertex
      }
      level.edges = level.edges.map(([a, b]) => [rotateVertex(a), rotateVertex(b)])
    }
    if (exactColor(level)?.minimum !== [3, 2, 4, 4, 5][rank]) throw new Error('Unexpected chromatic number.')
    return level
  },
  initial: level => range(level.size).map(vertex => level.locked[vertex] ?? -1),
  apply(level, colors, { vertex, color }) {
    if (!isIndex(vertex, level.size) || (color !== -1 && !isIndex(color, level.palette)) ||
        level.locked[vertex] !== undefined || colors[vertex] === color) return colors
    return colors.map((old, index) => index === vertex ? color : old)
  },
  validate(level, colors) {
    const unpainted = level.size - colors.filter(color => isIndex(color, level.palette)).length
    if (colors.length !== level.size || unpainted) return pending('Hãy tô ' + unpainted + ' chấm còn trống, sau đó kiểm tra các đường nối.')
    if (Object.entries(level.locked).some(([vertex, color]) => colors[Number(vertex)] !== color)) return pending('Hãy giữ màu của các đỉnh khóa.')
    if (conflicts(level.edges, colors).length) return pending('Các cạnh đỏ nối hai đỉnh cùng màu. Hãy sửa chúng.')
    const optimum = exactColor(level)?.minimum
    if (new Set(colors).size !== optimum) return pending('Mọi đường nối đều hợp lệ. Thử đổi các chấm đang dùng màu ít gặp sang các màu đã có để giảm tổng số màu.')
    return won('Bạn đã tô đúng bằng ' + optimum + ' màu, đạt tối ưu.')
  },
  solve: exactColor,
  hint(level, _state, tier) {
    if (tier === 1) return 'Bắt đầu ở đỉnh nhiều hàng xóm hoặc có màu cố định. Quan sát những màu đã xuất hiện quanh nó.'
    if (tier === 2) return graphFocus[level.family]
    const steps: Record<GraphFamily, string> = {
      odd: 'Tô luân phiên dọc theo chu trình, rồi xử lý cạnh khép vòng bằng màu thứ ba.',
      bipartite: 'Tô một đỉnh, dùng màu khác cho toàn bộ hàng xóm rồi tiếp tục lan lần lượt qua các cạnh.',
      triangle: 'Tô ba đỉnh của một tam giác bằng ba màu khác nhau. Dùng lại những màu còn trống ở các đỉnh bên ngoài.',
      'locked-path': 'Tô thử hai màu từ đỉnh khóa đầu tiên. Khi đến đỉnh khóa còn lại, dùng màu thứ ba tại một đỉnh bên trong để ngắt sự luân phiên.',
      wheel: 'Tô vành ngoài trước. Sau đó chọn cho đỉnh tâm một màu chưa xuất hiện ở vành.',
      clique: 'Gán một màu riêng cho mỗi đỉnh của nhóm bốn đỉnh đôi một kề nhau. Mở rộng từ nhóm đó.',
      lifted: 'Tìm chu trình năm đỉnh gốc. Thử tô bản sao bằng màu của đỉnh gốc tương ứng trước khi xử lý các cạnh được thêm.',
      universal: 'Dành riêng màu đã khóa ở đỉnh phổ dụng, rồi tìm cách tô phần lõi bằng bốn màu còn lại.',
      generated: 'Tô đỉnh có nhiều màu khác nhau trong các hàng xóm trước. Khi hết màu, thử đổi một nhóm đỉnh độc lập thay vì thêm màu ngay.',
    }
    return steps[level.family]
  },
  explain(level) {
    const minimum = exactColor(level)?.minimum
    const argumentsByFamily: Record<GraphFamily, string> = {
      odd: 'Chu trình lẻ cần ít nhất ba màu vì không thể luân phiên hai màu cho tới cạnh khép vòng.',
      bipartite: 'Đồ thị hai phía có cạnh cần ít nhất hai màu. Dùng một màu cho mỗi phía đạt cận và phải tuân theo các đỉnh khóa nếu có.',
      triangle: 'Tam giác cần ba màu vì ba đỉnh của nó kề nhau đôi một.',
      'locked-path': 'Nếu dùng hai màu, đường đi có số cạnh lẻ buộc hai đầu khác màu. Hai đầu ở đây cùng bị khóa vào một màu, nên cần ít nhất ba màu.',
      wheel: 'Đỉnh tâm kề mọi đỉnh vành nên cần thêm một màu. Vành chẵn cần hai màu và vành lẻ cần ba màu.',
      clique: 'Bốn đỉnh đôi một kề nhau buộc phải nhận bốn màu khác nhau.',
      lifted: mycielskiArgument + ' Lõi cần ít nhất bốn màu. Các cạnh và đỉnh thêm vào giữ nguyên cận dưới này.',
      universal: mycielskiArgument + ' Đỉnh phổ dụng kề toàn bộ lõi nên cần màu thứ năm.',
      generated: 'Bộ giải ưu tiên đỉnh có nhiều màu đã dùng ở hàng xóm, rồi duyệt các màu còn hợp lệ và quay lui khi mâu thuẫn. Việc không tìm được cách tô với ít màu hơn xác nhận tính tối ưu.',
    }
    return argumentsByFamily[level.family] + ' DSATUR xác nhận tô được bằng ' + minimum + ' màu.'
  },
}

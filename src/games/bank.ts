import { range } from '../engine/core'
import type { Rank } from '../engine/core'
import type { CampaignVariant } from '../engine/campaign'
import type { Edge } from './graph'

export const extraTitles = {
  nim: [
    ['Thế đá tam giác', 'Lấy ít, nghĩ xa', 'Một viên quyết định'],
    ['Đổi nhịp ván cờ', 'Bốn đống bất đối xứng', 'Giữ đối xứng'],
    ['Đống lớn, thế nhỏ', 'Cân bằng sáu đống', 'Vượt ngưỡng nhị phân'],
    ['Ba đống đơn', 'Ngã rẽ misère', 'Nước đi áp chót'],
    ['Giới hạn hai viên', 'Giới hạn bốn viên', 'Giới hạn năm viên'],
  ],
  circle: [
    ['Vòng chín chỗ ngồi', 'Ghế ở giữa bị cấm', 'Một nửa số ghế'],
    ['Hai người giữ chỗ', 'Ba ghế bị cấm', 'Các khoảng trống rời'],
    ['Đếm bốn vị trí', 'Đếm sáu vị trí', 'Đếm trên vòng lớn'],
    ['Ba cung bị chia', 'Tối đa dưới nhiều khóa', 'Ghế bắt buộc qua điểm nối'],
    ['Các ghế quan sát', 'Đếm với ba chốt', 'Vòng hai mươi mốt vị trí'],
  ],
  graph: [
    ['Chu trình chẵn', 'Mái nhà tam giác', 'Vòng bảy đỉnh'],
    ['Hai nhóm hoàn chỉnh', 'Hai nhóm có đỉnh khóa', 'Đường đi với hai đầu khóa'],
    ['Bánh xe năm nan', 'Bánh xe sáu nan', 'Lõi bốn đỉnh'],
    ['Thêm đỉnh vào lõi Grötzsch', 'Dây cung của lõi', 'Cạnh mới ở đỉnh nối'],
    ['Đỉnh phổ dụng và dây cung', 'Hai lớp cạnh bổ sung', 'Đỉnh phổ dụng với ba khóa'],
  ],
  domino: [
    ['Hai ô khuyết cùng cột', 'Khay bốn hàng', 'Đường đi qua lỗ khuyết'],
    ['Góc đối diện', 'Bốn ô cùng màu', 'Sáu ô khuyết cùng màu'],
    ['Dải phủ xen kẽ', 'Ba cụm ô khuyết', 'Hành lang sáu hàng'],
    ['Nút thắt và đuôi', 'Tập hàng xóm hẹp', 'Nhánh nối ở mép bàn'],
    ['Chướng ngại hai tầng', 'Đường nối hình chữ L', 'Mạng ô cân bằng mở rộng'],
  ],
  binary: [
    ['Phản chiếu', 'Góc và cạnh', 'Đèn giữa hàng'],
    ['Phân tích hàng đầu', 'Mặt nạ đan xen', 'Đường chéo biến đổi'],
    ['Hệ phương trình đảo đèn', 'Không gian nghiệm song song', 'Bảng đèn rải rác'],
    ['Bấm ít để thắng', 'Cận dưới thao tác', 'Phân tích nghiệm tối ưu'],
    ['Ma trận vòng ngoài', 'Tối ưu nhiều nghiệm', 'Bảng thử thách tối đa'],
  ],
} as const

interface CirclePattern { size: number; target: number; required: number[]; forbidden: number[] }
const circlePatterns: CirclePattern[][] = [
  [
    { size: 9, target: 4, required: [], forbidden: [] },
    { size: 10, target: 4, required: [], forbidden: [4] },
    { size: 10, target: 5, required: [2], forbidden: [] },
  ],
  [
    { size: 12, target: 0, required: [1, 7], forbidden: [5] },
    { size: 13, target: 0, required: [3], forbidden: [0, 6, 11] },
    { size: 13, target: 0, required: [1, 8], forbidden: [5, 11] },
  ],
  [
    { size: 12, target: 4, required: [], forbidden: [] },
    { size: 15, target: 6, required: [], forbidden: [] },
    { size: 18, target: 7, required: [], forbidden: [] },
  ],
  [
    { size: 18, target: 0, required: [2, 9, 15], forbidden: [0, 6, 12] },
    { size: 19, target: 0, required: [3, 11, 15], forbidden: [0, 7, 13, 17] },
    { size: 20, target: 0, required: [0, 7, 14], forbidden: [4, 10, 17] },
  ],
  [
    { size: 17, target: 6, required: [1, 9], forbidden: [4, 13] },
    { size: 19, target: 7, required: [2, 8, 15], forbidden: [5, 12] },
    { size: 21, target: 8, required: [0, 7, 14], forbidden: [4, 11, 17] },
  ],
]

export const extraCircle = (rank: Rank, variant: CampaignVariant) => circlePatterns[rank][variant - 1]

interface DominoPattern { rows: number; cols: number; holes: number[] }

function hallPattern(variant: number): DominoPattern {
  const [rows, cols, width] = [[6, 4, 2], [4, 6, 2], [5, 6, 2]][variant]
  const core = [[0, 0], [0, 1], [0, 2], [1, 1], [2, 1], [2, 2], [2, 3], [3, 2]]
  const annex = variant === 0
    ? range(2).flatMap(row => range(width).map(col => [row + 4, col + 2]))
    : range(rows - 2).flatMap(row => range(width).map(col => [row + 2, col + 4]))
  const kept = new Set([...core, ...annex].map(([row, col]) => row * cols + col))
  return { rows, cols, holes: range(rows * cols).filter(cell => !kept.has(cell)) }
}

function olympiadPattern(variant: number): DominoPattern {
  const [rows, cols] = [[5, 8], [6, 9], [7, 7]][variant]
  const core = [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 1], [2, 1], [2, 2], [2, 3], [3, 2]]
  const annex = range(rows - 3).flatMap(row => range(cols - 3).map(col => [row + 3, col + 3]))
  const kept = new Set([...core, ...annex].map(([row, col]) => row * cols + col))
  return { rows, cols, holes: range(rows * cols).filter(cell => !kept.has(cell)) }
}

const dominoPatterns: DominoPattern[][] = [
  [
    { rows: 4, cols: 4, holes: [0, 4] },
    { rows: 4, cols: 5, holes: [0, 1, 18, 19] },
    { rows: 5, cols: 4, holes: [1, 2, 13, 14] },
  ],
  [
    { rows: 4, cols: 6, holes: [0, 23] },
    { rows: 5, cols: 4, holes: [1, 3, 9, 11] },
    { rows: 6, cols: 4, holes: [0, 2, 9, 11, 16, 18] },
  ],
  [
    { rows: 5, cols: 6, holes: [0, 1, 8, 9, 16, 17, 18, 19] },
    { rows: 5, cols: 8, holes: [4, 5, 6, 7, 16, 17, 22, 23, 34, 35] },
    { rows: 6, cols: 6, holes: [2, 3, 10, 11, 12, 13, 20, 21, 28, 29, 32, 33] },
  ],
]
export function extraDomino(rank: Rank, variant: CampaignVariant) {
  if (!variant) return undefined
  if (rank === 3) return hallPattern(variant - 1)
  if (rank === 4) return olympiadPattern(variant - 1)
  return dominoPatterns[rank][variant - 1]
}

export type GraphFamily = 'odd' | 'bipartite' | 'triangle' | 'locked-path' | 'wheel' | 'clique' | 'lifted' | 'universal' | 'generated'
export type GraphLayout = 'circle' | 'wheel' | 'lifted'
export interface GraphPattern {
  size: number
  edges: Edge[]
  locked?: Record<number, number>
  family: GraphFamily
  layout?: GraphLayout
  optimum: number
}

export const cycle = (size: number): Edge[] => range(size).map(vertex => [vertex, (vertex + 1) % size])
export const wheel = (rim: number): Edge[] => [...cycle(rim), ...range(rim).map((vertex): Edge => [vertex, rim])]
export const complete = (size: number): Edge[] => range(size).flatMap(a => range(size).slice(a + 1).map((b): Edge => [a, b]))
const completeBipartite = (a: number, b: number): Edge[] =>
  range(a).flatMap(left => range(b).map((right): Edge => [left, a + right]))

export function mycielski(size: number, base: Edge[]): Edge[] {
  const lifted: Edge[] = base.flatMap(([a, b]) => [[a, b], [a, b + size], [b, a + size]])
  return [...lifted, ...range(size).map((vertex): Edge => [vertex + size, 2 * size])]
}

const lifted = mycielski(5, cycle(5))
const apexLinks = range(11).map((vertex): Edge => [vertex, 11])
const graphPatterns: GraphPattern[][] = [
  [
    { size: 4, edges: cycle(4), family: 'bipartite', optimum: 2 },
    { size: 5, edges: [...cycle(4), [1, 4], [2, 4]], family: 'triangle', optimum: 3 },
    { size: 7, edges: cycle(7), family: 'odd', optimum: 3 },
  ],
  [
    { size: 7, edges: completeBipartite(3, 4), family: 'bipartite', optimum: 2 },
    { size: 8, edges: completeBipartite(4, 4).filter(([a, b]) => (a + b) % 4 !== 0), locked: { 0: 2, 7: 1 }, family: 'bipartite', optimum: 2 },
    { size: 6, edges: range(5).map(index => [index, index + 1]), locked: { 0: 0, 5: 0 }, family: 'locked-path', optimum: 3 },
  ],
  [
    { size: 6, edges: wheel(5), family: 'wheel', layout: 'wheel', optimum: 4 },
    { size: 7, edges: wheel(6), locked: { 6: 2 }, family: 'wheel', layout: 'wheel', optimum: 3 },
    { size: 8, edges: [...complete(4), [0, 4], [4, 5], [1, 6], [6, 7], [5, 7]], family: 'clique', optimum: 4 },
  ],
  [
    { size: 12, edges: [...lifted, [11, 0], [11, 3], [11, 8]], family: 'lifted', layout: 'lifted', optimum: 4 },
    { size: 11, edges: [...lifted, [0, 2]], family: 'lifted', layout: 'lifted', optimum: 4 },
    { size: 11, edges: [...lifted, [0, 10], [2, 10]], family: 'lifted', layout: 'lifted', optimum: 4 },
  ],
  [
    { size: 12, edges: [...lifted, [0, 2], ...apexLinks], locked: { 11: 3, 0: 0 }, family: 'universal', layout: 'lifted', optimum: 5 },
    { size: 12, edges: [...lifted, [1, 10], [3, 10], ...apexLinks], locked: { 11: 1, 10: 2 }, family: 'universal', layout: 'lifted', optimum: 5 },
    { size: 12, edges: [...lifted, [0, 2], [1, 10], ...apexLinks], locked: { 11: 4, 10: 3, 0: 1 }, family: 'universal', layout: 'lifted', optimum: 5 },
  ],
]

export const extraGraph = (rank: Rank, variant: CampaignVariant) => graphPatterns[rank][variant - 1]

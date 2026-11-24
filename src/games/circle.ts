import { isIndex, pending, seeded, won } from '../engine/core'
import type { Challenge, Game } from '../engine/core'
import { campaignVariant } from '../engine/campaign'
import { extraCircle, extraTitles } from './bank'

export interface CircleLevel extends Challenge {
  size: number
  required: number[]
  forbidden: number[]
  mode: 'construct' | 'maximize' | 'count'
  target: number
}
export interface CircleState { chosen: number[]; answer: string }
export type CircleAction = { type: 'toggle'; index: number } | { type: 'answer'; value: string }

export function adjacent(a: number, b: number, size: number) {
  const delta = Math.abs(a - b)
  return delta === 1 || delta === size - 1
}

export function binomial(n: number, k: number) {
  if (!Number.isInteger(k) || k < 0 || k > n) return 0
  let result = 1
  for (let i = 1; i <= Math.min(k, n - k); i++) result = Math.round(result * (n - i + 1) / i)
  return result
}

export function kaplansky(n: number, k: number) {
  if (!Number.isInteger(n) || n < 3 || !Number.isInteger(k) || k < 0 || 2 * k > n) return 0
  return Math.round(n * binomial(n - k, k) / (n - k))
}

export function validChoice(level: CircleLevel, chosen: number[]) {
  return new Set(chosen).size === chosen.length &&
    level.required.every(index => chosen.includes(index)) &&
    chosen.every((index, position) => isIndex(index, level.size) && !level.forbidden.includes(index) &&
      chosen.slice(position + 1).every(other => !adjacent(index, other, level.size)))
}

export function solveCircle(level: CircleLevel) {
  let count = 0
  let maximum = -1
  let largest: number[] = []
  let example: number[] = []
  const chosen: number[] = []
  const required = new Set(level.required)
  const forbidden = new Set(level.forbidden)

  function search(index: number) {
    if (index === level.size) {
      if (chosen.length > maximum) {
        maximum = chosen.length
        largest = [...chosen]
      }
      if (chosen.length === level.target) {
        count++
        if (count === 1) example = [...chosen]
      }
      return
    }
    if (!required.has(index)) search(index + 1)
    if (!forbidden.has(index) && !chosen.includes(index - 1) &&
        (index !== level.size - 1 || chosen[0] !== 0)) {
      chosen.push(index)
      search(index + 1)
      chosen.pop()
    }
  }

  search(0)
  return { count, maximum, largest, example }
}

export const circle: Game<CircleState, CircleAction, CircleLevel, ReturnType<typeof solveCircle>> = {
  generate(seed, rank) {
    const variant = campaignVariant(seed)
    const extra = extraCircle(rank, variant)
    const size = extra?.size ?? [8, 11, 14, 17, 19][rank]
    const rotation = seed === 'arena' ? 0 : seeded('circle:' + seed).integer(0, size - 1)
    const rotate = (positions: number[]) => positions.map(position => (position + rotation) % size)
    const mode = rank === 2 || rank === 4 ? 'count' : rank === 0 ? 'construct' : 'maximize'
    const target = extra?.target ?? [3, 0, 5, 0, 7][rank]
    const level: CircleLevel = {
      title: extraTitles.circle[rank][variant - 1] ?? ['Chỗ ngồi cách nhau', 'Ghế đã giữ', 'Đếm quanh vòng', 'Hai đầu của một cung', 'Vòng tròn có điều kiện'][rank],
      goal: mode === 'maximize' ? 'Chọn nhiều vị trí hợp lệ nhất.' : mode === 'count'
        ? 'Tạo một cấu hình có ' + target + ' vị trí và nhập tổng số cấu hình hợp lệ.'
        : 'Chọn đúng ' + target + ' vị trí hợp lệ.',
      complexity: ['Nhận ra cặp kề nhau qua điểm đầu và cuối.', 'Tối ưu khi có ghế bắt buộc và ghế cấm.', 'Đếm cấu hình có nhãn bằng công thức Kaplansky.', 'Chia vòng thành các đường đi với nhiều điều kiện biên.', 'Kết hợp các đoạn độc lập và đếm theo số vị trí đã chọn.'][rank],
      size, mode, target,
      required: rotate(extra?.required ?? (rank === 1 ? [2] : rank === 3 ? [2, 10, 14] : rank === 4 ? [1, 10] : [])),
      forbidden: rotate(extra?.forbidden ?? (rank === 1 ? [8] : rank === 3 ? [0, 7, 12] : rank === 4 ? [5, 14] : [])),
    }
    const solved = solveCircle(level)
    if (solved.maximum < 0 || (mode !== 'maximize' && !solved.count) ||
        (rank === 2 && solved.count !== kaplansky(size, target))) throw new Error('Invalid circle challenge.')
    return level
  },
  initial: level => ({ chosen: [...level.required], answer: '' }),
  apply(level, state, action) {
    if (action.type === 'answer') {
      return level.mode === 'count' && /^\d{0,9}$/.test(action.value) && state.answer !== action.value
        ? { ...state, answer: action.value } : state
    }
    const index = action.index
    if (!isIndex(index, level.size) || level.required.includes(index) || level.forbidden.includes(index)) return state
    const chosen = state.chosen.includes(index) ? state.chosen.filter(value => value !== index) : [...state.chosen, index]
    return { ...state, chosen }
  },
  validate(level, state) {
    if (!validChoice(level, state.chosen)) return pending('Sửa các vị trí được đánh dấu đỏ. Vị trí đầu và cuối cũng kề nhau.')
    const solution = solveCircle(level)
    const target = level.mode === 'maximize' ? solution.maximum : level.target
    if (state.chosen.length !== target) return pending(level.mode === 'maximize'
      ? 'Vẫn có một cấu hình chọn được nhiều vị trí hơn.'
      : 'Hãy chọn đúng số vị trí theo mục tiêu.')
    if (level.mode === 'count' && (!state.answer || Number(state.answer) !== solution.count)) return pending('Cấu hình mẫu hợp lệ. Hãy kiểm tra lại tổng số cấu hình.')
    return won(level.mode === 'count' ? 'Bạn đã dựng được cấu hình mẫu và đếm đúng.' : 'Cấu hình của bạn đạt mục tiêu.')
  },
  solve: solveCircle,
  hint(level, _state, tier) {
    if (tier === 1) return 'Theo dõi cặp ở hai đầu dãy nhãn. Chúng nối nhau qua đường tròn.'
    if (tier === 2) return level.required.length || level.forbidden.length
      ? 'Loại vị trí cấm và hàng xóm của các vị trí bắt buộc. Các vị trí tự do còn lại tạo thành những đoạn rời nhau.'
      : 'Hãy biểu diễn khoảng trống sau mỗi vị trí đã chọn. Mỗi khoảng phải chứa ít nhất một vị trí trống.'
    if (level.mode === 'maximize') return 'Trên một đoạn dài m, chia thành các cặp liền nhau. Mỗi cặp cho tối đa một vị trí, cộng thêm một nếu m lẻ.'
    if (level.required.length || level.forbidden.length) return 'Nếu chọn j vị trí trên đoạn dài m thì có C(m−j+1, j) cách. Cộng theo cách phân bổ j giữa các đoạn.'
    return 'Đếm các cấu hình có đánh dấu một trong k vị trí đã chọn. Có n cách đặt dấu đầu tiên, sau đó đếm khoảng trống. Cuối cùng chia cho k.'
  },
  explain(level) {
    const solution = solveCircle(level)
    if (level.mode === 'maximize') return 'Sau khi chọn các vị trí bắt buộc, bỏ các vị trí cấm và mọi hàng xóm của vị trí bắt buộc. Trên mỗi đoạn m vị trí còn lại, ghép thành từng cặp kề nhau để được cận trên ⌈m/2⌉. Chọn xen kẽ đạt cận. Tổng tối đa là ' + solution.maximum + '.'
    if (!level.required.length && !level.forbidden.length) return 'Với n vị trí có nhãn và k vị trí được chọn, đánh dấu một vị trí được chọn rồi đếm k khoảng trống dương có tổng n−k. Mỗi cấu hình được đếm k lần. Kết quả là n/(n−k) × C(n−k,k) = ' + solution.count + '.'
    return 'Sau khi cố định các ghế bắt buộc, bỏ hàng xóm của chúng và các ghế cấm. Mỗi đoạn dài m đóng góp C(m−j+1,j) cấu hình chọn j ghế. Nhân theo các đoạn rồi cộng theo mọi phân bổ j có tổng thích hợp, được ' + solution.count + ' cấu hình.'
  },
}

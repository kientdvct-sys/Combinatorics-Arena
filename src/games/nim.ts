import { isIndex, pending, range, seeded, won } from '../engine/core'
import type { Challenge, Game } from '../engine/core'
import { campaignVariant } from '../engine/campaign'
import { extraTitles } from './bank'
import { nimTask } from '../engine/lessons'

export type NimRule = 'normal' | 'misere' | 'bounded'
export interface NimLevel extends Challenge { piles: number[]; rule: NimRule; limit: number }
export interface NimMove { pile: number; take: number }
export interface NimState { piles: number[]; winner: 'player' | 'ai' | null; reply: NimMove | null }

export const nimSum = (piles: number[]) => piles.reduce((sum, size) => sum ^ size, 0)
export function winningNim(level: Pick<NimLevel, 'rule' | 'limit'>, piles: number[]) {
  if (level.rule === 'misere' && piles.every(size => size <= 1)) return nimSum(piles) === 0
  // The Grundy value of a heap with legal moves 1…limit is its remainder modulo limit + 1.
  const grundy = level.rule === 'bounded' ? piles.map(size => size % (level.limit + 1)) : piles
  return nimSum(grundy) !== 0
}

const moveSize = (level: NimLevel, size: number) => level.rule === 'bounded' ? Math.min(level.limit, size) : size

function subtract(piles: number[], move: NimMove) {
  return piles.map((size, pile) => pile === move.pile ? size - move.take : size)
}

function candidates(level: NimLevel, piles: number[]): NimMove[] {
  return piles.flatMap((size, pile) => range(moveSize(level, size)).map(index => ({ pile, take: index + 1 })))
}

export function optimalNim(level: NimLevel, piles: number[]): { winning: boolean; move: NimMove | null } {
  const first = piles.findIndex(size => size > 0)
  if (first < 0) return { winning: level.rule === 'misere', move: null }
  if (level.rule === 'normal') {
    const sum = nimSum(piles)
    const pile = piles.findIndex(size => (size ^ sum) < size)
    return pile < 0
      ? { winning: false, move: { pile: first, take: 1 } }
      : { winning: true, move: { pile, take: piles[pile] - (piles[pile] ^ sum) } }
  }

  const moves = candidates(level, piles)
  const move = moves.find(move => !winningNim(level, subtract(piles, move)))
  return { winning: Boolean(move), move: move ?? moves[0] }
}

export const nim: Game<NimState, NimMove, NimLevel, ReturnType<typeof optimalNim>> = {
  generate(seed, rank) {
    const roll = seeded('nim:' + seed)
    const variant = campaignVariant(seed)
    const rule = rank === 3 ? 'misere' : rank === 4 ? 'bounded' : 'normal'
    const limit = rule === 'bounded' ? [3, 2, 4, 5][variant] : 99
    const setups = [
      [[1, 3, 5], [2, 3, 4], [2, 5, 6]],
      [[2, 4, 6, 9], [1, 5, 7, 8], [2, 4, 4, 8]],
      [[3, 4, 5, 7, 11], [1, 3, 6, 7, 8, 10], [2, 7, 8, 12, 16]],
      [[1, 1, 1, 4], [1, 1, 2, 3], [1, 2, 2, 5]],
      [[2, 3, 4, 5], [2, 4, 6, 7], [2, 5, 6, 8]],
    ]
    const opening = setups[rank][variant - 1]
    const level: NimLevel = {
      title: extraTitles.nim[rank][variant - 1] ?? ['Nước đi mở màn', 'Giữ thế sau mỗi lượt', 'Cân bằng nhiều đống', 'Viên đá cuối', 'Giới hạn lượt lấy'][rank],
      goal: nimTask(rule),
      complexity: ['Nhận ra thế XOR bằng 0.', 'Tính XOR và duy trì thế cân bằng qua nhiều lượt.', 'Phân tích nhiều đống và các lựa chọn cùng lúc.', 'Luật misère đảo kết quả ở lượt cuối.', 'Xét phần dư theo modulo ' + (limit + 1) + ' để tìm các thế thua lặp lại.'][rank],
      piles: opening ? [...opening] : seed === 'arena' && rank === 0 ? [1, 2, 4] :
        range([3, 4, 5, 4, 5][rank]).map(() => roll.integer(2, [4, 7, 11, 5, 7][rank])),
      rule, limit,
    }
    if (!optimalNim(level, level.piles).winning) {
      // Hai kích thước liên tiếp thuộc hai lớp khác nhau trong cả ba bộ luật này.
      level.piles[0]++
    }
    if (!optimalNim(level, level.piles).winning) throw new Error('Nim generation produced a losing opening.')
    return level
  },
  initial(level) { return { piles: [...level.piles], winner: null, reply: null } },
  apply(level, state, move) {
    if (state.winner || !isIndex(move.pile, state.piles.length) ||
        !Number.isInteger(move.take) || move.take < 1 || move.take > moveSize(level, state.piles[move.pile])) return state
    const next = subtract(state.piles, move)
    if (!next.some(Boolean)) return { piles: next, winner: level.rule === 'misere' ? 'ai' : 'player', reply: null }
    const reply = optimalNim(level, next).move!
    const piles = subtract(next, reply)
    return { piles, winner: piles.some(Boolean) ? null : level.rule === 'misere' ? 'player' : 'ai', reply }
  },
  validate(_level, state) {
    if (state.winner === 'player') return won('Bạn đã thắng AI.')
    if (state.winner === 'ai') return { status: 'lost', message: 'AI thắng ván này. Bạn có thể hoàn tác hoặc thử lại.' }
    return pending('Ván đấu đang diễn ra. Hãy chọn một đống và lấy đá.')
  },
  solve: optimalFromState,
  hint(level, state, tier) {
    if (tier === 1) return level.rule === 'misere' ? 'Thử hình dung lượt ngay trước khi hết đá. Bạn muốn để lại đúng một viên cho máy.'
      : 'Hãy hình dung nước đáp của máy sau mỗi lựa chọn. Nếu nước của bạn để lại đúng một đống mà máy có thể lấy hết, máy sẽ thắng.'
    if (tier === 2) {
      if (level.rule === 'normal') return 'Ở Nim thường, XOR bằng 0 là thế thua của người sắp đi nếu đối thủ chơi tối ưu.'
      if (level.rule === 'misere') return 'Khi mỗi đống còn đúng một viên, người sắp đi thua nếu số đống lẻ.'
      return 'Với một đống, xét phần dư của số đá khi chia cho ' + (level.limit + 1) + '.'
    }
    const solution = optimalFromState(level, state)
    return solution.winning && solution.move
      ? 'Một hướng đi có lợi là giảm đống ' + (solution.move.pile + 1) + '. Tự tìm số viên cần lấy.'
      : 'AI có thể giữ lợi thế từ thế này. Hãy xem lại nước đi trước bằng Hoàn tác.'
  },
  explain(level) {
    if (level.rule === 'normal') return 'XOR là cách cộng các chữ số nhị phân mà không nhớ. Ví dụ nếu còn hai đống có cùng số đá, XOR bằng 0. Bạn có thể đáp lại bằng cách lấy đúng số viên máy vừa lấy ở đống kia. Với nhiều đống, tìm nước đi đưa XOR về 0 sau lượt của bạn.'
    if (level.rule === 'misere') return 'Thế rỗng là thế thắng cho người kế tiếp vì đối thủ vừa lấy viên cuối. Xét lùi từ đó, một thế là thắng nếu có ít nhất một nước sang thế thua. Khi chỉ còn các đống một viên, hãy để lại số đống lẻ cho đối thủ.'
    const modulus = level.limit + 1
    return 'Với một đống, bội số ' + modulus + ' là thế thua vì có thể bù mỗi nước của đối thủ cho đủ ' + modulus +
      '. Với nhiều đống, XOR các phần dư theo modulo ' + modulus + ' cho giá trị Grundy. Sau nước đi, tổng Grundy bằng 0 là thế thua cho đối thủ nếu cả hai chơi tối ưu.'
  },
}

function optimalFromState(level: NimLevel, state: NimState) {
  return optimalNim(level, state.piles)
}

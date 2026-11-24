import type { BinaryLevel } from '../games/binary'
import type { CircleLevel } from '../games/circle'
import type { DominoLevel } from '../games/domino'
import type { GraphLevel } from '../games/graph'
import type { NimLevel } from '../games/nim'

export interface Lesson {
  setup: string
  task: string
  rules: string[]
  steps: string[]
  example: string
}

export type ArenaLevel = NimLevel | CircleLevel | GraphLevel | DominoLevel | BinaryLevel

export function describeLesson(level: ArenaLevel): Lesson {
  if ('piles' in level) return nimLesson(level)
  if ('required' in level) return circleLesson(level)
  if ('locked' in level) return graphLesson(level)
  if ('holes' in level) return dominoLesson(level)
  return binaryLesson(level)
}

export function nimTask(rule: NimLevel['rule']) {
  return rule === 'misere' ? 'Hãy chơi sao cho máy phải lấy viên đá cuối cùng.' : 'Hãy lấy viên đá cuối cùng để thắng máy.'
}

export function nimLesson(level: NimLevel): Lesson {
  return {
    setup: `Bạn đi trước và thay phiên lấy đá với máy. Lúc bắt đầu có ${level.piles.length} đống đá, lần lượt chứa ${level.piles.join(', ')} viên.`,
    task: nimTask(level.rule),
    rules: [
      'Mỗi lượt, chọn đúng một đống còn đá.',
      level.rule === 'bounded' ? `Lấy ít nhất 1 viên và nhiều nhất ${level.limit} viên, trong số đá còn lại của đống đã chọn.`
        : 'Lấy ít nhất một viên. Bạn có thể lấy hết đống đó trong một lượt.',
      level.rule === 'misere' ? 'Ai lấy viên cuối cùng trên bàn sẽ thua.' : 'Ai lấy viên cuối cùng trên bàn sẽ thắng.',
    ],
    steps: [
      'Bấm vào đống bạn muốn lấy đá rồi dùng + hoặc − để chọn số viên.',
      'Bấm nút «Lấy … viên». Máy sẽ tự chơi lượt tiếp theo.',
      'Khi trên bàn hết đá, bấm «Kiểm tra».',
    ],
    example: level.rule === 'misere'
      ? 'Nếu trên bàn còn đúng một viên và đến lượt bạn, bạn buộc phải lấy viên đó và thua.'
      : 'Nếu trên bàn chỉ còn một đống có hai viên, lấy cả hai sẽ kết thúc ván ngay.',
  }
}

const shownPositions = (positions: number[]) => [...positions].sort((a, b) => a - b).map(index => index + 1).join(', ')

export function circleTask(mode: CircleLevel['mode'], target: number) {
  if (mode === 'maximize') return 'Hãy chọn nhiều ô nhất có thể theo các điều kiện của bài.'
  if (mode === 'count') return `Hãy chọn một nhóm gồm đúng ${target} ô trên bàn, rồi nhập tổng số nhóm ${target} ô chọn được theo cùng các điều kiện.`
  return `Hãy chọn đúng ${target} ô, tránh chọn hai ô đứng sát nhau.`
}

export function circleLesson(level: CircleLevel): Lesson {
  const count = level.mode === 'count'
  const required = shownPositions(level.required)
  const forbidden = shownPositions(level.forbidden)
  return {
    setup: `Có ${level.size} ô đánh số từ 1 đến ${level.size} quanh một vòng kín.`,
    task: circleTask(level.mode, level.target),
    rules: [
      level.mode === 'construct' ? `Ô ${level.size} và ô 1 cũng đứng cạnh nhau.`
        : `Không chọn cùng lúc hai ô đứng sát nhau, kể cả ô ${level.size} và ô 1.`,
      ...(required ? [`Ô có chấm vàng (${required}) đã được chọn sẵn và tính vào tổng.`] : []),
      ...(forbidden ? [`Dấu × ở ô ${forbidden} báo không được chọn. Ô cấm vẫn giữ nguyên chỗ trên vòng.`] : []),
      ...(count ? ['Đếm tất cả nhóm hợp lệ, kể cả nhóm làm mẫu. Chọn cùng các số theo thứ tự khác nhau vẫn là một nhóm.'] : []),
    ],
    steps: [
      'Bấm vào một ô để chọn. Bấm lại ô đó để bỏ chọn.',
      'Nếu thấy đường đỏ nối hai ô đã chọn, bỏ một trong hai ô.',
      count ? 'Giữ nhóm mẫu trên bàn, nhập số nhóm vào ô bên dưới rồi bấm «Kiểm tra».'
        : 'Khi chọn xong, bấm «Kiểm tra».',
    ],
    example: level.size >= 5
      ? 'Xét ba ô liên tiếp 2, 3, 4. Ô 2 và ô 3 đứng sát nhau. Ô 2 và ô 4 có ô 3 nằm giữa, kể cả khi ô 3 mang dấu ×.'
      : 'Hãy xét cả đường nối từ ô mang số lớn nhất về ô 1 khi kiểm tra một cặp.',
  }
}

export const graphTask = 'Hãy tô hết các chấm bằng ít màu khác nhau nhất có thể.'

export function graphLesson(level: GraphLevel): Lesson {
  const locked = Object.keys(level.locked).map(Number)
  return {
    setup: `Bàn có ${level.size} chấm được nối với nhau theo sơ đồ. Bạn có ${level.palette} màu để chọn.`,
    task: graphTask,
    rules: [
      'Hai chấm có một đường nối trực tiếp phải khác màu. Hai chấm không nối trực tiếp có thể dùng chung màu.',
      ...(locked.length ? [`Giữ màu đã có ở ${locked.length === 1 ? 'chấm' : 'các chấm'} ${shownPositions(locked)} có biểu tượng ổ khóa.`] : []),
      'Game đếm số màu khác nhau trên bàn, gồm cả màu đã có sẵn. Nhiều chấm cùng màu chỉ tính là một màu.',
    ],
    steps: [
      'Chọn màu trong bảng rồi bấm vào chấm để tô. Chọn cục tẩy để xóa màu.',
      'Nếu thấy đường đỏ, đổi màu ở một đầu còn chỉnh được.',
      'Khi tất cả các chấm đã có màu và bạn đã giảm số màu đến mức thấp nhất, bấm «Kiểm tra».',
    ],
    example: 'Nếu đường chỉ nối 1 với 2 và 2 với 3, bạn có thể tô 1 và 3 cùng màu vì giữa chúng không có đường nối trực tiếp.',
  }
}

export function dominoTask(objective: DominoLevel['objective']) {
  if (objective === 'tile') return 'Hãy phủ kín mọi ô còn nguyên bằng các quân domino.'
  if (objective === 'imbalance') return 'Hãy đánh dấu các ô bị khoét, rồi chọn màu còn nhiều ô nguyên hơn.'
  return 'Hãy chọn một nhóm ô cùng màu có số ô kề ít hơn số ô trong nhóm.'
}

export function dominoLesson(level: DominoLevel): Lesson {
  const board = `Bàn có ${level.rows} hàng, ${level.cols} cột và ${level.holes.length} ô bị khoét có dấu ×.`
  if (level.objective === 'tile') return {
    setup: board + ` Còn ${level.rows * level.cols - level.holes.length} ô nguyên để đặt quân.`,
    task: dominoTask(level.objective),
    rules: [
      'Một quân domino phủ đúng hai ô chung cạnh, theo hàng ngang hoặc cột dọc.',
      'Mỗi ô nguyên phải được phủ đúng một lần. Chừa trống các ô ×.',
    ],
    steps: [
      'Xoay quân sang hướng bạn muốn. Bấm ô bên trái để đặt ngang hoặc ô phía trên để đặt dọc.',
      'Bấm một quân đã đặt để gỡ. Khi phủ hết các ô còn lại, bấm «Kiểm tra».',
    ],
    example: 'Đặt ngang từ ô hàng 2, cột 1 sẽ phủ thêm ô hàng 2, cột 2.',
  }
  if (level.objective === 'imbalance') return {
    setup: board + ' Khi bật «Tô hai màu», mỗi ô nguyên mang chữ A hoặc B. Hai ô chung cạnh khác màu, nên một quân đặt xuống luôn dùng đúng một ô A và một ô B.',
    task: dominoTask(level.objective),
    rules: [
      'Đánh dấu đủ các ô mang dấu ×.',
      'Chỉ đếm những ô còn nguyên khi so sánh hai màu. Màu nào nhiều hơn thì sẽ còn ô thừa khi ghép.',
    ],
    steps: [
      'Bấm «Tô hai màu». Nhìn chú giải để nhận biết màu A và màu B.',
      'Bấm đánh dấu tất cả ô bị khoét có dấu ×. Đếm số ô A và ô B còn nguyên.',
      'Bấm tên màu có nhiều ô còn lại hơn rồi bấm «Kiểm tra».',
    ],
    example: 'Nếu còn 7 ô A và 5 ô B, bạn chọn màu A. Mỗi quân cần một ô B, nên có nhiều nhất 5 quân và sẽ thừa ít nhất 2 ô A.',
  }
  return {
    setup: board + ' Một quân domino ghép hai ô nguyên có chung cạnh. Bạn cần chỉ ra một nhóm ô cùng màu không có đủ ô bên cạnh để ghép hết.',
    task: dominoTask(level.objective),
    rules: [
      'Bật «Tô hai màu». Nhóm bạn chọn, gọi là S, chỉ gồm ô nguyên mang cùng một chữ A hoặc B.',
      'Đánh dấu mọi ô nguyên nằm ngay trên, dưới, trái hoặc phải của ít nhất một ô trong nhóm. Tập các ô này gọi là N(S).',
      'Mỗi ô kề chỉ tính một lần, kể cả khi giáp nhiều ô trong nhóm. Bạn đạt yêu cầu khi số ô kề ít hơn số ô trong nhóm.',
    ],
    steps: [
      'Bật «Tô hai màu», sau đó bấm «Chọn S» và đánh dấu nhóm ô.',
      'Bấm «Chọn N(S)» rồi đánh dấu đầy đủ các ô kề của nhóm.',
      'So sánh hai bộ đếm. Khi số ô hàng xóm ít hơn số ô trong S, bấm «Kiểm tra».',
    ],
    example: 'Nếu ba ô cùng màu chỉ có chung hai ô hàng xóm để ghép, ít nhất một trong ba ô sẽ không có ô ghép riêng.',
  }
}

export function binaryTask(requireOptimal: boolean, optimum: number) {
  return requireOptimal ? `Hãy tắt hết đèn bằng đúng ${optimum} lần bấm ô.` : 'Hãy tắt hết đèn trên bàn.'
}

export function binaryLesson(level: BinaryLevel): Lesson {
  const lit = level.lights.filter(Boolean).length
  return {
    setup: `Bàn có ${level.size} hàng và ${level.size} cột đèn. Lúc bắt đầu có ${lit} đèn sáng.`,
    task: binaryTask(level.requireOptimal, level.optimum),
    rules: [
      'Bạn được bấm cả ô sáng lẫn ô tối. Mỗi lần bấm ảnh hưởng đến chính ô đó và các ô ngay trên, dưới, trái, phải còn nằm trong bàn.',
      'Mỗi đèn bị ảnh hưởng sẽ đổi trạng thái. Đèn đang sáng sẽ tắt, đèn đang tắt sẽ sáng.',
    ],
    steps: [
      'Bấm vào một ô và xem những đèn nào đổi trạng thái. Dùng «Hoàn tác» nếu muốn quay lại.',
      level.requireOptimal ? 'Khi tất cả đèn đã tắt và số lần bấm đúng như đề yêu cầu, bấm «Kiểm tra».'
        : 'Khi bộ đếm báo 0 đèn đang bật, bấm «Kiểm tra».',
    ],
    example: 'Bấm ô góc trên trái sẽ đổi đúng ba đèn, gồm ô góc, ô bên phải và ô bên dưới.',
  }
}

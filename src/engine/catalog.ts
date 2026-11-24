import { Binary, CircleDot, Dices, Network, PanelsTopLeft } from 'lucide-react'

export const modes = [
  { id: 'nim', name: 'Nim Arena', label: 'LÝ THUYẾT TRÒ CHƠI', color: '#64e2c8', icon: Dices,
    summary: 'Đấu trí với AI, từng viên đá một. Tìm thế thắng và giữ quyền kiểm soát đến lượt cuối.',
    rule: 'Mỗi lượt chỉ được lấy đá từ một đống. Luật của màn cho biết ai thắng khi lấy viên cuối và số viên tối đa mỗi lượt.',
    math: 'XOR, thế thắng và thế thua', note: 'Trong Nim thường, tổng XOR bằng 0 đặc trưng cho thế thua khi hai bên chơi tối ưu. Luật misère và giới hạn lượt lấy được giải bằng truy hồi thế cờ.' },
  { id: 'circle', name: 'Forbidden Circle', label: 'TỔ HỢP', color: '#beabff', icon: CircleDot,
    summary: 'Chọn vị trí quanh vòng tròn dưới các điều kiện cấm, bắt buộc và tối ưu.',
    rule: 'Bấm số trên vòng để chọn chỗ, bấm lại để bỏ. Hai ô nối liền trên vòng không được cùng chọn. Ô cấm vẫn có số và vẫn chiếm một chỗ.',
    math: 'Kaplansky và tập độc lập', note: 'Số cách chọn k vị trí không kề nhau trong n vị trí vòng tròn có nhãn là n/(n−k) × C(n−k,k) với 0 ≤ k ≤ ⌊n/2⌋.' },
  { id: 'graph', name: 'Graph Coloring', label: 'LÝ THUYẾT ĐỒ THỊ', color: '#f0c279', icon: Network,
    summary: 'Tô màu các đỉnh sao cho mọi cạnh đều hợp lệ và tổng số màu nhỏ nhất.',
    rule: 'Chọn một màu, sau đó bấm vào đỉnh để tô. Cạnh đỏ nối hai đỉnh cùng màu. Đỉnh bị khóa giữ nguyên màu.',
    math: 'Số sắc và cận dưới', note: 'Một chu trình lẻ cần ít nhất ba màu. Bộ giải dùng DSATUR để ưu tiên đỉnh khó tô và kiểm tra chính xác mọi mức màu nhỏ hơn.' },
  { id: 'domino', name: 'Domino Invariant', label: 'BẤT BIẾN & CHỨNG MINH', color: '#f492af', icon: PanelsTopLeft,
    summary: 'Phủ bàn khuyết bằng domino hoặc dựng chứng minh rằng không thể phủ kín.',
    rule: 'Mỗi quân domino phủ hai ô chung cạnh. Bài có thể yêu cầu phủ kín bàn hoặc đánh dấu các ô để chỉ ra vì sao không thể phủ.',
    math: 'Tô hai màu, ghép cặp và định lý Hall', note: 'Mỗi domino phủ một ô mỗi màu. Cân bằng màu chỉ là điều kiện cần. Nếu một tập ô cùng màu có quá ít hàng xóm, định lý Hall loại trừ mọi cách phủ.' },
  { id: 'binary', name: 'Binary Matrix', label: 'ĐẠI SỐ GF(2)', color: '#8cbcff', icon: Binary,
    summary: 'Đổi trạng thái đèn theo hàng xóm và tìm chuỗi thao tác tối ưu.',
    rule: 'Bấm một ô để đổi trạng thái đèn tại ô đó và các ô ngay trên, dưới, trái, phải còn nằm trong bàn. Mục tiêu là tắt hết đèn.',
    math: 'Khử Gauss modulo 2', note: 'Hệ Ax=b mô tả mọi lời giải. Các biến tự do sinh những cách bấm khác nhau. Đếm số bit 1 của từng nghiệm cho số lần bấm tối thiểu.' },
] as const

export type ModeId = typeof modes[number]['id']
export type ModeInfo = typeof modes[number]
export function modeById(id: string) { return modes.find(mode => mode.id === id) }

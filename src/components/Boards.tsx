import { useState } from 'react'
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Eraser, Grid2X2, Lightbulb, LockKeyhole, Minus, Plus, RotateCw, X } from 'lucide-react'
import { range } from '../engine/core'
import { isRecord } from '../engine/storage'
import { numericAction } from '../engine/session'
import { adjacent } from '../games/circle'
import { conflicts, palette } from '../games/graph'
import { parity } from '../games/domino'
import type { NimLevel, NimMove, NimState } from '../games/nim'
import type { CircleAction, CircleLevel, CircleState } from '../games/circle'
import type { GraphAction, GraphLevel, GraphState } from '../games/graph'
import type { DominoAction, DominoLevel, DominoState } from '../games/domino'
import type { BinaryLevel, BinaryState } from '../games/binary'

export interface BoardProps<S, A, L> {
  level: L
  state: S
  dispatch: (action: A) => boolean
  disabled: boolean
}

export function parseCircle(raw: unknown): CircleAction | undefined {
  if (!isRecord(raw)) return
  if (raw.type === 'answer' && typeof raw.value === 'string') return { type: 'answer', value: raw.value }
  const parsed = numericAction(raw, ['index'])
  if (parsed && raw.type === 'toggle') return { type: 'toggle', ...parsed }
}

export function parseDomino(raw: unknown): DominoAction | undefined {
  if (!isRecord(raw)) return
  if (raw.type === 'checker') return { type: 'checker' }
  const parsed = numericAction(raw, ['cell'])
  if (!parsed) return
  if (raw.type === 'place' && typeof raw.vertical === 'boolean') return { type: 'place', ...parsed, vertical: raw.vertical }
  if (raw.type === 'remove' || raw.type === 'mark' || raw.type === 'neighbor' || raw.type === 'side') return { type: raw.type, ...parsed }
}

function activate(event: KeyboardEvent<SVGGElement>, handler: () => void) {
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault()
    handler()
  }
}

export function NimBoard({ level, state, dispatch, disabled }: BoardProps<NimState, NimMove, NimLevel>) {
  const [pile, select] = useState(0)
  const [amount, change] = useState(1)
  const selected = state.piles[pile] ? pile : Math.max(0, state.piles.findIndex(Boolean))
  const maximum = Math.min(state.piles[selected], level.limit)
  const take = maximum ? Math.min(maximum, Math.max(1, amount)) : 0
  const frozen = disabled || Boolean(state.winner)
  return <div className="board-content">
    <div className="board-topline"><span>LƯỢT ĐẤU</span><b>{state.winner ? 'Ván đã kết thúc' : 'Đến lượt bạn'}</b></div>
    <div className="nim-piles" style={{ '--piles': state.piles.length } as CSSProperties}>
      {state.piles.map((count, index) => <button type="button" key={index} className={'nim-pile' + (selected === index && count ? ' selected' : '')}
        aria-label={'Đống ' + (index + 1) + ' · ' + count + ' viên'} aria-pressed={selected === index && !!count}
        disabled={frozen || count === 0} onClick={() => { select(index); change(1) }}>
        <span className="pile-label">ĐỐNG {index + 1}</span>
        <span className="pile-stones"><AnimatePresence initial={false}>
          {range(count).map(stone => <motion.i layout key={stone}
            initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.4 }} transition={{ duration: 0.16 }} />)}
        </AnimatePresence>{count === 0 && <Minus size={24} />}</span>
        <strong>{count}</strong>
      </button>)}
    </div>
    <div className="board-controls">
      <div className="stepper">
        <button type="button" className="icon-btn" aria-label="Bớt một viên" onClick={() => change(take - 1)} disabled={frozen || take <= 1}><Minus size={16} /></button>
        <output aria-label="Số viên lấy">{take}</output>
        <button type="button" className="icon-btn" aria-label="Thêm một viên" onClick={() => change(take + 1)} disabled={frozen || take >= maximum}><Plus size={16} /></button>
      </div>
      <button type="button" className="btn btn-primary" disabled={frozen || !take}
        onClick={() => { dispatch({ pile: selected, take }); change(1) }}>Lấy {take} viên</button>
    </div>
    <p className="board-note" aria-live="polite">{state.reply ? 'AI vừa lấy ' + state.reply.take + ' viên từ đống ' + (state.reply.pile + 1) + '.' : 'Chọn một đống đá để bắt đầu.'}</p>
  </div>
}

function BoardSvg({ children, label }: { children: ReactNode; label: string }) {
  return <svg className="svg-board" viewBox="0 0 460 400" role="group" aria-label={label}>{children}</svg>
}

export function CircleBoard({ level, state, dispatch, disabled }: BoardProps<CircleState, CircleAction, CircleLevel>) {
  const coordinates = range(level.size).map(index => {
    const theta = index * 2 * Math.PI / level.size - Math.PI / 2
    return [230 + 158 * Math.cos(theta), 200 + 158 * Math.sin(theta)]
  })
  const invalid = (index: number) => state.chosen.some(other => adjacent(index, other, level.size))
  const clashes = state.chosen.flatMap((a, index) => state.chosen.slice(index + 1)
    .filter(b => adjacent(a, b, level.size)).map(b => [a, b] as const))
  const chosen = [...state.chosen].sort((a, b) => a - b).map(index => index + 1)
  const nodeRadius = level.size > 14 ? 18 : 22
  return <div className="board-content">
    <BoardSvg label="Bàn vòng tròn">
      <circle cx="230" cy="200" r="158" className="board-guide" />
      <circle cx="230" cy="200" r="116" className="board-guide board-guide-dash" />
      <text x="230" y="203" className="svg-tally">{level.mode === 'maximize' ? chosen.length : chosen.length + '/' + level.target}</text>
      <text x="230" y="231" className="svg-caption">VỊ TRÍ ĐÃ CHỌN</text>
      {clashes.map(([a, b]) =>
        <line key={a + ':' + b} x1={coordinates[a][0]} y1={coordinates[a][1]} x2={coordinates[b][0]} y2={coordinates[b][1]} className="illegal-edge" />)}
      {coordinates.map(([x, y], index) => {
        const selected = state.chosen.includes(index)
        const isLocked = level.required.includes(index)
        const forbidden = level.forbidden.includes(index)
        const inactive = disabled || forbidden || isLocked
        const onClick = () => { if (!inactive) dispatch({ type: 'toggle', index }) }
        return <g transform={'translate(' + x + ',' + y + ')'} key={index}
          className={'svg-node' + (selected ? ' filled' : '') + (selected && invalid(index) ? ' illegal' : '') + (forbidden ? ' forbidden' : '')}
          role="button" tabIndex={inactive ? -1 : 0} aria-pressed={selected} aria-disabled={inactive}
          aria-label={'Vị trí ' + (index + 1) + (isLocked ? ' · bắt buộc' : forbidden ? ' · bị cấm' : '')}
          onClick={onClick} onKeyDown={event => activate(event, onClick)}>
          <circle r={nodeRadius} /><text y="1">{index + 1}</text>
          {forbidden && <text className="forbidden-marker" x={nodeRadius - 3} y={-nodeRadius + 1} aria-hidden="true">×</text>}
          {isLocked && <circle cx={nodeRadius - 3} cy={-nodeRadius + 4} r="5" className="locked-dot" />}
        </g>
      })}
    </BoardSvg>
    <p className="board-note circle-selection" aria-live="polite">
      {chosen.length ? 'Ô đã chọn gồm ' + chosen.join(', ') + '.' : 'Bạn chưa chọn ô nào.'}
      {clashes.length > 0 && <strong> Cặp đứng liền nhau {clashes.map(([a, b]) => (a + 1) + ' và ' + (b + 1)).join(', ')}. Bỏ một ô trong mỗi cặp đỏ.</strong>}
    </p>
    {(level.required.length > 0 || level.forbidden.length > 0) && <div className="board-note board-legend">
      {level.required.length > 0 && <span><span className="legend-dot gold" /> Ô bắt buộc</span>}
      {level.forbidden.length > 0 && <span><b aria-hidden="true">× </b> Ô bị cấm</span>}
    </div>}
    {level.mode === 'count' && <label className="field inline-field">Có tất cả bao nhiêu cách chọn {level.target} ô?
      <input disabled={disabled} inputMode="numeric" maxLength={9} value={state.answer}
        onChange={event => dispatch({ type: 'answer', value: event.target.value })} />
    </label>}
  </div>
}

const colorNames = ['Ngọc', 'Tím', 'Vàng', 'Hồng', 'Lam']

function vertexPosition(level: GraphLevel, vertex: number): [number, number] {
  const wheel = level.layout === 'wheel'
  if (wheel && vertex === level.size - 1) return [230, 202]
  if (level.layout === 'lifted') {
    if (vertex === 10) return [230, 205]
    if (vertex === 11) return [395, 204]
    const inner = vertex >= 5
    const theta = (vertex % 5) * Math.PI * 2 / 5 - Math.PI / 2 + (inner ? Math.PI / 5 : 0)
    const radius = inner ? 86 : 160
    return [215 + radius * Math.cos(theta), 201 + radius * Math.sin(theta)]
  }
  const theta = vertex * Math.PI * 2 / (wheel ? level.size - 1 : level.size) - Math.PI / 2
  return [230 + 158 * Math.cos(theta), 200 + 158 * Math.sin(theta)]
}

export function GraphBoard({ level, state, dispatch, disabled }: BoardProps<GraphState, GraphAction, GraphLevel>) {
  const [activeColor, choose] = useState(0)
  const bad = new Set(conflicts(level.edges, state))
  const positions = range(level.size).map(vertex => vertexPosition(level, vertex))
  return <div className="board-content">
    <div className="board-topline"><span>BẢNG MÀU</span><b>{state.filter(color => color >= 0).length}/{level.size} chấm đã tô · {new Set(state.filter(color => color >= 0)).size} màu</b></div>
    <div className="color-picker" role="group" aria-label="Bảng màu">
      {palette.slice(0, level.palette).map((color, index) => <button type="button" className="color-option"
        key={color} title={colorNames[index]} style={{ '--swatch': color } as CSSProperties}
        aria-label={'Màu ' + colorNames[index]} aria-pressed={activeColor === index} disabled={disabled} onClick={() => choose(index)}>
        {activeColor === index && <Check size={17} />}
      </button>)}
      <button type="button" className="icon-btn eraser" aria-label="Tẩy màu" aria-pressed={activeColor === -1}
        onClick={() => choose(-1)} disabled={disabled}><Eraser size={17} /></button>
    </div>
    <BoardSvg label="Bàn tô màu đồ thị">
      {level.edges.map((edge, index) => {
        const [a, b] = edge
        return <line key={index} x1={positions[a][0]} y1={positions[a][1]} x2={positions[b][0]} y2={positions[b][1]}
          className={bad.has(edge) ? 'illegal-edge' : 'graph-edge'} />
      })}
      {positions.map(([x, y], vertex) => {
        const locked = level.locked[vertex] !== undefined
        const inactive = locked || disabled
        const click = () => { if (!inactive) dispatch({ vertex, color: activeColor }) }
        const color = state[vertex] < 0 ? undefined : palette[state[vertex]]
        return <g transform={'translate(' + x + ',' + y + ')'} key={vertex} role="button" tabIndex={inactive ? -1 : 0}
          style={{ '--node-paint': color } as CSSProperties} className={'svg-node' + (color ? ' painted' : '')}
          aria-label={'Đỉnh ' + (vertex + 1) + (locked ? ' · khóa màu' : '')}
          aria-disabled={inactive} onClick={click} onKeyDown={event => activate(event, click)}>
          <circle r="21" /><text y="1">{vertex + 1}</text>
          {locked && <g transform="translate(11,-25)"><rect width="16" height="16" rx="4" className="lock-chip" /><LockKeyhole x="3" y="3" size={10} /></g>}
        </g>
      })}
    </BoardSvg>
    <p className="board-note" aria-live="polite">{bad.size
      ? bad.size + ' cạnh vi phạm. Đổi màu một đầu của mỗi đường đỏ.'
      : (activeColor < 0 ? 'Đang dùng cục tẩy.' : 'Đang chọn màu ' + colorNames[activeColor] + '. Bấm vào chấm muốn tô.')}</p>
  </div>
}

export function DominoBoard({ level, state, dispatch, disabled }: BoardProps<DominoState, DominoAction, DominoLevel>) {
  const [vertical, setVertical] = useState(false)
  const [proofTool, setProofTool] = useState<'mark' | 'neighbor'>('mark')
  const [message, setMessage] = useState('')
  const proof = level.objective !== 'tile'
  const covered = new Map(state.tiles.flatMap(([a, b], index) => [[a, index], [b, index]]))
  function place(cell: number) {
    const placed = dispatch({ type: 'place', cell, vertical })
    setMessage(placed ? '' : 'Quân domino sẽ đè lên ô đã phủ, ô khuyết hoặc vượt ra ngoài bàn.')
  }
  function click(cell: number) {
    setMessage('')
    if (proof) dispatch({ type: proofTool, cell })
    else if (covered.has(cell)) dispatch({ type: 'remove', cell })
    else place(cell)
  }
  return <div className="board-content">
    <div className="board-topline"><span>{proof ? 'CHỨNG MINH' : 'BÀN DOMINO'}</span><b>{proof ? 'Đánh dấu các ô theo yêu cầu'
      : covered.size + '/' + (level.cols * level.rows - level.holes.length) + ' ô đã phủ'}</b></div>
    <div className="board-controls domino-controls">
      {!proof && <>
        <div className={'domino-tray' + (vertical ? ' vertical' : '')} title="Kéo quân vào ô đầu tiên" aria-hidden="true" draggable={!disabled}
          onDragStart={event => { event.dataTransfer.setData('application/x-arena-domino', '1'); event.dataTransfer.effectAllowed = 'copy' }}><i /><i /></div>
        <button type="button" onClick={() => setVertical(!vertical)} disabled={disabled} className="btn btn-quiet" title={vertical ? 'Đang đặt dọc' : 'Đang đặt ngang'}>
          <RotateCw size={16} /> {vertical ? 'Xoay ngang' : 'Xoay dọc'}
        </button>
      </>}
      <button type="button" className="btn btn-quiet" aria-pressed={state.checkered} disabled={disabled}
        onClick={() => { setMessage(''); dispatch({ type: 'checker' }) }}><Grid2X2 size={16} /> Tô hai màu</button>
    </div>
    {state.checkered && <div className="board-note board-legend"><span className="legend-color color-a">A</span><span className="legend-color color-b">B</span></div>}
    {level.objective === 'hall' && <div className="board-controls proof-tools">
      <button type="button" className="btn btn-quiet" aria-pressed={proofTool === 'mark'} onClick={() => setProofTool('mark')} disabled={disabled}>Chọn S · {state.proof.marks.length}</button>
      <button type="button" className="btn btn-quiet" aria-pressed={proofTool === 'neighbor'} onClick={() => setProofTool('neighbor')} disabled={disabled}>Chọn N(S) · {state.proof.neighbors.length}</button>
    </div>}
    <div className="square-grid domino-grid" style={{ '--cols': level.cols } as CSSProperties}>
      {range(level.cols * level.rows).map(cell => {
        const hole = level.holes.includes(cell)
        const tile = covered.get(cell)
        const marked = state.proof.marks.includes(cell)
        const neighbor = state.proof.neighbors.includes(cell)
        const tileClass = tile === undefined ? '' : ' covered tile-' + tile % 5
        const terrain = hole ? ' hole' : state.checkered ? ' parity-' + parity(level, cell) : ''
        return <button key={cell} type="button" className={'grid-square' + terrain + tileClass + (marked ? ' marked' : '') + (neighbor ? ' neighbor-mark' : '')}
          aria-label={'Ô ' + (Math.floor(cell / level.cols) + 1) + ', ' + (cell % level.cols + 1) + (hole ? ' · khuyết' : '')}
          aria-pressed={proof ? marked || neighbor : tile !== undefined}
          disabled={disabled || (hole && (level.objective !== 'imbalance' || proofTool !== 'mark'))}
          onClick={() => click(cell)}
          onDragOver={event => { if (!proof && !disabled && !hole && event.dataTransfer.types.includes('application/x-arena-domino')) event.preventDefault() }}
          onDrop={event => { event.preventDefault(); if (!proof && !disabled && event.dataTransfer.getData('application/x-arena-domino') === '1') place(cell) }}>
          {hole && <X size={17} />}
          {marked && <b>{level.objective === 'hall' ? 'S' : <Check size={18} />}</b>}
          {neighbor && <b>N</b>}
          {tile !== undefined && state.tiles[tile][0] === cell && <i className="tile-number">{tile + 1}</i>}
        </button>
      })}
    </div>
    {level.objective === 'imbalance' && <div className="board-controls proof-tools">
      {[0, 1].map(side => <button key={side} type="button" className="btn btn-quiet" aria-pressed={state.proof.side === side}
        disabled={disabled} onClick={() => dispatch({ type: 'side', cell: side })}>Màu {side === 0 ? 'A' : 'B'} còn nhiều hơn</button>)}
    </div>}
    <p className={message ? 'board-note invalid-note' : 'board-note'} aria-live="polite">{message || (level.objective === 'hall' ?
      (proofTool === 'mark' ? 'Đang chọn nhóm S. Chỉ đánh dấu các ô cùng màu.' : 'Đang chọn hàng xóm N(S). Đánh dấu các ô có chung cạnh với nhóm S.') :
      level.objective === 'imbalance' ? 'Đã đánh dấu ' + state.proof.marks.length + '/' + level.holes.length + ' ô khuyết.'
        : (vertical ? 'Đặt dọc từ ô phía trên.' : 'Đặt ngang từ ô bên trái.') + ' Bấm domino đã đặt để gỡ.')}</p>
  </div>
}

export function BinaryBoard({ level, state, dispatch, disabled }: BoardProps<BinaryState, number, BinaryLevel>) {
  const lights = state.lights.filter(Boolean).length
  return <div className="board-content">
    <div className="board-topline"><span>{level.size} × {level.size}</span><b>{lights} đèn đang bật{level.requireOptimal ? ' · ' + state.moves + '/' + level.optimum + ' lần bấm' : ''}</b></div>
    <div className="square-grid binary-grid" style={{ '--cols': level.size } as CSSProperties}>
      {state.lights.map((on, cell) => <motion.button type="button" key={cell} className={'grid-square light-square' + (on ? ' light-on' : '')}
        whileTap={{ scale: 0.92 }} aria-label={'Đèn ' + (Math.floor(cell / level.size) + 1) + ', ' + (cell % level.size + 1)}
        aria-pressed={Boolean(on)} disabled={disabled} onClick={() => dispatch(cell)}>
        <Lightbulb size={28} strokeWidth={1.6} aria-hidden="true" />
      </motion.button>)}
    </div>
    <p className="board-note">{level.requireOptimal ? 'Thử giảm số lần bấm. Bấm một ô hai lần triệt tiêu nhau.' : 'Một lần bấm đảo ô hiện tại và các ô kề cạnh.'}</p>
  </div>
}

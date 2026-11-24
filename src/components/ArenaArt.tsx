import type { ModeId } from '../engine/catalog'

export function ArenaArt({ mode }: { mode: ModeId }) {
  return <svg className="arena-art" viewBox="0 0 160 100" fill="none" aria-hidden="true">
    {mode === 'nim' && <>
      <path d="M31 77h98M64 26v51M96 26v51" className="art-lines" />
      {[2, 4, 3].flatMap((height, column) => Array.from({ length: height }, (_, row) =>
        <circle key={column + '-' + row} cx={48 + 32 * column} cy={67 - 13 * row} r="5.5" className="art-marker" />))}
    </>}
    {mode === 'circle' && <>
      <circle cx="80" cy="50" r="34" className="art-lines" />
      {Array.from({ length: 8 }, (_, index) => {
        const angle = index * Math.PI / 4
        return <circle key={index} cx={80 + 34 * Math.cos(angle)} cy={50 + 34 * Math.sin(angle)}
          r="5.5" className={index % 2 ? 'art-muted' : 'art-marker'} />
      })}
    </>}
    {mode === 'graph' && <>
      <path d="M43 65l14-38 47-4 22 41-48 14-35-13 61-42-26 55-21-51 69 37" className="art-lines" />
      <circle cx="43" cy="65" r="7" className="art-marker" /><circle cx="57" cy="27" r="7" className="art-secondary" />
      <circle cx="104" cy="23" r="7" className="art-marker" /><circle cx="126" cy="64" r="7" className="art-secondary" />
      <circle cx="78" cy="78" r="7" className="art-muted" />
    </>}
    {mode === 'domino' && <>
      <path d="M48 18h64v64H48zM48 34h64M48 50h64M48 66h64M64 18v64M80 18v64M96 18v64" className="art-lines" />
      <rect x="49" y="19" width="30" height="14" rx="4" className="art-marker" />
      <rect x="97" y="35" width="14" height="30" rx="4" className="art-secondary" />
      <rect x="65" y="51" width="14" height="30" rx="4" className="art-marker" />
      <path d="m83 37 10 10m0-10-10 10m-31 22 10 10m0-10L52 79" className="art-lines" />
    </>}
    {mode === 'binary' && [true, false, true, true, true, false, false, true, true].map((on, index) =>
      <rect key={index} x={48 + index % 3 * 22} y={18 + Math.floor(index / 3) * 22} width="20" height="20" rx="5"
        className={on ? 'art-marker' : 'art-muted'} />)}
  </svg>
}

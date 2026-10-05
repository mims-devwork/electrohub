import { useEffect, useState } from 'react'
import type { WidgetProps } from './types'

// Battery 9 V → R1 1kΩ → R2 1kΩ → R3 1kΩ → back. Points A..D around the loop.
const POINTS = [
  { id: 'A', x: 140, y: 60, v: 9, note: 'Straight after the battery’s +: the full 9 V.' },
  { id: 'B', x: 420, y: 60, v: 6, note: 'After one resistor: 3 V has been “used up” pushing current through it.' },
  { id: 'C', x: 600, y: 225, v: 3, note: 'After two resistors: another 3 V has dropped.' },
  { id: 'D', x: 140, y: 290, v: 0, note: 'Back at the battery’s −. This is ground, 0 V.' },
] as const

export function GroundProbe({ onEvent }: WidgetProps) {
  const [probe, setProbe] = useState<string | null>(null)
  const [visited, setVisited] = useState<string[]>([])
  const [groundAt, setGroundAt] = useState<'D' | 'B'>('D')
  const groundV = POINTS.find((p) => p.id === groundAt)!.v
  const current = POINTS.find((p) => p.id === probe)

  useEffect(() => {
    if (visited.length >= POINTS.length) onEvent('probed-all')
  }, [visited, onEvent])

  const click = (id: string) => {
    setProbe(id)
    setVisited((v) => (v.includes(id) ? v : [...v, id]))
  }

  return (
    <div className="grid gap-4 rounded-2xl border border-ink-700 bg-ink-900 p-4 md:grid-cols-[1fr_220px]">
      <svg viewBox="0 0 640 340" className="w-full">
        {/* loop */}
        <path d="M 80 110 L 80 60 L 600 60 L 600 290 L 80 290 L 80 240" fill="none" stroke="#d08b4a" strokeWidth="5" strokeLinejoin="round" />
        {/* battery */}
        <rect x="50" y="110" width="60" height="130" rx="8" fill="#18181b" stroke="#475569" />
        <rect x="50" y="110" width="60" height="38" rx="8" fill="#b9802f" />
        <text x="80" y="134" textAnchor="middle" fill="#0b1120" fontWeight="800">
          +
        </text>
        <text x="80" y="225" textAnchor="middle" fill="#7cc4ff" fontWeight="800" fontSize="20">
          −
        </text>
        <text x="80" y="190" textAnchor="middle" fill="#fbbf24" fontSize="13" fontFamily="JetBrains Mono">
          9V
        </text>
        {/* resistors */}
        {[
          { x: 250, y: 60, rot: 0 },
          { x: 600, y: 140, rot: 90 },
          { x: 380, y: 290, rot: 0 },
        ].map((r, i) => (
          <g key={i}>
            <g transform={`translate(${r.x} ${r.y}) rotate(${r.rot})`}>
              <rect x="-38" y="-13" width="76" height="26" rx="10" fill="#d8c39b" stroke="#a08660" />
              {[-20, -8, 4, 22].map((bx, j) => (
                <rect key={j} x={bx} y="-13" width="6" height="26" fill={['#7a4a1e', '#111', '#d42a2a', '#c9a227'][j]} />
              ))}
            </g>
            <text x={r.rot ? r.x - 26 : r.x} y={r.rot ? r.y + 4 : r.y + 32} textAnchor={r.rot ? 'end' : 'middle'} fill="#a9b8d0" fontSize="12">
              1 kΩ
            </text>
          </g>
        ))}
        {/* ground symbol */}
        <g transform={`translate(${POINTS.find((p) => p.id === groundAt)!.x} ${POINTS.find((p) => p.id === groundAt)!.y})`}>
          <line x1="0" y1="0" x2="0" y2={groundAt === 'D' ? 22 : -22} stroke="#38bdf8" strokeWidth="2" />
          <g transform={`translate(0 ${groundAt === 'D' ? 22 : -22})`}>
            <line x1="-14" x2="14" y1="0" y2="0" stroke="#38bdf8" strokeWidth="2.5" />
            <line x1="-9" x2="9" y1={groundAt === 'D' ? 6 : -6} y2={groundAt === 'D' ? 6 : -6} stroke="#38bdf8" strokeWidth="2.5" />
            <line x1="-4" x2="4" y1={groundAt === 'D' ? 12 : -12} y2={groundAt === 'D' ? 12 : -12} stroke="#38bdf8" strokeWidth="2.5" />
          </g>
        </g>
        {POINTS.map((p) => (
          <g key={p.id} onClick={() => click(p.id)} className="cursor-pointer" role="button" aria-label={`Measure point ${p.id}`}>
            <circle cx={p.x} cy={p.y} r="16" fill={probe === p.id ? '#f43f5e' : visited.includes(p.id) ? '#1c2742' : '#0b1120'} stroke="#f43f5e" strokeWidth="2.5" />
            <text x={p.x} y={p.y + 5} textAnchor="middle" fill="#fff" fontWeight="700" fontSize="14">
              {p.id}
            </text>
          </g>
        ))}
      </svg>
      <div className="space-y-3">
        <div className="rounded-xl border border-ink-600 bg-ink-950 p-3 text-center">
          <div className="text-[10px] uppercase tracking-wider text-fog-400">Multimeter</div>
          <div className="mt-1 font-mono text-3xl text-volt">{current ? `${(current.v - groundV).toFixed(1)} V` : '— V'}</div>
          <div className="mt-1 text-[11px] text-fog-400">
            red probe: <span className="text-danger">{probe ?? 'not placed'}</span> · black: <span className="text-flow">ground ({groundAt})</span>
          </div>
        </div>
        {current && <p className="text-sm text-fog-300">{groundAt === 'D' ? current.note : 'Same circuit, same electricity. Only the reference point moved, so every reading shifts by 6 V.'}</p>}
        <div className="text-xs text-fog-400">Measured {visited.length} / 4</div>
        {visited.length >= 4 && (
          <button
            onClick={() => setGroundAt((g) => (g === 'D' ? 'B' : 'D'))}
            className="w-full rounded-lg border border-flow/40 bg-flow/10 px-3 py-2 text-sm text-flow hover:bg-flow/20"
          >
            {groundAt === 'D' ? 'Bonus: move ground to point B' : 'Put ground back at D'}
          </button>
        )}
      </div>
    </div>
  )
}

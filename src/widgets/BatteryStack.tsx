import { useEffect, useState } from 'react'
import { Button } from '../ui/primitives'
import type { WidgetProps } from './types'

const MAX = 6

function Cell({ flipped, onClick }: { flipped: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group shrink-0" title="Click to flip this cell" aria-label={flipped ? 'Flipped cell, click to flip back' : 'Cell, click to flip'}>
      <svg viewBox="0 0 120 44" className="h-11 w-[104px] transition-transform group-hover:-translate-y-0.5">
        <g transform={flipped ? 'translate(120 0) scale(-1 1)' : undefined}>
          <rect x="4" y="6" width="104" height="32" rx="6" fill={flipped ? '#3f1d2b' : '#1f2937'} stroke={flipped ? '#f43f5e' : '#475569'} />
          <rect x="74" y="6" width="34" height="32" rx="6" fill="#b9802f" />
          <rect x="108" y="15" width="8" height="14" rx="2" fill="#c9ced6" />
        </g>
        <text x={flipped ? 98 : 22} y="27" fill="#e8eef7" fontSize="14" fontWeight="700" textAnchor="middle">
          {flipped ? '−' : '−'}
        </text>
        <text x={flipped ? 22 : 98} y="27" fill="#0b1120" fontSize="15" fontWeight="800" textAnchor="middle">
          +
        </text>
        <text x="60" y="27" fill="#a9b8d0" fontSize="11" textAnchor="middle">
          1.5V
        </text>
      </svg>
    </button>
  )
}

export function BatteryStack({ onEvent }: WidgetProps) {
  const [cells, setCells] = useState<boolean[]>([false])
  const total = cells.reduce((s, flipped) => s + (flipped ? -1.5 : 1.5), 0)

  useEffect(() => {
    if (Math.abs(total - 6) < 1e-9) onEvent('made-6v')
  }, [total, onEvent])

  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-900 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setCells((c) => (c.length < MAX ? [...c, false] : c))} disabled={cells.length >= MAX}>
          + Add AA cell
        </Button>
        <Button variant="ghost" onClick={() => setCells((c) => (c.length > 1 ? c.slice(0, -1) : c))} disabled={cells.length <= 1}>
          − Remove
        </Button>
        <span className="text-xs text-fog-400">Click any cell to flip it around.</span>
      </div>
      <div className="mt-4 flex items-center gap-1 overflow-x-auto rounded-xl border border-dashed border-ink-600 bg-ink-950/60 p-3 scrollbar-thin">
        <span className="mr-1 shrink-0 font-bold text-flow">−</span>
        {cells.map((flipped, i) => (
          <Cell key={i} flipped={flipped} onClick={() => setCells((c) => c.map((f, j) => (j === i ? !f : f)))} />
        ))}
        <span className="ml-1 shrink-0 font-bold text-volt">+</span>
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-6">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-fog-400">Voltmeter</div>
          <div className={`font-mono text-4xl ${total < 0 ? 'text-danger' : 'text-volt'}`}>{total.toFixed(1)} V</div>
        </div>
        <div className="font-mono text-sm text-fog-400">= {cells.map((f) => (f ? '− 1.5' : '+ 1.5')).join(' ').replace(/^\+ /, '')}</div>
      </div>
      {cells.some((f) => f) && <p className="mt-2 text-sm text-warn">A flipped cell pushes the opposite way and cancels out push from the others.</p>}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { PartGlyph } from '../circuit/PartGlyph'
import { RESISTOR_OPTIONS, formatOhms } from '../sim/parts'
import type { WidgetProps } from './types'

const VIN = 5

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const i = RESISTOR_OPTIONS.indexOf(value as (typeof RESISTOR_OPTIONS)[number])
  const step = (d: number) => onChange(RESISTOR_OPTIONS[Math.min(RESISTOR_OPTIONS.length - 1, Math.max(0, i + d))])
  return (
    <div className="rounded-xl border border-ink-600 bg-ink-950/60 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-fog-400">{label}</div>
      <div className="mt-1.5 flex items-center gap-2">
        <button onClick={() => step(-1)} disabled={i <= 0} className="h-8 w-8 rounded-lg border border-ink-600 text-fog-200 hover:text-fog-100 disabled:opacity-30" aria-label={`Smaller ${label}`}>
          ◀
        </button>
        <span className="flex-1 text-center font-mono text-lg text-fog-100">{formatOhms(value)}</span>
        <button onClick={() => step(1)} disabled={i >= RESISTOR_OPTIONS.length - 1} className="h-8 w-8 rounded-lg border border-ink-600 text-fog-200 hover:text-fog-100 disabled:opacity-30" aria-label={`Bigger ${label}`}>
          ▶
        </button>
      </div>
    </div>
  )
}

/** Two resistors in series from 5 V to GND, with a voltmeter on the middle. */
export function Divider({ onEvent, props }: WidgetProps) {
  const target = (props?.target as number) ?? 2.5
  const tolerance = (props?.tolerance as number) ?? 0.05
  const [r1, setR1] = useState((props?.r1 as number) ?? 1000)
  const [r2, setR2] = useState((props?.r2 as number) ?? 1000)
  const vout = (VIN * r2) / (r1 + r2)
  const hit = Math.abs(vout - target) <= tolerance

  useEffect(() => {
    if (hit) onEvent('divider-hit')
  }, [hit, onEvent])

  const share1 = r1 / (r1 + r2)

  return (
    <div className="grid gap-4 rounded-2xl border border-ink-700 bg-ink-900 p-4 md:grid-cols-[260px_1fr]">
      <svg viewBox="0 0 260 340" className="mx-auto w-full max-w-[260px]">
        {/* rails */}
        <line x1="90" x2="90" y1="40" y2="300" stroke="#d08b4a" strokeWidth="4" />
        <line x1="90" x2="170" y1="170" y2="170" stroke="#d08b4a" strokeWidth="4" />
        <text x="90" y="26" textAnchor="middle" fill="#ef4444" fontSize="15" fontWeight="800" fontFamily="JetBrains Mono, monospace">
          5 V
        </text>
        <circle cx="90" cy="40" r="6" fill="#ef4444" />
        <g transform="translate(90 105) rotate(90)">
          <rect x="-58" y="-24" width="116" height="48" fill="#0b1120" />
          <PartGlyph part={{ id: 'r1', kind: 'resistor', x: 0, y: 0, rot: 0, props: { ohms: r1 } }} />
        </g>
        <g transform="translate(90 235) rotate(90)">
          <rect x="-58" y="-24" width="116" height="48" fill="#0b1120" />
          <PartGlyph part={{ id: 'r2', kind: 'resistor', x: 0, y: 0, rot: 0, props: { ohms: r2 } }} />
        </g>
        <text x="60" y="110" textAnchor="end" fill="#a9b8d0" fontSize="13" fontWeight="700">
          R1
        </text>
        <text x="60" y="240" textAnchor="end" fill="#a9b8d0" fontSize="13" fontWeight="700">
          R2
        </text>
        {/* ground */}
        <g transform="translate(90 300)">
          <line x1="-16" x2="16" y1="0" y2="0" stroke="#38bdf8" strokeWidth="3" />
          <line x1="-10" x2="10" y1="7" y2="7" stroke="#38bdf8" strokeWidth="3" />
          <line x1="-4" x2="4" y1="14" y2="14" stroke="#38bdf8" strokeWidth="3" />
        </g>
        <text x="90" y="334" textAnchor="middle" fill="#38bdf8" fontSize="12" fontWeight="700">
          GND · 0 V
        </text>
        {/* the middle point and its meter */}
        <circle cx="90" cy="170" r="7" fill="#fbbf24" />
        <rect x="170" y="140" width="80" height="60" rx="10" fill="#070b14" stroke={hit ? '#34d399' : '#283655'} strokeWidth="2" />
        <text x="210" y="161" textAnchor="middle" fill="#8a9bb8" fontSize="10">
          middle
        </text>
        <text x="210" y="186" textAnchor="middle" fill={hit ? '#34d399' : '#fbbf24'} fontSize="17" fontFamily="JetBrains Mono, monospace">
          {vout.toFixed(2)} V
        </text>
      </svg>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-md border border-volt/40 bg-volt/10 px-2 py-1 font-mono text-volt">
            Target: {target.toFixed(2)} V{tolerance >= 0.1 ? ` ± ${tolerance.toFixed(2)}` : ''}
          </span>
          {hit && <span className="text-ok">✓ On target</span>}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Stepper label="R1 (top)" value={r1} onChange={setR1} />
          <Stepper label="R2 (bottom)" value={r2} onChange={setR2} />
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-fog-400">How the 5 V is shared</div>
          <div className="mt-1.5 flex h-7 overflow-hidden rounded-lg font-mono text-[11px]">
            <div className="flex items-center justify-center bg-danger/30 text-rose-100 transition-[width] duration-300" style={{ width: `${share1 * 100}%` }}>
              {share1 > 0.12 ? `R1: ${(VIN * share1).toFixed(2)} V` : ''}
            </div>
            <div className="flex items-center justify-center bg-flow/30 text-sky-100 transition-[width] duration-300" style={{ width: `${(1 - share1) * 100}%` }}>
              {share1 < 0.88 ? `R2: ${vout.toFixed(2)} V` : ''}
            </div>
          </div>
          <p className="mt-2 text-sm text-fog-300">
            The middle sits at the voltage R2 holds up: 5 × {formatOhms(r2)} ÷ ({formatOhms(r1)} + {formatOhms(r2)}) = <span className="font-mono text-fog-100">{vout.toFixed(2)} V</span>
          </p>
        </div>
      </div>
    </div>
  )
}

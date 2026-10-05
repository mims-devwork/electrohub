import { useEffect, useRef, useState } from 'react'
import { PotGlyph } from '../micro/glyphs'
import { formatOhms } from '../sim/parts'
import type { WidgetProps } from './types'

const TRACK = 10000

/** A big potentiometer with its track opened up underneath. */
export function PotKnob({ onEvent }: WidgetProps) {
  const [pos, setPos] = useState(0.7)
  const [seen, setSeen] = useState({ low: false, high: false, mid: false })
  const svgRef = useRef<SVGSVGElement>(null)
  const dragging = useRef(false)
  const v = pos * 5

  useEffect(() => {
    setSeen((s) => ({ low: s.low || v <= 0.1, high: s.high || v >= 4.9, mid: s.mid || (v >= 2.4 && v <= 2.6) }))
  }, [v])

  useEffect(() => {
    if (seen.low && seen.high && seen.mid) onEvent('pot-explored')
  }, [seen, onEvent])

  const turnTo = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse())
    const deg = Math.max(-135, Math.min(135, (Math.atan2(p.x, -p.y) * 180) / Math.PI))
    setPos((deg + 135) / 270)
  }

  const bottom = pos * TRACK
  const top = TRACK - bottom
  const x = 40 + pos * 400

  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-900 p-4">
      <div className="grid items-center gap-4 md:grid-cols-[200px_1fr]">
        <div className="text-center">
          <svg
            ref={svgRef}
            viewBox="-75 -60 130 120"
            className="mx-auto w-44 touch-none select-none"
            onPointerDown={(e) => {
              dragging.current = true
              e.currentTarget.setPointerCapture(e.pointerId)
              turnTo(e.clientX, e.clientY)
            }}
            onPointerMove={(e) => dragging.current && turnTo(e.clientX, e.clientY)}
            onPointerUp={() => (dragging.current = false)}
            role="slider"
            tabIndex={0}
            aria-label="Potentiometer knob"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pos * 100)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowUp') setPos((p) => Math.min(1, p + 0.02))
              if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') setPos((p) => Math.max(0, p - 0.02))
            }}
          >
            <PotGlyph pos={pos} glow={1} />
          </svg>
          <input type="range" min={0} max={1000} value={Math.round(pos * 1000)} onChange={(e) => setPos(Number(e.target.value) / 1000)} className="mt-2 w-full" aria-label="Knob position" />
          <p className="mt-1 text-xs text-fog-400">Drag the knob round, or use the slider.</p>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-fog-400">Inside: the track, opened out flat</div>
          <svg viewBox="0 0 480 170" className="mt-1 w-full">
            {/* legs */}
            <text x="40" y="22" textAnchor="middle" fill="#64748b" fontSize="12" fontWeight="700">
              leg 1 · GND
            </text>
            <text x="440" y="22" textAnchor="middle" fill="#ef4444" fontSize="12" fontWeight="700">
              leg 3 · 5 V
            </text>
            <line x1="40" x2="40" y1="30" y2="60" stroke="#b8bec7" strokeWidth="4" />
            <line x1="440" x2="440" y1="30" y2="60" stroke="#b8bec7" strokeWidth="4" />
            {/* the track, coloured by how much of the voltage each piece holds */}
            <rect x="40" y="60" width={x - 40} height="26" rx="6" fill="#38bdf8" opacity="0.35" />
            <rect x={x} y="60" width={440 - x} height="26" rx="6" fill="#ef4444" opacity="0.3" />
            <rect x="40" y="60" width="400" height="26" rx="6" fill="none" stroke="#a08660" strokeWidth="2" />
            <text x={(40 + x) / 2} y="78" textAnchor="middle" fill="#e0f2fe" fontSize="11" fontFamily="JetBrains Mono, monospace">
              {pos > 0.16 ? formatOhms(Math.round(bottom)) : ''}
            </text>
            <text x={(x + 440) / 2} y="78" textAnchor="middle" fill="#ffe4e6" fontSize="11" fontFamily="JetBrains Mono, monospace">
              {pos < 0.84 ? formatOhms(Math.round(top)) : ''}
            </text>
            {/* wiper */}
            <path d={`M ${x} 92 L ${x - 9} 108 L ${x + 9} 108 Z`} fill="#a78bfa" />
            <line x1={x} x2={x} y1="108" y2="140" stroke="#a78bfa" strokeWidth="4" />
            <line x1={x} x2="240" y1="140" y2="140" stroke="#a78bfa" strokeWidth="4" />
            <line x1="240" x2="240" y1="140" y2="160" stroke="#a78bfa" strokeWidth="4" />
            <text x="252" y="158" fill="#a78bfa" fontSize="12" fontWeight="700">
              middle leg (wiper)
            </text>
          </svg>
          <div className="mt-2 flex flex-wrap items-end gap-6">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-fog-400">Voltage on the wiper</div>
              <div className="font-mono text-3xl text-volt">{v.toFixed(2)} V</div>
            </div>
            <div className="font-mono text-xs text-fog-400">
              = 5 V × {formatOhms(Math.round(bottom))} ÷ 10 kΩ
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {(
              [
                ['low', 'Reach 0 V'],
                ['high', 'Reach 5 V'],
                ['mid', 'Stop near 2.5 V'],
              ] as const
            ).map(([k, label]) => (
              <span key={k} className={`rounded-md border px-2 py-1 ${seen[k] ? 'border-ok/50 text-ok' : 'border-ink-600 text-fog-400'}`}>
                {seen[k] ? '✓' : '○'} {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import type { WidgetProps } from './types'

const SOUND = 0.0343 // cm per µs
const RANGE = 400
const MAX = 500
/** On screen, a ping takes this long per cm of travel (ms), so you can watch it. */
const MS_PER_CM = 6

export function Ultrasonic({ onEvent }: WidgetProps) {
  const [wall, setWall] = useState(60)
  const [result, setResult] = useState<{ wall: number; us: number; cm: number } | null>(null)
  const [measured, setMeasured] = useState<number[]>([])
  const [pulse, setPulse] = useState<number | null>(null)
  const raf = useRef(0)

  useEffect(() => {
    if (new Set(measured.filter((d) => d > 0)).size >= 3) onEvent('pinged-3')
  }, [measured, onEvent])

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const ping = () => {
    cancelAnimationFrame(raf.current)
    const echo = wall <= RANGE
    const trip = echo ? wall * 2 : RANGE * 2
    const start = performance.now()
    const dur = Math.min(2400, trip * MS_PER_CM)
    const step = (now: number) => {
      const f = Math.min(1, (now - start) / dur)
      setPulse(f * trip)
      if (f < 1) raf.current = requestAnimationFrame(step)
      else {
        setPulse(null)
        const us = echo ? Math.round((wall * 2) / SOUND) : 0
        const cm = echo ? Math.round(((us * SOUND) / 2) * 10) / 10 : 0
        setResult({ wall, us, cm })
        setMeasured((m) => [...m, Math.round(cm)])
      }
    }
    raf.current = requestAnimationFrame(step)
  }

  const W = 600
  const x0 = 60
  const scale = (W - x0 - 20) / MAX
  const wallX = x0 + wall * scale
  // Where the sound front is: going out, then coming back.
  const front = pulse === null ? null : pulse <= wall || wall > RANGE ? x0 + Math.min(pulse, MAX) * scale : x0 + (2 * wall - pulse) * scale
  const faint = pulse !== null && wall > RANGE && pulse > RANGE

  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-900 p-4">
      <svg viewBox={`0 0 ${W} 130`} className="w-full">
        <rect x={x0 + RANGE * scale} y="18" width={(MAX - RANGE) * scale} height="92" fill="#f43f5e" opacity="0.06" />
        <text x={x0 + RANGE * scale + 6} y="30" fontSize="10" fill="#fb7185">
          too far to hear an echo
        </text>
        {/* sensor */}
        <rect x="10" y="44" width="44" height="42" rx="4" fill="#1d4ed8" />
        <circle cx="32" cy="54" r="8" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
        <circle cx="32" cy="76" r="8" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
        {/* wall */}
        <rect x={wallX} y="18" width="14" height="92" fill="#475569" />
        {front !== null && (
          <path d={`M ${front} 40 Q ${front + 10} 65 ${front} 90`} stroke={faint ? '#64748b' : '#38bdf8'} strokeWidth="3" fill="none" opacity={faint ? 0.4 : 1} />
        )}
        {[0, 100, 200, 300, 400, 500].map((cm) => (
          <g key={cm}>
            <line x1={x0 + cm * scale} x2={x0 + cm * scale} y1="112" y2="118" stroke="#3a4a6b" />
            <text x={x0 + cm * scale} y="128" textAnchor="middle" fontSize="9" fill="#8a9bb8">
              {cm} cm
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <label className="flex min-w-[220px] flex-1 items-center gap-3 text-sm text-fog-300">
          Wall distance
          <input type="range" min={5} max={MAX} value={wall} onChange={(e) => setWall(Number(e.target.value))} className="flex-1" aria-label="Wall distance" />
          <span className="w-16 text-right font-mono text-xs">{wall} cm</span>
        </label>
        <button onClick={ping} className="rounded-lg bg-volt px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-amber-300">
          Ping!
        </button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-ink-600 bg-ink-950 p-2.5">
          <div className="text-[10px] uppercase tracking-wider text-fog-400">Echo time</div>
          <div className="font-mono text-lg text-flow">{result ? (result.us ? `${result.us} µs` : 'no echo') : '—'}</div>
        </div>
        <div className="rounded-lg border border-ink-600 bg-ink-950 p-2.5 sm:col-span-2">
          <div className="text-[10px] uppercase tracking-wider text-fog-400">Distance = time × 0.0343 ÷ 2</div>
          <div className="font-mono text-lg text-volt">
            {result ? (result.us ? `${result.us} × 0.0343 ÷ 2 = ${result.cm} cm` : 'sensor reports 0') : '—'}
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-fog-400">Measured: {measured.length ? measured.map((m) => (m ? `${m} cm` : '0 (no echo)')).join(', ') : 'nothing yet'}</p>
    </div>
  )
}

import { useEffect, useState } from 'react'
import type { WidgetProps } from './types'

const W = 600
const H = 130
const CYCLES = 4
/** One PWM cycle in slow motion (s). Real Arduino PWM runs at about 490 Hz. */
const SLOW_PERIOD = 1.4

/** Duty-cycle slider, a square-wave scope and an LED, with a slow-motion switch. */
export function Pwm({ onEvent }: WidgetProps) {
  const [duty, setDuty] = useState(60)
  const [slow, setSlow] = useState(false)
  const [usedSlow, setUsedSlow] = useState(false)
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    if (!slow) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      setPhase((((now - start) / 1000) % (SLOW_PERIOD * CYCLES)) / SLOW_PERIOD)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [slow])

  useEffect(() => {
    if (usedSlow && duty >= 20 && duty <= 30) onEvent('pwm-explored')
  }, [usedSlow, duty, onEvent])

  const d = duty / 100
  const on = slow ? phase % 1 < d : false
  const brightness = slow ? (on ? 1 : 0) : Math.sqrt(d)

  // Square wave: CYCLES periods across the scope.
  const pts: string[] = []
  const per = W / CYCLES
  const hi = 24
  const lo = H - 22
  for (let c = 0; c < CYCLES; c++) {
    const x0 = c * per
    const x1 = x0 + per * d
    pts.push(`${x0},${d > 0 ? hi : lo}`, `${x1},${d > 0 ? hi : lo}`, `${x1},${d < 1 ? lo : hi}`, `${x0 + per},${d < 1 ? lo : hi}`)
  }
  const avgY = lo - d * (lo - hi)

  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-900 p-4">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex flex-1 items-center gap-3 text-sm text-fog-300" htmlFor="pwm-duty">
              <span className="shrink-0">Time on</span>
              <input id="pwm-duty" type="range" min={0} max={100} value={duty} onChange={(e) => setDuty(Number(e.target.value))} className="flex-1" />
              <span className="w-12 text-right font-mono text-fog-100">{duty}%</span>
            </label>
            <button
              onClick={() => {
                setSlow((s) => !s)
                setUsedSlow(true)
              }}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${slow ? 'border-brain bg-brain/15 text-brain' : 'border-ink-600 text-fog-300 hover:text-fog-100'}`}
              aria-pressed={slow}
            >
              {slow ? '🐢 Slow motion: on' : '🐢 Slow motion'}
            </button>
          </div>
          <div className="mt-3 text-[11px] uppercase tracking-wider text-fog-400">Pin 9 over time {slow ? '(slowed right down)' : '(about 490 cycles every second)'}</div>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full rounded-lg bg-ink-950">
            <line x1="0" x2={W} y1={hi} y2={hi} stroke="#1c2742" strokeDasharray="4 6" />
            <line x1="0" x2={W} y1={lo} y2={lo} stroke="#1c2742" />
            <text x={W - 6} y={hi - 6} fill="#8a9bb8" fontSize="10" textAnchor="end">
              5 V
            </text>
            <text x={W - 6} y={lo + 14} fill="#8a9bb8" fontSize="10" textAnchor="end">
              0 V
            </text>
            <polyline points={pts.join(' ')} fill="none" stroke="#a78bfa" strokeWidth="3" strokeLinejoin="round" />
            <line x1="0" x2={W} y1={avgY} y2={avgY} stroke="#fbbf24" strokeWidth="2" strokeDasharray="6 5" />
            <text x="6" y={avgY - 5} fill="#fbbf24" fontSize="10">
              average {(d * 5).toFixed(2)} V
            </text>
            {slow && <line x1={phase * per} x2={phase * per} y1="8" y2={H - 8} stroke="#e8eef7" strokeWidth="1.5" />}
          </svg>
        </div>
        <div className="space-y-3">
          <div className="grid place-items-center rounded-xl border border-ink-600 bg-ink-950 p-3">
            <svg viewBox="-40 -40 80 80" className="h-24 w-24">
              {brightness > 0.02 && <circle r={18 + brightness * 20} fill="#ff3b3b" opacity={0.15 + brightness * 0.35} style={{ filter: 'blur(5px)' }} />}
              <circle r="18" fill="#ff3b3b" opacity={0.25 + brightness * 0.75} stroke="#ff3b3b" strokeWidth="2" />
              <circle r="7" fill="#fff" opacity={0.15 + brightness * 0.75} />
            </svg>
            <div className="text-xs text-fog-400">{slow ? (on ? 'ON' : 'OFF') : 'looks steady'}</div>
          </div>
          <div className="rounded-xl border border-ink-600 bg-ink-950 p-3 font-mono text-xs text-fog-300">
            analogWrite(9, <span className="text-brain">{Math.round(d * 255)}</span>);
          </div>
        </div>
      </div>
    </div>
  )
}

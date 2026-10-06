import { useEffect, useState } from 'react'
import { ServoGlyph } from '../micro/glyphs'
import type { WidgetProps } from './types'

const TARGETS = [0, 90, 180]
/** Our teaching stepper has four coils and takes big 90° steps so you can see them; real ones take 1.8°. */
const STEP_DEG = 90
const COILS = ['A', 'B', 'C', 'D']

export function ServoPulse({ onEvent }: WidgetProps) {
  const [ms, setMs] = useState(1.25)
  const [hit, setHit] = useState<number[]>([])
  const [steps, setSteps] = useState(0)
  const angle = Math.round((ms - 1) * 180)

  useEffect(() => {
    const t = TARGETS.find((a) => Math.abs(a - angle) <= 2)
    if (t !== undefined) setHit((h) => (h.includes(t) ? h : [...h, t]))
  }, [angle])

  useEffect(() => {
    if (hit.length === TARGETS.length && steps >= 360 / STEP_DEG) onEvent('both')
  }, [hit, steps, onEvent])

  const coil = steps % COILS.length
  const W = 300
  const pulseW = (ms / 20) * W * 4

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-ink-700 bg-ink-900 p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-fog-400">Servo</div>
        <svg viewBox="-80 -50 150 90" className="mx-auto mt-2 w-56">
          <ServoGlyph angle={angle} />
        </svg>
        <label className="mt-2 flex items-center gap-3 text-sm text-fog-300">
          Pulse
          <input type="range" min={1} max={2} step={0.01} value={ms} onChange={(e) => setMs(Number(e.target.value))} className="flex-1" aria-label="Pulse length in milliseconds" />
          <span className="w-16 text-right font-mono">{ms.toFixed(2)} ms</span>
        </label>
        <svg viewBox={`0 0 ${W} 50`} className="mt-2 w-full rounded-lg bg-ink-950">
          <polyline points={`0,40 10,40 10,12 ${10 + pulseW},12 ${10 + pulseW},40 ${W},40`} fill="none" stroke="#f97316" strokeWidth="2.5" />
          <text x={W - 6} y="22" textAnchor="end" fontSize="9" fill="#8a9bb8">
            one pulse every 20 ms (zoomed in)
          </text>
        </svg>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="font-mono text-volt">angle {angle}°</span>
          <span className="flex gap-1.5">
            {TARGETS.map((t) => (
              <span key={t} className={`rounded-md border px-2 py-0.5 ${hit.includes(t) ? 'border-ok/50 text-ok' : 'border-ink-600 text-fog-400'}`}>
                {hit.includes(t) ? '✓' : '○'} {t}°
              </span>
            ))}
          </span>
        </div>
      </div>
      <div className="rounded-2xl border border-ink-700 bg-ink-900 p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-fog-400">Stepper</div>
        <svg viewBox="-80 -80 160 160" className="mx-auto mt-2 w-44">
          {COILS.map((c, i) => {
            const a = (i * 90 * Math.PI) / 180
            const active = i === coil
            return (
              <g key={c}>
                <rect x={Math.sin(a) * 58 - 12} y={-Math.cos(a) * 58 - 12} width="24" height="24" rx="4" fill={active ? '#fbbf24' : '#334155'} />
                <text x={Math.sin(a) * 58} y={-Math.cos(a) * 58 + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill={active ? '#0b1120' : '#a9b8d0'}>
                  {c}
                </text>
              </g>
            )
          })}
          <g transform={`rotate(${steps * STEP_DEG})`} style={{ transition: 'transform 0.2s ease-out' }}>
            <circle r="30" fill="#1f2937" stroke="#64748b" strokeWidth="3" />
            <path d="M 0 -42 L 8 -24 L -8 -24 Z" fill="#fbbf24" />
          </g>
        </svg>
        <div className="mt-2 flex items-center gap-3">
          <button onClick={() => setSteps((s) => s + 1)} className="rounded-lg bg-volt px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-amber-300">
            Step ▶
          </button>
          <span className="font-mono text-xs text-fog-300">
            {steps} steps · {(steps * STEP_DEG) % 360}° · coil {COILS[coil]} on
          </span>
        </div>
        <p className="mt-2 text-xs text-fog-400">Each step switches on the next coil, which pulls the magnet round. This one takes 90° steps so you can see them; real steppers take 1.8°, 200 steps a turn.</p>
      </div>
    </div>
  )
}

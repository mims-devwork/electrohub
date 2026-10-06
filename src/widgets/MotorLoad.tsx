import { useEffect, useRef, useState } from 'react'
import type { WidgetProps } from './types'

const R = 6 // coil resistance (Ω)
const KE = 0.0255 // volts of push-back per rpm
const LOADS = [
  { id: 'free', label: 'Spinning freely', amps: 0.15 },
  { id: 'robot', label: 'Pushing a robot', amps: 0.5 },
  { id: 'stall', label: 'Stalled (held still)', amps: Infinity },
] as const

/** Speed and current for a voltage and a load, with back-EMF: I = (V − Ke·rpm) / R. */
function motorAt(v: number, load: (typeof LOADS)[number]) {
  if (load.amps === Infinity || v - load.amps * R <= 0.0001) return { rpm: 0, amps: v / R }
  return { rpm: (v - load.amps * R) / KE, amps: load.amps }
}

export function MotorLoad({ onEvent }: WidgetProps) {
  const [v, setV] = useState(3)
  const [loadId, setLoadId] = useState<(typeof LOADS)[number]['id']>('free')
  const load = LOADS.find((l) => l.id === loadId)!
  const { rpm, amps } = motorAt(v, load)
  const rotor = useRef<SVGGElement>(null)
  const speed = useRef(rpm)
  speed.current = rpm

  useEffect(() => {
    if (loadId === 'stall' && v >= 5) onEvent('stalled')
  }, [loadId, v, onEvent])

  useEffect(() => {
    let a = 0
    let last = performance.now()
    let raf = 0
    const tick = (now: number) => {
      // Shown at a tenth of the real speed so you can follow it.
      a = (a + (speed.current / 60) * 36 * Math.min(0.05, (now - last) / 1000)) % 360
      last = now
      rotor.current?.setAttribute('transform', `rotate(${a})`)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const hot = amps > 0.6
  return (
    <div className="grid gap-4 rounded-2xl border border-ink-700 bg-ink-900 p-4 md:grid-cols-[200px_1fr]">
      <svg viewBox="-80 -80 160 160" className="mx-auto w-44">
        {hot && <circle r="70" fill="#ff5a1a" opacity={Math.min(0.45, (amps - 0.6) * 0.8)} style={{ filter: 'blur(8px)' }} />}
        <circle r="62" fill="#1f2937" stroke="#eab308" strokeWidth="6" />
        <rect x="-62" y="-20" width="16" height="40" fill="#dc2626" />
        <rect x="46" y="-20" width="16" height="40" fill="#2563eb" />
        <g ref={rotor}>
          {[0, 120, 240].map((r) => (
            <g key={r} transform={`rotate(${r})`}>
              <rect x="-7" y="-40" width="14" height="30" rx="3" fill="#b45309" />
            </g>
          ))}
          <circle r="10" fill="#d4d4d8" />
          <circle cy="-30" r="4" fill="#fbbf24" />
        </g>
      </svg>
      <div className="space-y-4">
        <label className="flex items-center gap-3 text-sm text-fog-300">
          Voltage
          <input type="range" min={0} max={6} step={0.1} value={v} onChange={(e) => setV(Number(e.target.value))} className="flex-1" aria-label="Motor voltage" />
          <span className="w-12 text-right font-mono">{v.toFixed(1)} V</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {LOADS.map((l) => (
            <button
              key={l.id}
              onClick={() => setLoadId(l.id)}
              className={`rounded-lg border px-3 py-1.5 text-sm ${loadId === l.id ? (l.id === 'stall' ? 'border-danger bg-danger/15 text-rose-200' : 'border-volt bg-volt/15 text-volt') : 'border-ink-600 text-fog-300 hover:text-fog-100'}`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-ink-600 bg-ink-950 p-3">
            <div className="text-[10px] uppercase tracking-wider text-fog-400">Speed</div>
            <div className="font-mono text-2xl text-ok">{Math.round(rpm)} rpm</div>
          </div>
          <div className={`rounded-lg border p-3 ${hot ? 'border-danger/60 bg-danger/10' : 'border-ink-600 bg-ink-950'}`}>
            <div className="text-[10px] uppercase tracking-wider text-fog-400">Current</div>
            <div className={`font-mono text-2xl ${hot ? 'text-danger' : 'text-volt'}`}>{amps.toFixed(2)} A</div>
          </div>
        </div>
        <p className="text-sm text-fog-300">
          {rpm > 0
            ? `Spinning, the motor pushes back with ${(rpm * KE).toFixed(1)} V, so only ${(v - rpm * KE).toFixed(1)} V is left to drive current through the coil.`
            : v > 0
              ? `Nothing pushes back, so the current is just ${v.toFixed(1)} V ÷ ${R} Ω. ${hot ? 'That’s the stall current, and the coil is heating up fast.' : ''}`
              : 'No voltage, no current, no movement.'}
        </p>
      </div>
    </div>
  )
}

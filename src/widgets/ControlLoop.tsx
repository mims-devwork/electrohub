import { useEffect, useRef, useState } from 'react'
import type { WidgetProps } from './types'

type Mode = 'onoff' | 'p'
const TARGET = 20
const START = 120
const VMAX = 60
const LAG = 0.25
const SIM_SECONDS = 12
const DT = 0.02
/** Play the run at double speed. */
const PLAYBACK = 2

/** Simulate driving towards a wall: returns distance (cm) at every step. */
export function simulateApproach(mode: Mode, gain: number) {
  let d = START
  let v = 0
  const trace: number[] = [d]
  let crashed = false
  for (let t = 0; t < SIM_SECONDS; t += DT) {
    const want = mode === 'onoff' ? (d > TARGET ? VMAX : 0) : Math.max(-VMAX, Math.min(VMAX, gain * (d - TARGET)))
    v += (want - v) * (1 - Math.exp(-DT / LAG))
    d -= v * DT
    if (d <= 0) {
      d = 0
      v = 0
      crashed = true
    }
    trace.push(d)
  }
  return { trace, final: d, speed: v, crashed }
}

export function ControlLoop({ onEvent }: WidgetProps) {
  const [mode, setMode] = useState<Mode>('onoff')
  const [gain, setGain] = useState(4)
  const [run, setRun] = useState<{ trace: number[]; final: number; speed: number; crashed: boolean; mode: Mode; gain: number } | null>(null)
  const [shown, setShown] = useState(0)
  const raf = useRef(0)

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const go = () => {
    cancelAnimationFrame(raf.current)
    const r = { ...simulateApproach(mode, gain), mode, gain }
    setRun(r)
    const start = performance.now()
    const tick = (now: number) => {
      const n = Math.min(r.trace.length, Math.floor(((now - start) / 1000) * PLAYBACK / DT))
      setShown(n)
      if (n < r.trace.length) raf.current = requestAnimationFrame(tick)
      else if (r.mode === 'p' && Math.abs(r.final - TARGET) <= 1 && Math.abs(r.speed) < 1) onEvent('parked')
    }
    raf.current = requestAnimationFrame(tick)
  }

  const W = 600
  const H = 150
  const tx = (i: number) => (i / (SIM_SECONDS / DT)) * W
  const ty = (d: number) => H - 10 - (d / START) * (H - 24)
  const d = run ? run.trace[Math.max(0, shown - 1)] : START
  const finished = run && shown >= run.trace.length

  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-900 p-4">
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ['onoff', 'Drive until 20 cm, then stop'],
            ['p', 'Proportional: speed = gain × (distance − 20)'],
          ] as const
        ).map(([m, label]) => (
          <button key={m} onClick={() => setMode(m)} className={`rounded-lg border px-3 py-1.5 text-sm ${mode === m ? 'border-volt bg-volt/15 text-volt' : 'border-ink-600 text-fog-300 hover:text-fog-100'}`}>
            {label}
          </button>
        ))}
      </div>
      {mode === 'p' && (
        <label className="mt-3 flex items-center gap-3 text-sm text-fog-300">
          Gain
          <input type="range" min={0.5} max={10} step={0.5} value={gain} onChange={(e) => setGain(Number(e.target.value))} className="flex-1" aria-label="Gain" />
          <span className="w-10 text-right font-mono">{gain}</span>
        </label>
      )}
      {/* the robot and the wall, from the side */}
      <svg viewBox={`0 0 ${W} 60`} className="mt-3 w-full">
        <rect x={W - 16} y="0" width="16" height="60" fill="#475569" />
        <line x1={W - 16 - (TARGET / START) * (W - 80)} x2={W - 16 - (TARGET / START) * (W - 80)} y1="4" y2="56" stroke="#34d399" strokeDasharray="4 4" />
        <text x={W - 20 - (TARGET / START) * (W - 80)} y="12" textAnchor="end" fontSize="9" fill="#34d399">
          20 cm
        </text>
        <g transform={`translate(${W - 16 - (d / START) * (W - 80) - 40} 26)`}>
          <rect width="40" height="20" rx="5" fill="#f472b6" />
          <circle cx="10" cy="22" r="6" fill="#111827" />
          <circle cx="30" cy="22" r="6" fill="#111827" />
          <rect x="38" y="6" width="5" height="8" fill="#0f172a" />
        </g>
      </svg>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full rounded-lg bg-ink-950">
        <line x1="0" x2={W} y1={ty(TARGET)} y2={ty(TARGET)} stroke="#34d399" strokeDasharray="5 5" />
        <line x1="0" x2={W} y1={ty(0)} y2={ty(0)} stroke="#f43f5e" />
        <text x="6" y={ty(0) - 4} fontSize="9" fill="#fb7185">
          wall
        </text>
        {run && <polyline points={run.trace.slice(0, shown).map((v, i) => `${tx(i)},${ty(v)}`).join(' ')} fill="none" stroke="#38bdf8" strokeWidth="2.5" />}
        <text x={W - 6} y="14" textAnchor="end" fontSize="9" fill="#8a9bb8">
          distance over {SIM_SECONDS} s
        </text>
      </svg>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button onClick={go} className="rounded-lg bg-volt px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-amber-300">
          ▶ Run
        </button>
        <span className="font-mono text-sm text-fog-200">{d.toFixed(1)} cm from the wall</span>
        {finished && (
          <span className={`text-sm ${run.crashed ? 'text-danger' : Math.abs(run.final - TARGET) <= 1 ? 'text-ok' : 'text-warn'}`}>
            {run.crashed
              ? 'Crashed into the wall!'
              : Math.abs(run.final - TARGET) <= 1
                ? run.mode === 'p'
                  ? '✓ Parked on target'
                  : 'On target'
                : `Stopped ${Math.abs(run.final - TARGET).toFixed(1)} cm ${run.final < TARGET ? 'past' : 'short of'} the target`}
          </span>
        )}
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import type { WidgetProps } from './types'

const W = 640
const ROW = 110
const SAMPLES = 160

/** A switch (digital) and a knob (analog) side by side, drawing on one scope. */
export function SignalScope({ onEvent }: WidgetProps) {
  const [on, setOn] = useState(false)
  const [knob, setKnob] = useState(1.2)
  const [flips, setFlips] = useState(0)
  const range = useRef({ min: knob, max: knob })
  const [knobSpan, setKnobSpan] = useState(0)
  const [history, setHistory] = useState<{ sw: number; kn: number }[]>(() => Array(SAMPLES).fill({ sw: 0, kn: 1.2 }))
  const live = useRef({ on, knob })
  live.current = { on, knob }

  useEffect(() => {
    const t = setInterval(() => setHistory((h) => [...h.slice(1), { sw: live.current.on ? 5 : 0, kn: live.current.knob }]), 50)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (flips >= 2 && knobSpan >= 3) onEvent('both-signals')
  }, [flips, knobSpan, onEvent])

  const turn = (v: number) => {
    setKnob(v)
    range.current = { min: Math.min(range.current.min, v), max: Math.max(range.current.max, v) }
    setKnobSpan(range.current.max - range.current.min)
  }

  const trace = (key: 'sw' | 'kn', top: number) =>
    history.map((s, i) => `${(i / (SAMPLES - 1)) * W},${top + ROW - 14 - (s[key] / 5) * (ROW - 34)}`).join(' ')

  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-900 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-ink-600 bg-ink-950/60 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-fog-400">Switch on a 5 V supply</div>
          <button
            onClick={() => {
              setOn((o) => !o)
              setFlips((f) => f + 1)
            }}
            className={`mt-2 w-full rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${on ? 'border-volt bg-volt/15 text-volt' : 'border-ink-500 text-fog-200 hover:text-fog-100'}`}
            aria-pressed={on}
          >
            {on ? 'ON · click to switch off' : 'OFF · click to switch on'}
          </button>
          <div className="mt-2 font-mono text-sm text-volt">{on ? '5.00 V' : '0.00 V'}</div>
        </div>
        <div className="rounded-xl border border-ink-600 bg-ink-950/60 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-fog-400">Knob on a 5 V supply</div>
          <input type="range" min={0} max={5} step={0.01} value={knob} onChange={(e) => turn(Number(e.target.value))} className="mt-4 w-full" style={{ ['--thumb' as string]: 'var(--color-brain)' }} aria-label="Knob voltage" />
          <div className="mt-2 font-mono text-sm text-brain">{knob.toFixed(2)} V</div>
        </div>
      </div>
      <div className="mt-3 text-[11px] uppercase tracking-wider text-fog-400">Voltage over time (oscilloscope)</div>
      <svg viewBox={`0 0 ${W} ${ROW * 2}`} className="mt-1 w-full rounded-lg bg-ink-950">
        {[0, 1].map((r) => (
          <g key={r}>
            <line x1="0" x2={W} y1={r * ROW + 20} y2={r * ROW + 20} stroke="#1c2742" strokeDasharray="4 6" />
            <line x1="0" x2={W} y1={r * ROW + ROW - 14} y2={r * ROW + ROW - 14} stroke="#1c2742" />
            <text x={W - 8} y={r * ROW + 16} fill="#8a9bb8" fontSize="10" textAnchor="end">
              5 V
            </text>
            <text x={W - 8} y={r * ROW + ROW - 18} fill="#8a9bb8" fontSize="10" textAnchor="end">
              0 V
            </text>
          </g>
        ))}
        <text x="8" y="14" fill="#fbbf24" fontSize="11">
          switch
        </text>
        <text x="8" y={ROW + 14} fill="#a78bfa" fontSize="11">
          knob
        </text>
        <polyline points={trace('sw', 0)} fill="none" stroke="#fbbf24" strokeWidth="3" strokeLinejoin="round" />
        <polyline points={trace('kn', ROW)} fill="none" stroke="#a78bfa" strokeWidth="3" strokeLinejoin="round" />
      </svg>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <span className={`rounded-md border px-2 py-1 ${flips >= 2 ? 'border-ok/50 text-ok' : 'border-ink-600 text-fog-400'}`}>{flips >= 2 ? '✓' : '○'} Flip the switch a few times</span>
        <span className={`rounded-md border px-2 py-1 ${knobSpan >= 3 ? 'border-ok/50 text-ok' : 'border-ink-600 text-fog-400'}`}>{knobSpan >= 3 ? '✓' : '○'} Sweep the knob across most of its range</span>
      </div>
    </div>
  )
}

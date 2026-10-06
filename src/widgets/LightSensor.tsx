import { useEffect, useState } from 'react'
import { formatOhms } from '../sim/parts'
import type { WidgetProps } from './types'

/** LDR resistance from 0 (dim room, 50 kΩ) to 1 (under a lamp, 2 kΩ), on a log scale like a real one. */
const ldrOhms = (light: number) => 50000 * Math.pow(2000 / 50000, light)
const FIXED = [1000, 10000, 100000]
const BEST = 10000

const reading = (light: number, fixed: number) => Math.round((fixed / (fixed + ldrOhms(light))) * 1023)

export function LightSensor({ onEvent }: WidgetProps) {
  const [light, setLight] = useState(0.5)
  const [fixed, setFixed] = useState(1000)
  const [seen, setSeen] = useState<Record<number, { dim: boolean; bright: boolean }>>({})
  const v = (fixed / (fixed + ldrOhms(light))) * 5

  useEffect(() => {
    setSeen((s) => {
      const cur = s[fixed] ?? { dim: false, bright: false }
      return { ...s, [fixed]: { dim: cur.dim || light <= 0.02, bright: cur.bright || light >= 0.98 } }
    })
  }, [light, fixed])

  const triedAll = FIXED.every((f) => seen[f]?.dim && seen[f]?.bright)
  useEffect(() => {
    if (triedAll && fixed === BEST) onEvent('best-swing')
  }, [triedAll, fixed, onEvent])

  return (
    <div className="grid gap-4 rounded-2xl border border-ink-700 bg-ink-900 p-4 md:grid-cols-[240px_1fr]">
      <svg viewBox="0 0 240 300" className="mx-auto w-full max-w-[240px]">
        <circle cx="200" cy="60" r={14 + light * 16} fill="#fde68a" opacity={0.15 + light * 0.6} />
        <text x="200" y="64" textAnchor="middle" fontSize="16">
          💡
        </text>
        <line x1="80" x2="80" y1="30" y2="270" stroke="#d08b4a" strokeWidth="4" />
        <text x="80" y="20" textAnchor="middle" fill="#ef4444" fontSize="13" fontWeight="800">
          5 V
        </text>
        {/* LDR: a resistor with arrows of light falling on it */}
        <rect x="64" y="60" width="32" height="56" rx="14" fill="#7c2d12" stroke="#fbbf24" strokeWidth="2" />
        <path d="M 70 72 Q 80 80 90 72 M 70 84 Q 80 92 90 84 M 70 96 Q 80 104 90 96" stroke="#fde68a" strokeWidth="2" fill="none" />
        {[0, 1].map((i) => (
          <path key={i} d={`M ${150 - i * 10} ${70 + i * 18} L 108 ${84 + i * 18}`} stroke="#fde68a" strokeWidth="2" opacity={0.3 + light * 0.7} />
        ))}
        <text x="56" y="92" textAnchor="end" fill="#a9b8d0" fontSize="11">
          LDR
        </text>
        <text x="56" y="106" textAnchor="end" fill="#fbbf24" fontSize="10" fontFamily="JetBrains Mono, monospace">
          {formatOhms(Math.round(ldrOhms(light) / 100) * 100)}
        </text>
        <circle cx="80" cy="150" r="6" fill="#fbbf24" />
        <line x1="80" x2="150" y1="150" y2="150" stroke="#d08b4a" strokeWidth="3" />
        <text x="156" y="154" fill="#fbbf24" fontSize="12" fontWeight="700">
          → A0
        </text>
        <rect x="66" y="180" width="28" height="56" rx="10" fill="#d8c39b" stroke="#a08660" />
        <text x="56" y="212" textAnchor="end" fill="#a9b8d0" fontSize="11">
          {formatOhms(fixed)}
        </text>
        <g transform="translate(80 270)">
          <line x1="-14" x2="14" y1="0" y2="0" stroke="#38bdf8" strokeWidth="3" />
          <line x1="-8" x2="8" y1="6" y2="6" stroke="#38bdf8" strokeWidth="3" />
        </g>
      </svg>
      <div className="space-y-4">
        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-fog-400">Light on the sensor</span>
          <div className="mt-1 flex items-center gap-3 text-xs text-fog-400">
            🌑 dim
            <input type="range" min={0} max={100} value={Math.round(light * 100)} onChange={(e) => setLight(Number(e.target.value) / 100)} className="flex-1" aria-label="Light level" />
            ☀️ bright
          </div>
        </label>
        <div>
          <span className="text-[11px] uppercase tracking-wider text-fog-400">Fixed resistor</span>
          <div className="mt-1 flex gap-2">
            {FIXED.map((f) => (
              <button
                key={f}
                onClick={() => setFixed(f)}
                className={`rounded-lg border px-3 py-1.5 font-mono text-sm ${fixed === f ? 'border-volt bg-volt/15 text-volt' : 'border-ink-600 text-fog-300 hover:text-fog-100'}`}
              >
                {formatOhms(f)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-end gap-6">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-fog-400">A0 reads</div>
            <div className="font-mono text-3xl text-volt">{reading(light, fixed)}</div>
            <div className="font-mono text-xs text-fog-400">{v.toFixed(2)} V</div>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="text-[11px] uppercase tracking-wider text-fog-400">Swing from dim to bright</div>
          {FIXED.map((f) => {
            const known = seen[f]?.dim && seen[f]?.bright
            const swing = reading(1, f) - reading(0, f)
            return (
              <div key={f} className="flex items-center gap-2 text-xs">
                <span className="w-14 font-mono text-fog-300">{formatOhms(f)}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-700">
                  {known && <div className="h-full rounded-full bg-volt transition-[width]" style={{ width: `${(swing / 1023) * 100}%` }} />}
                </div>
                <span className="w-24 text-right font-mono text-fog-400">{known ? `${swing} steps` : 'try dim + bright'}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

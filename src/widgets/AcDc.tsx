import { useEffect, useRef, useState } from 'react'
import type { WidgetProps } from './types'

const W = 640
const H = 200
const DOTS = 22

export function AcDc({ onEvent }: WidgetProps) {
  const [mode, setMode] = useState<'dc' | 'ac'>('dc')
  const seen = useRef(new Set<string>(['dc']))
  const trace = useRef<SVGPolylineElement>(null)
  const dotsRef = useRef<SVGGElement>(null)
  const modeRef = useRef(mode)
  modeRef.current = mode

  useEffect(() => {
    seen.current.add(mode)
    if (seen.current.has('ac') && seen.current.has('dc')) onEvent('compared')
  }, [mode, onEvent])

  useEffect(() => {
    let raf = 0
    let dcOffset = 0
    let last = performance.now()
    const history: number[] = Array(160).fill(0)
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const t = now / 1000
      const ac = modeRef.current === 'ac'
      const v = ac ? Math.sin(t * Math.PI * 2 * 0.6) : 1
      history.push(v)
      history.shift()
      if (trace.current) {
        trace.current.setAttribute('points', history.map((val, i) => `${(i / (history.length - 1)) * W},${H / 2 - val * 70}`).join(' '))
      }
      // Electrons: steady drift for DC, back-and-forth wiggle for AC.
      if (!ac) dcOffset = (dcOffset + dt * 0.08) % 1
      const wiggle = ac ? Math.sin(t * Math.PI * 2 * 0.6 - Math.PI / 2) * 0.03 : 0
      dotsRef.current?.childNodes.forEach((node, i) => {
        const u = (((i / DOTS + dcOffset + wiggle) % 1) + 1) % 1
        ;(node as SVGCircleElement).setAttribute('cx', String(20 + u * (W - 40)))
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-900 p-4">
      <div className="mb-3 flex flex-wrap gap-2">
        {(['dc', 'ac'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${mode === m ? 'border-volt bg-volt/15 text-volt' : 'border-ink-600 text-fog-300 hover:text-fog-100'}`}
          >
            {m === 'dc' ? 'DC: battery' : 'AC: wall socket'}
          </button>
        ))}
      </div>
      <div className="text-[11px] uppercase tracking-wider text-fog-400">Electrons in the wire</div>
      <svg viewBox={`0 0 ${W} 60`} className="mt-1 w-full">
        <rect x="10" y="22" width={W - 20} height="16" rx="8" fill="#3a2614" stroke="#d08b4a" strokeOpacity="0.6" />
        <g ref={dotsRef}>
          {Array.from({ length: DOTS }, (_, i) => (
            <circle key={i} cy="30" r="4.5" fill="#7cc4ff" />
          ))}
        </g>
      </svg>
      <div className="mt-3 text-[11px] uppercase tracking-wider text-fog-400">Voltage over time (oscilloscope)</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full rounded-lg bg-ink-950">
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="#1c2742" />
        ))}
        <text x="8" y={H / 2 - 74} fill="#8a9bb8" fontSize="11">
          +
        </text>
        <text x="8" y={H / 2 + 82} fill="#8a9bb8" fontSize="11">
          −
        </text>
        <text x={W - 8} y={H / 2 - 6} fill="#8a9bb8" fontSize="11" textAnchor="end">
          0 V
        </text>
        <polyline ref={trace} fill="none" stroke={mode === 'ac' ? '#a78bfa' : '#fbbf24'} strokeWidth="3" strokeLinejoin="round" />
      </svg>
      <p className="mt-3 text-sm text-fog-300">
        {mode === 'dc'
          ? 'DC: a flat line. The push is steady, so the electrons drift steadily one way.'
          : 'AC: a wave. The push keeps flipping between + and −, so the electrons rock back and forth (slowed right down here; real mains flips 50–60 times a second).'}
      </p>
    </div>
  )
}

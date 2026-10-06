import { useEffect, useState } from 'react'
import type { WidgetProps } from './types'

type Sw = 's1' | 's2' | 's3' | 's4'
// s1 top-left, s2 bottom-left, s3 top-right, s4 bottom-right
const POS: Record<Sw, { x: number; y: number; label: string }> = {
  s1: { x: 120, y: 90, label: 'S1' },
  s2: { x: 120, y: 230, label: 'S2' },
  s3: { x: 380, y: 90, label: 'S3' },
  s4: { x: 380, y: 230, label: 'S4' },
}

export function HBridge({ onEvent }: WidgetProps) {
  const [on, setOn] = useState<Record<Sw, boolean>>({ s1: false, s2: false, s3: false, s4: false })
  const [seen, setSeen] = useState({ fwd: false, rev: false, short: false })
  const short = (on.s1 && on.s2) || (on.s3 && on.s4)
  const fwd = !short && on.s1 && on.s4
  const rev = !short && on.s3 && on.s2
  const state = short ? 'short' : fwd ? 'fwd' : rev ? 'rev' : 'off'

  useEffect(() => {
    setSeen((s) => ({ fwd: s.fwd || fwd, rev: s.rev || rev, short: s.short || short }))
  }, [fwd, rev, short])

  useEffect(() => {
    if (seen.fwd && seen.rev) onEvent('both-ways')
  }, [seen, onEvent])

  const wire = (path: string, live: boolean, danger = false) => (
    <path d={path} stroke={danger ? '#f43f5e' : live ? '#fbbf24' : '#3a4a6b'} strokeWidth={live || danger ? 5 : 4} fill="none" strokeLinejoin="round" className={danger ? 'shake' : undefined} />
  )

  return (
    <div className="grid gap-4 rounded-2xl border border-ink-700 bg-ink-900 p-4 md:grid-cols-[minmax(0,1fr)_200px]">
      <svg viewBox="0 0 500 320" className="w-full">
        <text x="250" y="22" textAnchor="middle" fill="#ef4444" fontSize="13" fontWeight="800">
          battery +
        </text>
        <text x="250" y="312" textAnchor="middle" fill="#38bdf8" fontSize="13" fontWeight="800">
          GND
        </text>
        {wire('M 60 40 H 440', state !== 'off')}
        {wire('M 60 290 H 440', state !== 'off')}
        {wire('M 120 40 V 70', on.s1)}
        {wire('M 120 110 V 160 V 210', on.s1 || on.s2, short && on.s1 && on.s2)}
        {wire('M 120 250 V 290', on.s2)}
        {wire('M 380 40 V 70', on.s3)}
        {wire('M 380 110 V 160 V 210', on.s3 || on.s4, short && on.s3 && on.s4)}
        {wire('M 380 250 V 290', on.s4)}
        {wire('M 120 160 H 200', fwd || rev)}
        {wire('M 300 160 H 380', fwd || rev)}
        {/* motor */}
        <circle cx="250" cy="160" r="48" fill="#1f2937" stroke="#eab308" strokeWidth="5" />
        <text x="250" y="168" textAnchor="middle" fontSize="26" fill={fwd || rev ? '#fde68a' : '#475569'}>
          {fwd ? '↻' : rev ? '↺' : 'M'}
        </text>
        {(Object.keys(POS) as Sw[]).map((k) => {
          const p = POS[k]
          return (
            <g key={k} onClick={() => setOn((o) => ({ ...o, [k]: !o[k] }))} style={{ cursor: 'pointer' }} role="button" aria-label={`Switch ${p.label} ${on[k] ? 'closed' : 'open'}`}>
              <rect x={p.x - 34} y={p.y - 26} width="68" height="52" rx="10" fill="#0b1120" stroke={on[k] ? '#fbbf24' : '#3a4a6b'} strokeWidth="2" />
              <circle cx={p.x} cy={p.y - 16} r="4" fill="#cbd5e1" />
              <circle cx={p.x} cy={p.y + 16} r="4" fill="#cbd5e1" />
              <line x1={p.x} y1={p.y + 16} x2={on[k] ? p.x : p.x + 16} y2={on[k] ? p.y - 16 : p.y - 10} stroke="#e5e7eb" strokeWidth="4" strokeLinecap="round" />
              <text x={p.x - 26} y={p.y + 4} fontSize="12" fontWeight="700" fill="#a9b8d0">
                {p.label}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="space-y-2 text-sm">
        <div className={`rounded-xl border p-3 ${short ? 'border-danger/60 bg-danger/10' : fwd || rev ? 'border-ok/50 bg-ok/10' : 'border-ink-600 bg-ink-950'}`}>
          <div className="text-[10px] uppercase tracking-wider text-fog-400">Motor</div>
          <div className={`font-semibold ${short ? 'text-danger' : fwd || rev ? 'text-ok' : 'text-fog-300'}`}>
            {short ? '⚠️ Short circuit!' : fwd ? 'Spinning forwards' : rev ? 'Spinning backwards' : 'Not moving'}
          </div>
          {short && <p className="mt-1 text-xs text-rose-200">Battery + goes straight to GND down one side. This is called shoot-through.</p>}
        </div>
        <div className="space-y-1 text-xs">
          <div className={seen.fwd ? 'text-ok' : 'text-fog-400'}>{seen.fwd ? '✓' : '○'} Forwards</div>
          <div className={seen.rev ? 'text-ok' : 'text-fog-400'}>{seen.rev ? '✓' : '○'} Backwards</div>
        </div>
        <p className="text-xs text-fog-400">Click a switch to open or close it.</p>
      </div>
    </div>
  )
}

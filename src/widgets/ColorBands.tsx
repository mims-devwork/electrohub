import { useEffect, useMemo, useState } from 'react'
import { formatOhms } from '../sim/parts'
import { BAND_COLORS, BAND_NAMES, resistorDigits } from '../three/models'
import type { WidgetProps } from './types'

const POOL = [100, 220, 330, 470, 680, 1000, 2200, 4700, 10000, 47000]

function ResistorSvg({ ohms }: { ohms: number }) {
  const [d1, d2, m] = resistorDigits(ohms)
  const bands = [d1, d2, m]
  return (
    <svg viewBox="0 0 360 90" className="w-full max-w-md">
      <line x1="0" x2="360" y1="45" y2="45" stroke="#c9ced6" strokeWidth="5" />
      <rect x="70" y="18" width="220" height="54" rx="26" fill="#d8c39b" stroke="#a08660" strokeWidth="2" />
      {bands.map((b, i) => (
        <rect key={i} x={105 + i * 32} y="18" width="16" height="54" fill={BAND_COLORS[b]} />
      ))}
      <rect x="248" y="18" width="14" height="54" fill="#c9a227" />
    </svg>
  )
}

export function ColorBands({ onEvent }: WidgetProps) {
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)

  const { answer, options } = useMemo(() => {
    const answer = POOL[(round * 7 + 3) % POOL.length]
    const others = POOL.filter((v) => v !== answer)
    const opts = [answer, others[(round * 3) % others.length], others[(round * 5 + 2) % others.length], others[(round + 6) % others.length]]
    const unique = [...new Set(opts)]
    while (unique.length < 4) unique.push(others[unique.length])
    return { answer, options: unique.sort((a, b) => a - b) }
  }, [round])

  useEffect(() => {
    if (score >= 3) onEvent('decoded-3')
  }, [score, onEvent])

  const [d1, d2, m] = resistorDigits(answer)

  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-900 p-4">
      <div className="flex items-center justify-between text-xs text-fog-400">
        <span>Resistor #{round + 1}</span>
        <span>
          Correct: <span className="font-mono text-ok">{score}</span> / 3
        </span>
      </div>
      <div className="mt-2 flex justify-center">
        <ResistorSvg ohms={answer} />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs text-fog-300">
        {[d1, d2, m].map((b, i) => (
          <div key={i} className="rounded-md bg-ink-950 px-2 py-1.5">
            <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: BAND_COLORS[b] }} />
            {BAND_NAMES[b]}
            <div className="text-[10px] text-fog-400">{i < 2 ? `digit ${i + 1}` : 'zeros'}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {options.map((o) => {
          const state = picked === null ? 'idle' : o === answer ? 'right' : o === picked ? 'wrong' : 'idle'
          return (
            <button
              key={o}
              disabled={picked !== null}
              onClick={() => {
                setPicked(o)
                if (o === answer) setScore((s) => s + 1)
              }}
              className={`rounded-lg border px-3 py-2 font-mono text-sm ${
                state === 'right' ? 'border-ok bg-ok/15 text-ok' : state === 'wrong' ? 'border-danger bg-danger/15 text-rose-200' : 'border-ink-600 text-fog-100 hover:border-fog-400'
              }`}
            >
              {formatOhms(o)}
            </button>
          )
        })}
      </div>
      {picked !== null && (
        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
          <span className="text-fog-300">
            {d1}
            {d2} + {m} zero{m === 1 ? '' : 's'} = <span className="font-mono text-fog-100">{answer.toLocaleString()} Ω</span>
          </span>
          <button
            onClick={() => {
              setPicked(null)
              setRound((r) => r + 1)
            }}
            className="rounded-lg bg-ink-700 px-3 py-1.5 text-fog-100 hover:bg-ink-600"
          >
            Next resistor →
          </button>
        </div>
      )}
    </div>
  )
}

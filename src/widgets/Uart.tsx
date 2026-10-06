import { useEffect, useRef, useState } from 'react'
import type { WidgetProps } from './types'

const LETTERS = ['A', 'B', 'H', 'i', '7', '!']
/** Slowed right down: real serial at 9600 baud sends a bit every 0.1 ms. */
const BIT_MS = 260

/** Start bit (0), 8 data bits least-significant first, stop bit (1). */
const frameBits = (ch: string) => [0, ...Array.from({ length: 8 }, (_, i) => (ch.charCodeAt(0) >> i) & 1), 1]

export function Uart({ onEvent }: WidgetProps) {
  const [letter, setLetter] = useState('A')
  const [sending, setSending] = useState<{ ch: string; bit: number } | null>(null)
  const [received, setReceived] = useState('')
  const timer = useRef<ReturnType<typeof setInterval>>(undefined)

  useEffect(() => {
    if (received.length >= 3) onEvent('sent-3')
  }, [received, onEvent])

  useEffect(() => () => clearInterval(timer.current), [])

  const send = () => {
    if (sending) return
    let bit = 0
    setSending({ ch: letter, bit })
    timer.current = setInterval(() => {
      bit++
      if (bit >= 10) {
        clearInterval(timer.current)
        setSending(null)
        setReceived((r) => (r + letter).slice(-16))
      } else setSending({ ch: letter, bit })
    }, BIT_MS)
  }

  const ch = sending?.ch ?? letter
  const bits = frameBits(ch)
  const W = 600
  const cell = (W - 40) / 10
  const y = (b: number) => (b ? 30 : 80)
  const shown = sending ? sending.bit + 1 : 10
  const points = bits
    .slice(0, shown)
    .flatMap((b, i) => [`${20 + i * cell},${y(b)}`, `${20 + (i + 1) * cell},${y(b)}`])
  const idle = `0,${y(1)} 20,${y(1)}`

  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-900 p-4">
      <div className="flex flex-wrap items-center gap-2">
        {LETTERS.map((l) => (
          <button
            key={l}
            onClick={() => !sending && setLetter(l)}
            className={`h-9 w-9 rounded-lg border font-mono text-sm ${letter === l ? 'border-volt bg-volt/15 text-volt' : 'border-ink-600 text-fog-200 hover:text-fog-100'}`}
          >
            {l}
          </button>
        ))}
        <span className="ml-2 font-mono text-xs text-fog-400">
          ‘{letter}’ = {letter.charCodeAt(0)} = {letter.charCodeAt(0).toString(2).padStart(8, '0')}
        </span>
        <button onClick={send} disabled={!!sending} className="ml-auto rounded-lg bg-volt px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-amber-300 disabled:opacity-40">
          Send →
        </button>
      </div>
      <div className="mt-3 text-[11px] uppercase tracking-wider text-fog-400">TX wire, slowed right down</div>
      <svg viewBox={`0 0 ${W} 130`} className="mt-1 w-full rounded-lg bg-ink-950">
        <text x={W - 6} y="26" textAnchor="end" fontSize="10" fill="#8a9bb8">
          HIGH (1)
        </text>
        <text x={W - 6} y="96" textAnchor="end" fontSize="10" fill="#8a9bb8">
          LOW (0)
        </text>
        {bits.map((b, i) => (
          <g key={i} opacity={i < shown ? 1 : 0.25}>
            <rect x={20 + i * cell} y="96" width={cell} height="26" fill={i === 0 || i === 9 ? '#1c2742' : 'transparent'} />
            <text x={20 + (i + 0.5) * cell} y="114" textAnchor="middle" fontSize="11" fill={i === 0 || i === 9 ? '#8a9bb8' : '#e8eef7'} fontFamily="JetBrains Mono, monospace">
              {i === 0 ? 'start' : i === 9 ? 'stop' : b}
            </text>
          </g>
        ))}
        <polyline points={`${idle} ${points.join(' ')}`} fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinejoin="round" />
      </svg>
      <p className="mt-1 text-xs text-fog-400">Data bits go out smallest first, so read them right to left to get the binary number.</p>
      <div className="mt-3 rounded-lg border border-ink-600 bg-ink-950 px-3 py-2 font-mono text-sm">
        <span className="text-fog-400">Received: </span>
        <span className="text-volt">{received || '…'}</span>
      </div>
    </div>
  )
}

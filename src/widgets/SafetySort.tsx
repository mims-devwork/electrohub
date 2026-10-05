import { useEffect, useState } from 'react'
import type { WidgetProps } from './types'

const CARDS = [
  { id: 'touch9v', text: 'Touching both terminals of a 9 V battery with your fingers', safe: true, why: 'Low voltage can’t push a dangerous current through your skin.' },
  { id: 'shortlipo', text: 'Connecting a bare wire straight across a lithium battery', safe: false, why: 'That’s a short circuit. A huge current flows, and the wire and battery get hot fast. Lithium cells can catch fire.' },
  { id: 'mains', text: 'Cutting open a wall plug to power your robot', safe: false, why: 'Mains electricity can kill. Use a proper power adapter instead, which gives safe low-voltage DC.' },
  { id: 'unplug', text: 'Unplugging the battery before moving wires around', safe: true, why: 'It’s a great habit. It prevents accidental shorts while your hands are in the circuit.' },
  { id: 'hot', text: 'Carrying on when a part is too hot to touch', safe: false, why: 'Heat means too much current or the wrong part. Disconnect and find out why.' },
  { id: 'fuse', text: 'Adding a fuse to your robot’s battery lead', safe: true, why: 'If something shorts, the fuse melts first and protects everything else.' },
]

export function SafetySort({ onEvent }: WidgetProps) {
  const [answers, setAnswers] = useState<Record<string, boolean>>({})
  const allRight = CARDS.every((c) => answers[c.id] === c.safe)

  useEffect(() => {
    if (allRight) onEvent('sorted')
  }, [allRight, onEvent])

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {CARDS.map((c) => {
        const a = answers[c.id]
        const answered = a !== undefined
        const right = answered && a === c.safe
        return (
          <div key={c.id} className={`rounded-xl border p-3 transition-colors ${!answered ? 'border-ink-600 bg-ink-900' : right ? 'border-ok/50 bg-ok/10' : 'border-danger/50 bg-danger/10 shake'}`}>
            <p className="text-sm text-fog-100">{c.text}</p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setAnswers((s) => ({ ...s, [c.id]: true }))}
                className={`rounded-md border px-2.5 py-1 text-xs ${a === true ? 'border-ok bg-ok/20 text-ok' : 'border-ink-600 text-fog-300 hover:text-fog-100'}`}
              >
                ✓ Safe
              </button>
              <button
                onClick={() => setAnswers((s) => ({ ...s, [c.id]: false }))}
                className={`rounded-md border px-2.5 py-1 text-xs ${a === false ? 'border-danger bg-danger/20 text-rose-200' : 'border-ink-600 text-fog-300 hover:text-fog-100'}`}
              >
                ✋ Stop
              </button>
            </div>
            {answered && <p className={`mt-2 text-xs ${right ? 'text-fog-300' : 'text-rose-200'}`}>{right ? c.why : 'Not quite. Think again.'}</p>}
          </div>
        )
      })}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { PIN_BY_ID } from '../micro/board'
import { BenchDefs, BoardGlyph } from '../micro/glyphs'
import type { BoardPin } from '../micro/types'
import type { WidgetProps } from './types'

const TASKS: { ask: string; ok: BoardPin[]; why: string }[] = [
  { ask: 'Find a ground pin: the board’s 0 V.', ok: ['GND', 'GND2'], why: 'Every circuit needs a way back. All the GND pins are joined together inside the board.' },
  { ask: 'Find the pin that gives a steady 5 V for powering parts.', ok: ['5V'], why: 'The 5V pin feeds sensors, knobs and small circuits. It’s always on while the board has power.' },
  { ask: 'Find the pin that can measure any voltage between 0 and 5 V.', ok: ['A0'], why: 'A is for analog. This is the pin you read the knob with in Experiment 04.' },
  { ask: 'Find a pin that can do PWM. Look for the ~ symbol.', ok: ['D9'], why: 'The ~ marks pins that can switch on and off very fast to fake in-between levels. You’ll use it to dim LEDs and set motor speeds.' },
  { ask: 'Find the pin that is also wired to the little “L” LED on the board.', ok: ['D13'], why: 'Pin 13 has a tiny LED of its own on the board, which is handy for testing code with no wiring at all.' },
]

/** Click the right pin on the board for each instruction. */
export function PinFinder({ onEvent }: WidgetProps) {
  const [task, setTask] = useState(0)
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string; pin: BoardPin } | null>(null)
  const done = task >= TASKS.length

  useEffect(() => {
    if (done) onEvent('pins-found')
  }, [done, onEvent])

  const click = (pin: BoardPin) => {
    if (done) return
    const t = TASKS[task]
    if (t.ok.includes(pin)) {
      setFeedback({ ok: true, text: t.why, pin })
      setTask((i) => i + 1)
    } else {
      setFeedback({ ok: false, text: `Not that one. ${PIN_BY_ID[pin].hint}`, pin })
    }
  }

  return (
    <div className="grid gap-4 rounded-2xl border border-ink-700 bg-ink-900 p-4 md:grid-cols-[minmax(0,1fr)_260px]">
      <svg viewBox="0 20 420 440" className="mx-auto w-full max-w-md">
        <BenchDefs />
        <BoardGlyph onPin={click} activePin={feedback?.ok ? feedback.pin : null} highlight={feedback && !feedback.ok ? [feedback.pin] : []} ledL />
      </svg>
      <div className="space-y-3">
        <div className="flex gap-1" aria-label={`${Math.min(task, TASKS.length)} of ${TASKS.length} found`}>
          {TASKS.map((_, i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full ${i < task ? 'bg-ok' : i === task ? 'bg-volt' : 'bg-ink-600'}`} />
          ))}
        </div>
        <div className="rounded-xl border border-volt/40 bg-volt/10 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-volt">{done ? 'All found' : `Pin ${task + 1} of ${TASKS.length}`}</div>
          <p className="mt-1 text-sm text-fog-100">{done ? 'You know your way round the board.' : TASKS[task].ask}</p>
        </div>
        {feedback && (
          <p key={`${task}-${feedback.pin}`} className={`rise-in rounded-xl border p-3 text-sm ${feedback.ok ? 'border-ok/40 bg-ok/10 text-fog-200' : 'shake border-danger/40 bg-danger/10 text-rose-100'}`}>
            {feedback.ok && <span className="font-semibold text-ok">✓ {PIN_BY_ID[feedback.pin].label}. </span>}
            {feedback.text}
          </p>
        )}
      </div>
    </div>
  )
}

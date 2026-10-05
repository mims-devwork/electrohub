import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/primitives'
import type { WidgetProps } from './types'

const DELAYS = [50, 100, 200, 500, 1000, 2000]

/** Blink, line by line. `kind` says what running the line does. */
const LINES: { code: string; kind?: 'mode' | 'on' | 'wait1' | 'off' | 'wait2' | 'end'; explain?: string }[] = [
  { code: 'void setup() {' },
  { code: '  pinMode(13, OUTPUT);', kind: 'mode', explain: 'pinMode(13, OUTPUT): pin 13 will be an output, so the program can switch it on and off.' },
  { code: '}' },
  { code: '' },
  { code: 'void loop() {' },
  { code: '  digitalWrite(13, HIGH);   // LED on', kind: 'on', explain: 'digitalWrite(13, HIGH): pin 13 jumps to 5 V, and the LED lights.' },
  { code: '  delay(#1);                // wait', kind: 'wait1', explain: 'delay: the board waits and does nothing else. The LED stays on.' },
  { code: '  digitalWrite(13, LOW);    // LED off', kind: 'off', explain: 'digitalWrite(13, LOW): pin 13 drops to 0 V, and the LED goes out.' },
  { code: '  delay(#2);                // wait', kind: 'wait2', explain: 'delay: the board waits again. The LED stays off.' },
  { code: '}', kind: 'end', explain: 'The end of loop(). The board jumps straight back to the top of loop() and does it all again.' },
]

const LOOP_ORDER = [5, 6, 7, 8, 9]

function DelaySelect({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled: boolean }) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label="Delay in milliseconds"
      className="cursor-pointer rounded border border-brain/60 bg-brain/15 px-1 font-mono text-[12.5px] text-brain disabled:cursor-default disabled:border-transparent disabled:bg-transparent disabled:text-fog-400"
    >
      {DELAYS.map((d) => (
        <option key={d} value={d} className="bg-ink-900 text-fog-100">
          {d}
        </option>
      ))}
    </select>
  )
}

/**
 * Blink, either stepped one line at a time (mode "step") or running in real
 * time with editable delays (mode "edit").
 */
export function CodeStepper({ onEvent, props }: WidgetProps) {
  const mode = (props?.mode as 'step' | 'edit') ?? 'step'
  const [delays, setDelays] = useState<[number, number]>([1000, 1000])
  /** Index into LINES of the line that just ran (−1 = not started). */
  const [pc, setPc] = useState(-1)
  const [pinOutput, setPinOutput] = useState(false)
  const [led, setLed] = useState(false)
  const [clock, setClock] = useState(0)
  const [passes, setPasses] = useState(0)
  const [trace, setTrace] = useState<number[]>(() => Array(120).fill(0))
  const ledRef = useRef(led)
  ledRef.current = led

  const run = (line: number) => {
    const kind = LINES[line].kind
    if (kind === 'mode') setPinOutput(true)
    if (kind === 'on') setLed(true)
    if (kind === 'off') setLed(false)
    if (kind === 'wait1') setClock((c) => c + delays[0])
    if (kind === 'wait2') setClock((c) => c + delays[1])
    if (kind === 'end') setPasses((p) => p + 1)
    setPc(line)
  }

  const step = () => {
    if (pc < 1) return run(1)
    const i = LOOP_ORDER.indexOf(pc)
    run(i === -1 || i === LOOP_ORDER.length - 1 ? LOOP_ORDER[0] : LOOP_ORDER[i + 1])
  }

  // Real-time mode: walk the loop with the real delays.
  useEffect(() => {
    if (mode !== 'edit') return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    let idx = 0
    setPinOutput(true)
    const tick = () => {
      if (cancelled) return
      const line = LOOP_ORDER[idx]
      const kind = LINES[line].kind
      setPc(line)
      if (kind === 'on') setLed(true)
      if (kind === 'off') setLed(false)
      idx = (idx + 1) % LOOP_ORDER.length
      const wait = kind === 'wait1' ? delays[0] : kind === 'wait2' ? delays[1] : 20
      timer = setTimeout(tick, wait)
    }
    tick()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [mode, delays])

  useEffect(() => {
    if (mode !== 'edit') return
    const t = setInterval(() => setTrace((tr) => [...tr.slice(1), ledRef.current ? 1 : 0]), 40)
    return () => clearInterval(t)
  }, [mode])

  useEffect(() => {
    if (mode === 'step' && passes >= 1) onEvent('blink-cycle')
  }, [mode, passes, onEvent])

  useEffect(() => {
    if (mode === 'edit' && delays[0] <= 200 && delays[1] <= 200) onEvent('fast-blink')
  }, [mode, delays, onEvent])

  const reset = () => {
    setPc(-1)
    setPinOutput(false)
    setLed(false)
    setClock(0)
  }

  const current = LINES[pc]

  return (
    <div className="grid gap-4 rounded-2xl border border-ink-700 bg-ink-900 p-4 md:grid-cols-[minmax(0,1fr)_220px]">
      <div>
        <pre className="overflow-x-auto rounded-lg bg-ink-950 p-3 font-mono text-[12.5px] leading-6 scrollbar-thin">
          {LINES.map((l, i) => {
            const active = pc === i
            const parts = l.code.split(/(#1|#2)/)
            return (
              <div key={i} className={`flex items-center rounded px-1 transition-colors ${active ? 'bg-brain/20 text-fog-100' : 'text-fog-400'}`}>
                <span className="mr-2 w-3 shrink-0 text-brain">{active ? '▶' : ''}</span>
                <span className="whitespace-pre">
                  {parts.map((p, j) =>
                    p === '#1' || p === '#2' ? (
                      <DelaySelect key={j} value={delays[p === '#1' ? 0 : 1]} disabled={mode !== 'edit'} onChange={(v) => setDelays((d) => (p === '#1' ? [v, d[1]] : [d[0], v]))} />
                    ) : (
                      <span key={j}>{p || ' '}</span>
                    ),
                  )}
                </span>
              </div>
            )
          })}
        </pre>
        {mode === 'step' ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={step}>
              {pc < 0 ? 'Power on & step ▶' : 'Step ▶'}
            </Button>
            <Button variant="ghost" onClick={reset}>
              ↺ Reset
            </Button>
            <span className="text-xs text-fog-400">Passes through loop(): {passes}</span>
          </div>
        ) : (
          <p className="mt-2 text-xs text-fog-400">The purple numbers are yours to change. The board runs the new version straight away.</p>
        )}
        {mode === 'step' && (
          <p className="mt-3 min-h-[2.5rem] rounded-lg bg-ink-800 px-3 py-2 text-sm text-fog-200">{current?.explain ?? 'Press the button to power the board on. setup() runs first, once.'}</p>
        )}
      </div>
      <div className="space-y-3">
        <div className="rounded-xl border border-ink-600 bg-ink-950 p-3">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-fog-400">
            <span>Pin 13</span>
            <span className={pinOutput ? 'text-ok' : ''}>{pinOutput ? 'OUTPUT' : 'not set'}</span>
          </div>
          <div className="mt-3 flex items-center justify-center gap-4">
            <svg viewBox="-30 -30 60 60" className="h-16 w-16">
              {led && <circle r="26" fill="#ff3b3b" opacity="0.35" style={{ filter: 'blur(4px)' }} />}
              <circle r="16" fill="#ff3b3b" opacity={led ? 1 : 0.25} stroke="#ff3b3b" strokeWidth="2" />
              <circle r="6" fill={led ? '#fff' : '#0b1120'} opacity={led ? 0.9 : 0.4} />
            </svg>
            <div className={`font-mono text-xl ${led ? 'text-volt' : 'text-flow'}`}>{led ? '5 V' : '0 V'}</div>
          </div>
        </div>
        {mode === 'step' ? (
          <div className="rounded-xl border border-ink-600 bg-ink-950 p-3 text-center">
            <div className="text-[11px] uppercase tracking-wider text-fog-400">Time since power-on</div>
            <div className="font-mono text-2xl text-fog-100">{(clock / 1000).toFixed(1)} s</div>
            <div className="text-[11px] text-fog-400">Only delay() takes noticeable time.</div>
          </div>
        ) : (
          <div className="rounded-xl border border-ink-600 bg-ink-950 p-3">
            <div className="text-[11px] uppercase tracking-wider text-fog-400">Pin 13 over time</div>
            <svg viewBox="0 0 200 50" className="mt-1 w-full">
              <polyline points={trace.map((v, i) => `${(i / (trace.length - 1)) * 200},${44 - v * 36}`).join(' ')} fill="none" stroke="#34d399" strokeWidth="2" />
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}

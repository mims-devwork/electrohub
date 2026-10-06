import { useEffect, useState } from 'react'
import type { WidgetProps } from './types'

type Kind = 'analog' | 'onoff' | 'pulses' | 'data'

const KINDS: { id: Kind; label: string }[] = [
  { id: 'analog', label: 'Analog voltage' },
  { id: 'onoff', label: 'On / off' },
  { id: 'pulses', label: 'Pulses' },
  { id: 'data', label: 'Data' },
]

const SENSORS: { id: string; icon: string; name: string; kind: Kind; why: string }[] = [
  { id: 'ldr', icon: '💡', name: 'Light sensor (LDR in a divider)', kind: 'analog', why: 'Brighter light, higher voltage. Read it with analogRead.' },
  { id: 'bump', icon: '🛑', name: 'Bump switch on the front bumper', kind: 'onoff', why: 'It’s a button: pressed or not. Read it with digitalRead.' },
  { id: 'sonar', icon: '🦇', name: 'Ultrasonic distance sensor', kind: 'pulses', why: 'It answers with a pulse whose length is the echo time.' },
  { id: 'tmp', icon: '🌡️', name: 'TMP36 temperature sensor', kind: 'analog', why: '10 mV per degree. Read it with analogRead.' },
  { id: 'enc', icon: '⚙️', name: 'Wheel encoder', kind: 'pulses', why: 'One pulse per slot. Count them to know how far the wheel turned.' },
  { id: 'imu', icon: '🧭', name: 'Accelerometer (which way is down?)', kind: 'data', why: 'It has its own chip and sends numbers over I²C.' },
]

export function SensorSort({ onEvent }: WidgetProps) {
  const [answers, setAnswers] = useState<Record<string, Kind>>({})
  const allRight = SENSORS.every((s) => answers[s.id] === s.kind)

  useEffect(() => {
    if (allRight) onEvent('sorted')
  }, [allRight, onEvent])

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {SENSORS.map((s) => {
        const a = answers[s.id]
        const right = a === s.kind
        return (
          <div key={s.id} className={`rounded-xl border p-3 transition-colors ${!a ? 'border-ink-600 bg-ink-900' : right ? 'border-ok/50 bg-ok/10' : 'shake border-danger/50 bg-danger/10'}`}>
            <p className="text-sm text-fog-100">
              <span className="mr-1.5" aria-hidden>
                {s.icon}
              </span>
              {s.name}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {KINDS.map((k) => (
                <button
                  key={k.id}
                  onClick={() => setAnswers((x) => ({ ...x, [s.id]: k.id }))}
                  className={`rounded-md border px-2 py-1 text-xs ${a === k.id ? (right ? 'border-ok bg-ok/20 text-ok' : 'border-danger bg-danger/20 text-rose-200') : 'border-ink-600 text-fog-300 hover:text-fog-100'}`}
                >
                  {k.label}
                </button>
              ))}
            </div>
            {a && <p className={`mt-2 text-xs ${right ? 'text-fog-300' : 'text-rose-200'}`}>{right ? s.why : 'Not quite. How does it give its answer?'}</p>}
          </div>
        )
      })}
    </div>
  )
}

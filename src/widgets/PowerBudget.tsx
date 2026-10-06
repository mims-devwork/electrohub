import { useEffect, useState } from 'react'
import type { WidgetProps } from './types'

const PARTS = [
  { id: 'mcu', icon: '🧠', name: 'Microcontroller board', mA: 50 },
  { id: 'sonar', icon: '📡', name: 'Distance sensor', mA: 15 },
  { id: 'servo', icon: '🦾', name: 'Servo (average)', mA: 150 },
  { id: 'motors', icon: '⚙️', name: '2 drive motors (average)', mA: 600 },
  { id: 'lights', icon: '💡', name: 'Headlight LEDs', mA: 40 },
]

const BATTERIES = [
  { id: '9v', name: '9 V battery', mAh: 500 },
  { id: 'aa', name: '4 × AA rechargeable', mAh: 2000 },
  { id: 'li', name: '2-cell Li-ion pack', mAh: 2600 },
]

/** Batteries don't like being drained flat, so plan on using about 80%. */
const USABLE = 0.8
const TARGET_HOURS = 2

export function PowerBudget({ onEvent }: WidgetProps) {
  const [on, setOn] = useState<Record<string, boolean>>({ mcu: true, sonar: true })
  const [battery, setBattery] = useState('9v')
  const total = PARTS.reduce((s, p) => s + (on[p.id] ? p.mA : 0), 0)
  const bat = BATTERIES.find((b) => b.id === battery)!
  const hours = total ? (bat.mAh * USABLE) / total : 0
  const allOn = PARTS.every((p) => on[p.id])
  const ok = allOn && hours >= TARGET_HOURS

  useEffect(() => {
    if (ok) onEvent('budget-ok')
  }, [ok, onEvent])

  return (
    <div className="grid gap-4 rounded-2xl border border-ink-700 bg-ink-900 p-4 md:grid-cols-2">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-fog-400">What the robot carries</div>
        <div className="mt-2 space-y-1.5">
          {PARTS.map((p) => (
            <label key={p.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm ${on[p.id] ? 'border-volt/40 bg-volt/5 text-fog-100' : 'border-ink-600 text-fog-400'}`}>
              <input type="checkbox" checked={!!on[p.id]} onChange={(e) => setOn((o) => ({ ...o, [p.id]: e.target.checked }))} className="accent-amber-400" />
              <span aria-hidden>{p.icon}</span>
              <span className="flex-1">{p.name}</span>
              <span className="font-mono text-xs">{p.mA} mA</span>
            </label>
          ))}
        </div>
        <div className="mt-3 text-[11px] uppercase tracking-wider text-fog-400">Where the current goes</div>
        <div className="mt-1 flex h-4 overflow-hidden rounded-full bg-ink-700">
          {PARTS.filter((p) => on[p.id]).map((p, i) => (
            <div key={p.id} title={`${p.name}: ${p.mA} mA`} style={{ width: `${(p.mA / Math.max(1, total)) * 100}%`, background: ['#a78bfa', '#38bdf8', '#34d399', '#f472b6', '#fbbf24'][PARTS.indexOf(p) % 5] }} className={i ? 'border-l border-ink-950' : ''} />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-fog-400">Battery</div>
        <div className="flex flex-wrap gap-2">
          {BATTERIES.map((b) => (
            <button
              key={b.id}
              onClick={() => setBattery(b.id)}
              className={`rounded-lg border px-3 py-1.5 text-sm ${battery === b.id ? 'border-volt bg-volt/15 text-volt' : 'border-ink-600 text-fog-300 hover:text-fog-100'}`}
            >
              {b.name} · {b.mAh} mAh
            </button>
          ))}
        </div>
        <div className="rounded-xl border border-ink-600 bg-ink-950 p-3 font-mono text-sm text-fog-200">
          <div>
            Total current: <span className="text-volt">{total} mA</span>
          </div>
          <div className="mt-1">
            Running time ≈ {bat.mAh} mAh × 0.8 ÷ {total || '…'} mA
          </div>
          <div className={`mt-1 text-2xl ${ok ? 'text-ok' : hours >= TARGET_HOURS ? 'text-volt' : 'text-danger'}`}>{total ? `${hours.toFixed(1)} hours` : '—'}</div>
        </div>
        <p className="text-sm text-fog-300">
          {!allOn ? 'Switch on everything the robot carries: a budget has to include all of it.' : ok ? 'That battery keeps everything going for over 2 hours.' : 'Not enough for 2 hours. Try a battery with more capacity.'}
        </p>
      </div>
    </div>
  )
}

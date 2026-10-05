import { useEffect, useState } from 'react'
import { BOARD } from '../micro/board'
import type { WidgetProps } from './types'

type Zone = 'low' | 'unsure' | 'high'

const zoneOf = (v: number): Zone => (v <= BOARD.lowMax ? 'low' : v >= BOARD.highMin ? 'high' : 'unsure')

const ZONES: { id: Zone; from: number; to: number; label: string; color: string }[] = [
  { id: 'low', from: 0, to: BOARD.lowMax, label: 'Always LOW', color: '#38bdf8' },
  { id: 'unsure', from: BOARD.lowMax, to: BOARD.highMin, label: 'Not guaranteed', color: '#fb923c' },
  { id: 'high', from: BOARD.highMin, to: 5, label: 'Always HIGH', color: '#fbbf24' },
]

/** A digital input pin: slide its voltage and see what the chip decides it is. */
export function LogicThreshold({ onEvent }: WidgetProps) {
  const [v, setV] = useState(0.4)
  const [visited, setVisited] = useState<Zone[]>(['low'])
  const [reading, setReading] = useState<0 | 1>(0)
  const zone = zoneOf(v)

  useEffect(() => {
    setVisited((z) => (z.includes(zone) ? z : [...z, zone]))
    if (zone !== 'unsure') {
      setReading(zone === 'high' ? 1 : 0)
      return
    }
    // In the middle the chip can go either way, so let it flicker.
    const t = setInterval(() => setReading((r) => (Math.random() < 0.45 ? ((1 - r) as 0 | 1) : r)), 180)
    return () => clearInterval(t)
  }, [zone])

  useEffect(() => {
    if (visited.length === 3) onEvent('found-zones')
  }, [visited, onEvent])

  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-900 p-4">
      <div className="grid gap-4 md:grid-cols-[1fr_200px]">
        <div>
          <label className="text-[11px] uppercase tracking-wider text-fog-400" htmlFor="logic-v">
            Voltage on the pin
          </label>
          <input id="logic-v" type="range" min={0} max={5} step={0.05} value={v} onChange={(e) => setV(Number(e.target.value))} className="mt-2 w-full" />
          <div className="relative mt-3 h-9 overflow-hidden rounded-lg">
            {ZONES.map((z) => {
              const seen = visited.includes(z.id)
              return (
                <div
                  key={z.id}
                  className="absolute inset-y-0 flex items-center justify-center text-[11px] font-semibold"
                  style={{
                    left: `${(z.from / 5) * 100}%`,
                    width: `${((z.to - z.from) / 5) * 100}%`,
                    background: seen ? `color-mix(in oklab, ${z.color} 22%, transparent)` : 'var(--color-ink-800)',
                    color: seen ? z.color : 'var(--color-fog-400)',
                    borderRight: '1px solid var(--color-ink-950)',
                  }}
                >
                  {seen ? z.label : '?'}
                </div>
              )
            })}
            <div className="absolute inset-y-0 w-0.5 bg-fog-100" style={{ left: `${(v / 5) * 100}%` }} />
          </div>
          <div className="mt-1 flex justify-between font-mono text-[10px] text-fog-400">
            <span>0 V</span>
            <span>{visited.includes('low') && visited.includes('unsure') ? `${BOARD.lowMax} V` : ''}</span>
            <span>{visited.includes('unsure') && visited.includes('high') ? `${BOARD.highMin} V` : ''}</span>
            <span>5 V</span>
          </div>
        </div>
        <div className="rounded-xl border border-ink-600 bg-ink-950 p-3 text-center">
          <div className="text-[10px] uppercase tracking-wider text-fog-400">Voltmeter</div>
          <div className="font-mono text-2xl text-fog-100">{v.toFixed(2)} V</div>
          <div className="mt-2 text-[10px] uppercase tracking-wider text-fog-400">digitalRead says</div>
          <div className={`font-mono text-2xl ${reading ? 'text-volt' : 'text-flow'} ${zone === 'unsure' ? 'opacity-80' : ''}`}>{reading ? 'HIGH (1)' : 'LOW (0)'}</div>
          {zone === 'unsure' && <div className="mt-1 text-xs text-warn">…or is it? It keeps changing its mind.</div>}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import type { WidgetProps } from './types'

type Kind = 'linear' | 'switching'
const VOUT = 5
/** A 7805-style linear regulator needs about 2 V more in than out. */
const LINEAR_HEADROOM = 2
const SWITCHING_HEADROOM = 0.5
const EFFICIENCY = 0.9
/** Below this the microcontroller resets. */
const BROWNOUT = 4.5

export function Regulator({ onEvent }: WidgetProps) {
  const [kind, setKind] = useState<Kind>('linear')
  const [vin, setVin] = useState(9)
  const [ma, setMa] = useState(200)
  const [seen, setSeen] = useState({ reset: false, hot: false, switching: false })
  const amps = ma / 1000
  const headroom = kind === 'linear' ? LINEAR_HEADROOM : SWITCHING_HEADROOM
  const vout = Math.min(VOUT, Math.max(0, vin - headroom))
  const heat = kind === 'linear' ? Math.max(0, vin - vout) * amps : ((vout * amps) / EFFICIENCY) * (1 - EFFICIENCY)
  const reset = vout < BROWNOUT
  const hot = heat > 1

  useEffect(() => {
    setSeen((s) => ({ reset: s.reset || (kind === 'linear' && reset), hot: s.hot || (kind === 'linear' && hot), switching: s.switching || kind === 'switching' }))
  }, [kind, reset, hot])

  useEffect(() => {
    if (seen.reset && seen.hot && seen.switching) onEvent('regulator-explored')
  }, [seen, onEvent])

  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-900 p-4">
      <div className="flex flex-wrap gap-2">
        {(['linear', 'switching'] as Kind[]).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${kind === k ? 'border-volt bg-volt/15 text-volt' : 'border-ink-600 text-fog-300 hover:text-fog-100'}`}
          >
            {k === 'linear' ? 'Linear (7805)' : 'Switching (buck)'}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <div className="space-y-3">
          <label className="block text-sm text-fog-300">
            <div className="flex justify-between">
              <span>Battery voltage in</span>
              <span className="font-mono text-volt">{vin.toFixed(1)} V</span>
            </div>
            <input type="range" min={4} max={12} step={0.1} value={vin} onChange={(e) => setVin(Number(e.target.value))} className="mt-1 w-full" aria-label="Input voltage" />
          </label>
          <label className="block text-sm text-fog-300">
            <div className="flex justify-between">
              <span>Current the brain and sensors draw</span>
              <span className="font-mono text-volt">{ma} mA</span>
            </div>
            <input type="range" min={50} max={500} step={10} value={ma} onChange={(e) => setMa(Number(e.target.value))} className="mt-1 w-full" aria-label="Load current" />
          </label>
        </div>
        <div className={`mx-auto grid h-24 w-28 place-items-center rounded-xl border-2 text-center ${hot ? 'border-danger bg-danger/15' : 'border-ink-500 bg-ink-950'}`}>
          <div>
            <div className="text-2xl" aria-hidden>
              {hot ? '🔥' : kind === 'linear' ? '▣' : '〰️'}
            </div>
            <div className="font-mono text-xs text-fog-300">{heat.toFixed(2)} W heat</div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="rounded-lg border border-ink-600 bg-ink-950 p-3">
            <div className="text-[10px] uppercase tracking-wider text-fog-400">Voltage out</div>
            <div className={`font-mono text-2xl ${reset ? 'text-danger' : 'text-ok'}`}>{vout.toFixed(2)} V</div>
          </div>
          <div className={`rounded-lg border p-3 text-sm ${reset ? 'border-danger/60 bg-danger/10 text-rose-200' : 'border-ok/40 bg-ok/10 text-fog-100'}`}>
            {reset ? '🔄 Board keeps resetting: not enough voltage' : '✓ Board running happily'}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className={`rounded-md border px-2 py-1 ${seen.reset ? 'border-ok/50 text-ok' : 'border-ink-600 text-fog-400'}`}>{seen.reset ? '✓' : '○'} Linear: cause a reset</span>
        <span className={`rounded-md border px-2 py-1 ${seen.hot ? 'border-ok/50 text-ok' : 'border-ink-600 text-fog-400'}`}>{seen.hot ? '✓' : '○'} Linear: over 1 W of heat</span>
        <span className={`rounded-md border px-2 py-1 ${seen.switching ? 'border-ok/50 text-ok' : 'border-ink-600 text-fog-400'}`}>{seen.switching ? '✓' : '○'} Try the switching one</span>
      </div>
    </div>
  )
}

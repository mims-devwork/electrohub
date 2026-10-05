import { Link } from 'react-router-dom'
import { BATTERY_OPTIONS, ELECTRICAL, LED_SPECS, PART_DEFS, RESISTOR_OPTIONS, formatAmps, formatOhms, formatVolts, formatWatts } from '../sim/parts'
import type { LedColor, Part, PartResult } from '../sim/types'
import { Button, Meter } from '../ui/primitives'
import type { CircuitApi } from './useCircuit'

function explain(part: Part, r: PartResult | undefined): string {
  const i = Math.abs(r?.current ?? 0)
  const v = Math.abs(r?.voltage ?? 0)
  switch (part.kind) {
    case 'battery':
      return i > 1e-5
        ? `Pushing with ${part.props.voltage} V and sending ${formatAmps(i)} round the loop.`
        : `Ready to push with ${part.props.voltage} V, but there’s no complete loop, so nothing flows yet.`
    case 'resistor':
      return i > 1e-5
        ? `${formatVolts(v)} across it and ${formatAmps(i)} through it. Check with Ohm’s law: ${v.toFixed(2)} V ÷ ${formatOhms(part.props.ohms ?? 0)} = ${formatAmps(v / (part.props.ohms ?? 1))}.`
        : 'No current is passing through. Is it part of a complete loop?'
    case 'led':
      if (part.props.burnt) return 'Burned out. Too much current destroyed it. Replace it and limit the current with a resistor.'
      if (r?.overload) return `${formatAmps(i)} is far too much! It’s about to burn out.`
      if (r?.ledState === 'on') return `Glowing at ${formatAmps(i)}. A comfortable LED current is 5–20 mA. It drops about ${v.toFixed(1)} V.`
      if ((r?.voltage ?? 0) < -0.5) return 'Reverse voltage: the LED is backwards, so the one-way door is shut.'
      return `Dark. It needs about ${LED_SPECS[part.props.color ?? 'red'].vf} V across it, the right way round, to light up.`
    case 'switch':
      return part.props.closed ? 'Closed: the metal contacts touch and current can pass.' : 'Open: there’s an air gap, so current can’t cross.'
    case 'button':
      return part.props.closed ? 'Pressed: the contacts are touching.' : 'Released: press and hold the red cap to connect.'
  }
}

export function Inspector({ api, part, onClose }: { api: CircuitApi; part: Part; onClose: () => void }) {
  const r = api.sim.parts[part.id]
  const def = PART_DEFS[part.kind]
  const i = Math.abs(r?.current ?? 0)
  const ledDanger = part.kind === 'led' && i > ELECTRICAL.ledWarn

  return (
    <div className="panel rise-in p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-fog-400">Selected</div>
          <div className="font-semibold text-fog-100">
            {def.name}
            {part.kind === 'resistor' && <span className="ml-2 font-mono text-sm text-fog-300">{formatOhms(part.props.ohms ?? 0)}</span>}
          </div>
        </div>
        <button className="text-fog-400 hover:text-fog-100" onClick={onClose} aria-label="Close inspector">
          ✕
        </button>
      </div>

      {part.kind === 'led' && part.props.burnt && (
        <Button variant="primary" className="mt-3 w-full" onClick={() => api.replaceLed(part.id)}>
          Replace LED
        </Button>
      )}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Meter label="Voltage" value={Math.abs(r?.voltage ?? 0).toFixed(2)} unit="V" color="var(--color-volt)" hint="Voltage across this part" />
        <Meter label="Current" value={formatAmps(i).split(' ')[0]} unit={formatAmps(i).split(' ')[1]} color={ledDanger ? 'var(--color-danger)' : 'var(--color-flow)'} hint="Current through this part" />
        <Meter label="Power" value={formatWatts(r?.power ?? 0).split(' ')[0]} unit={formatWatts(r?.power ?? 0).split(' ')[1]} color="var(--color-warn)" hint="Energy per second turned into heat/light" />
      </div>
      <p className="mt-3 text-sm text-fog-300">{explain(part, r)}</p>

      <div className="mt-4 space-y-3">
        {part.kind === 'battery' && (
          <div>
            <div className="mb-1.5 text-xs text-fog-400">Battery voltage</div>
            <div className="flex flex-wrap gap-1.5">
              {BATTERY_OPTIONS.map((v) => (
                <button
                  key={v}
                  onClick={() => api.setProps(part.id, { voltage: v })}
                  className={`rounded-md border px-2.5 py-1 font-mono text-xs ${part.props.voltage === v ? 'border-volt bg-volt/15 text-volt' : 'border-ink-600 text-fog-300 hover:text-fog-100'}`}
                >
                  {v} V
                </button>
              ))}
            </div>
          </div>
        )}
        {part.kind === 'resistor' && (
          <div>
            <div className="mb-1.5 text-xs text-fog-400">Swap resistor value</div>
            <div className="flex flex-wrap gap-1.5">
              {RESISTOR_OPTIONS.map((v) => (
                <button
                  key={v}
                  onClick={() => api.setProps(part.id, { ohms: v })}
                  className={`rounded-md border px-2 py-1 font-mono text-xs ${part.props.ohms === v ? 'border-volt bg-volt/15 text-volt' : 'border-ink-600 text-fog-300 hover:text-fog-100'}`}
                >
                  {formatOhms(v)}
                </button>
              ))}
            </div>
          </div>
        )}
        {part.kind === 'led' && (
          <>
            <div>
              <div className="mb-1.5 text-xs text-fog-400">LED colour (each needs a different turn-on voltage)</div>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(LED_SPECS) as LedColor[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => api.setProps(part.id, { color: c })}
                    className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${part.props.color === c ? 'border-volt bg-volt/10 text-fog-100' : 'border-ink-600 text-fog-300 hover:text-fog-100'}`}
                    title={`${LED_SPECS[c].vf} V`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: LED_SPECS[c].hex }} />
                    {LED_SPECS[c].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => api.flipLed(part.id)}>⇄ Flip</Button>
            </div>
          </>
        )}
        {part.kind === 'switch' && (
          <Button onClick={() => api.setProps(part.id, { closed: !part.props.closed })}>{part.props.closed ? 'Open switch' : 'Close switch'}</Button>
        )}
        <div className="flex flex-wrap gap-2 border-t border-ink-700 pt-3">
          <Button variant="ghost" onClick={() => api.rotatePart(part.id)}>
            ↻ Rotate
          </Button>
          {!part.locked && (
            <Button
              variant="danger"
              onClick={() => {
                api.deletePart(part.id)
                onClose()
              }}
            >
              Remove
            </Button>
          )}
          <Link to={`/components/${def.catalogId}`} className="ml-auto self-center text-xs text-flow hover:underline">
            Inspect in 3D →
          </Link>
        </div>
      </div>
    </div>
  )
}

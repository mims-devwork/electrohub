import { useState, type ReactNode } from 'react'
import { PartGlyph } from '../circuit/PartGlyph'
import { IssueCard } from '../ui/primitives'
import { BENCH_H, BENCH_W, BOARD, MICRO_PART_DEFS, PIN_BY_ID } from './board'
import { CodeListing, type CodeStatus } from './CodeListing'
import { BatteryPackGlyph, DriverGlyph } from './glyphs'
import { BOUNDS, MicroBench } from './MicroBench'
import type { BoardPin, MicroPartKind } from './types'
import type { MicroApi } from './useMicro'

const TRAY_LABEL: Record<MicroPartKind, string> = {
  resistor: '10 kΩ resistor',
  pot: 'Potentiometer',
  button: 'Push button',
  led: 'LED + 220 Ω',
  tmp36: 'Temp sensor',
  servo: 'Servo',
  motor: 'DC motor',
  driver: 'Motor driver',
  battery: '4 × AA pack',
  encoder: 'Encoder',
}

/** Small preview of a part for the tray: [glyph, viewBox]. */
function TrayGlyph({ kind }: { kind: MicroPartKind }) {
  switch (kind) {
    case 'resistor':
      return <PartGlyph part={{ id: 'tray', kind: 'resistor', x: 0, y: 0, rot: 0, props: { ohms: BOARD.trayOhms } }} />
    case 'button':
      return <PartGlyph part={{ id: 'tray', kind: 'button', x: 0, y: 0, rot: 0, props: {} }} />
    case 'driver':
      return (
        <g transform="scale(0.45)">
          <DriverGlyph enable={0} dir={0} ok={false} />
        </g>
      )
    case 'battery':
      return (
        <g transform="scale(0.55) translate(10 -6)">
          <BatteryPackGlyph volts={BOARD.batteryVolts} />
        </g>
      )
    default:
      return null
  }
}

function MicroTray({ kinds, onAdd }: { kinds: MicroPartKind[]; onAdd: (kind: MicroPartKind) => void }) {
  if (!kinds.length) return null
  return (
    <div className="panel flex flex-wrap items-center gap-3 p-2.5">
      <div className="px-1 text-[11px] font-semibold uppercase tracking-wider text-fog-400">
        Parts tray<span className="block font-normal normal-case tracking-normal">drag onto the bench, or click</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {kinds.map((k) => (
          <button
            key={k}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/x-electrohub-micro-part', k)
              e.dataTransfer.effectAllowed = 'copy'
            }}
            onClick={() => onAdd(k)}
            className="group flex w-[110px] flex-col items-center rounded-xl border border-ink-600 bg-ink-900 px-2 py-1.5 transition-colors hover:border-volt/60"
          >
            <svg viewBox="-60 -30 120 60" className="h-8 w-full">
              <TrayGlyph kind={k} />
            </svg>
            <span className="text-xs text-fog-200">{TRAY_LABEL[k]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/** The program on the board, with the editable parts as drop-downs. */
export function CodePanel({ api }: { api: MicroApi }) {
  const { program, slots, frame, uploading } = api
  const hasSlots = Object.keys(program.slots).length > 0
  const status: CodeStatus = uploading
    ? { text: api.bootReason === 'reset' ? 'Restarting…' : 'Uploading…', tone: 'busy' }
    : !frame.sol.powered
      ? { text: 'No power', tone: 'bad' }
      : { text: '● Running', tone: 'ok' }
  return (
    <CodeListing
      name={program.name}
      lines={program.lines}
      slots={program.slots}
      values={slots}
      active={frame.running ? frame.active : []}
      status={status}
      onSlot={api.setSlot}
      footnote={`${hasSlots ? 'The purple boxes are yours to change. The board re-uploads the program each time you do. ' : ''}Highlighted lines are the ones running right now. loop() repeats over and over, thousands of times a second on a real board.`}
    />
  )
}

function SerialMonitor({ api }: { api: MicroApi }) {
  if (!api.program.serialHeader) return null
  return (
    <div className="panel p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-fog-400">Serial monitor</div>
      <div className="mt-2 rounded-lg bg-ink-950 p-3 font-mono text-[12.5px] leading-5">
        <div className="whitespace-pre border-b border-ink-700 pb-1 text-fog-400">{api.program.serialHeader}</div>
        <div className="h-[180px] overflow-hidden pt-1" aria-live="off">
          {api.serial.length === 0 && <div className="text-fog-400">{api.uploading ? 'Waiting for the board…' : '…'}</div>}
          {api.serial.map((line, i) => (
            <div key={i} className={`whitespace-pre ${i === api.serial.length - 1 ? 'text-volt' : 'text-fog-200'}`}>
              {line}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs text-fog-400">The board sends these numbers back up the USB cable. It’s how you see what the code sees.</p>
    </div>
  )
}

const TRACE_COLORS: Partial<Record<BoardPin, string>> = { A0: '#fbbf24', D2: '#38bdf8', D9: '#a78bfa', D13: '#34d399' }

function Scope({ api }: { api: MicroApi }) {
  const W = 400
  const ROW = 56
  const pins = api.scopePins
  const label = (pin: BoardPin) => {
    if (api.program.reads.includes(pin)) return `${pin} · ${pin.startsWith('A') ? 'analogRead' : 'digitalRead'}`
    if (api.program.outputs(api.slots).includes(pin)) return `${PIN_BY_ID[pin].label} · output${PIN_BY_ID[pin].pwm ? ' (average)' : ''}`
    return `${pin} · voltage`
  }
  return (
    <div className="panel p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-fog-400">Signals over time</div>
      <svg viewBox={`0 0 ${W} ${pins.length * ROW + 6}`} className="mt-2 w-full rounded-lg bg-ink-950">
        {pins.map((pin, r) => {
          const base = r * ROW + ROW - 6
          const pts = api.scope.map((s, i) => `${(i / Math.max(1, api.scope.length - 1)) * W},${base - (s[pin] ?? 0) * (ROW - 22)}`).join(' ')
          return (
            <g key={pin}>
              <line x1="0" x2={W} y1={base} y2={base} stroke="#1c2742" />
              <text x="6" y={r * ROW + 14} fill="#8a9bb8" fontSize="10">
                {label(pin)}
              </text>
              <polyline points={pts} fill="none" stroke={TRACE_COLORS[pin] ?? '#e8eef7'} strokeWidth="2.5" strokeLinejoin="round" />
            </g>
          )
        })}
      </svg>
      <p className="mt-2 text-xs text-fog-400">Each trace runs from 0 (bottom) to its maximum (top): 5 V, 1023 or HIGH.</p>
    </div>
  )
}

/** Big, keyboard-friendly versions of the knob and button, under the bench. */
function HandsOn({ api }: { api: MicroApi }) {
  const pots = api.circuit.parts.filter((p) => p.kind === 'pot')
  const buttons = api.circuit.parts.filter((p) => p.kind === 'button')
  const tmps = api.circuit.parts.filter((p) => p.kind === 'tmp36')
  const resettable = !!api.program.resettable
  if (!pots.length && !buttons.length && !tmps.length && !resettable) return null
  const hold = (on: (held: boolean) => void) => ({
    onPointerDown: () => on(true),
    onPointerUp: () => on(false),
    onPointerLeave: () => on(false),
    onKeyDown: (e: React.KeyboardEvent) => (e.key === ' ' || e.key === 'Enter') && on(true),
    onKeyUp: () => on(false),
  })
  return (
    <div className="panel flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
      {pots.map((p) => {
        const pos = api.inputs.knob[p.id] ?? 0.5
        return (
          <label key={p.id} className="flex min-w-[240px] flex-1 items-center gap-3 text-sm text-fog-300">
            <span className="shrink-0">Turn the knob</span>
            <input
              type="range"
              min={0}
              max={1000}
              value={Math.round(pos * 1000)}
              onChange={(e) => api.setKnob(p.id, Number(e.target.value) / 1000)}
              className="flex-1"
              aria-label="Potentiometer knob"
            />
            <span className="w-10 shrink-0 text-right font-mono text-xs text-fog-400">{Math.round(pos * 100)}%</span>
          </label>
        )
      })}
      {buttons.map((b) => {
        const pressed = !!api.inputs.pressed[b.id]
        return (
          <button key={b.id} {...hold((h) => api.setPressed(b.id, h))} className={`rounded-lg border px-4 py-2 text-sm font-medium ${pressed ? 'border-volt bg-volt text-ink-950' : 'border-ink-500 bg-ink-900 text-fog-100'}`}>
            {pressed ? 'Pressed' : 'Press & hold the button'}
          </button>
        )
      })}
      {tmps.map((t) => {
        const c = api.inputs.temp?.[t.id] ?? 21
        return (
          <div key={t.id} className="flex flex-wrap items-center gap-3">
            <WarmButton onHold={(h) => api.setWarm(t.id, h)} hold={hold} />
            <span className="rounded-md border border-ink-600 bg-ink-950 px-2 py-1 font-mono text-xs text-fog-200" title="A real thermometer next to the sensor">
              🌡️ thermometer: {c.toFixed(1)} °C
            </span>
          </div>
        )
      })}
      {resettable && (
        <button onClick={api.restart} className="rounded-lg border border-ink-500 bg-ink-900 px-4 py-2 text-sm text-fog-100 hover:border-fog-400">
          ↺ Press the board’s reset button
        </button>
      )}
    </div>
  )
}

function WarmButton({ onHold, hold }: { onHold: (held: boolean) => void; hold: (on: (held: boolean) => void) => object }) {
  const [held, setHeld] = useState(false)
  const set = (h: boolean) => {
    setHeld(h)
    onHold(h)
  }
  return (
    <button {...hold(set)} className={`rounded-lg border px-4 py-2 text-sm font-medium ${held ? 'border-warn bg-warn/20 text-orange-100' : 'border-ink-500 bg-ink-900 text-fog-100'}`}>
      {held ? '✋ Warming it with your fingers…' : '✋ Hold the sensor between your fingers'}
    </button>
  )
}

export function MicroWorkspace({ api, tray, side, onReset }: { api: MicroApi; tray: MicroPartKind[]; side?: ReactNode; onReset?: () => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [readings, setReadings] = useState(true)
  const highlight = api.issues.filter((i) => i.severity !== 'success').flatMap((i) => i.highlight)

  // Put a new part where its outline (legs included) doesn't overlap anything already on the bench.
  const addAtFreeSpot = (kind: MicroPartKind) => {
    const box = (k: MicroPartKind, x: number, y: number) => {
      const b = BOUNDS[k]
      const legs = MICRO_PART_DEFS[k].terminals.map((t) => t.dx)
      const left = Math.min(b.x, ...legs) - 16
      const right = Math.max(b.x + b.w, ...legs) + 16
      return { l: x + left, r: x + right, t: y + b.y - 26, b: y + b.y + b.h + 26 }
    }
    const fits = (x: number, y: number) => {
      const me = box(kind, x, y)
      if (me.l < 450 || me.r > BENCH_W - 4 || me.t < 4 || me.b > BENCH_H - 4) return false
      return api.circuit.parts.every((p) => {
        const o = box(p.kind, p.x, p.y)
        return me.r < o.l || me.l > o.r || me.b < o.t || me.t > o.b
      })
    }
    let spot = { x: BENCH_W - 120, y: BENCH_H / 2 }
    search: for (let y = 90; y <= BENCH_H - 50; y += 20) {
      for (let x = 560; x <= BENCH_W - 60; x += 20) {
        if (fits(x, y)) {
          spot = { x, y }
          break search
        }
      }
    }
    setSelected(api.addPart(kind, spot.x, spot.y))
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_370px]">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="flex items-center gap-1.5 text-fog-400">
            <input type="checkbox" checked={readings} onChange={(e) => setReadings(e.target.checked)} className="accent-amber-400" />
            Live readings
          </label>
          {onReset && (
            <button onClick={onReset} className="ml-auto rounded-md border border-ink-600 px-2 py-1 text-fog-400 hover:text-fog-100">
              ↺ Reset bench
            </button>
          )}
        </div>
        <MicroTray kinds={tray} onAdd={addAtFreeSpot} />
        <MicroBench api={api} selectedId={selected} onSelect={setSelected} highlight={highlight} showReadings={readings} />
        <p className="text-xs text-fog-400">
          Drag from a pin to a part’s leg to add a wire, or click one then the other. Click a wire, then ✕, to remove it. Drag the knob to turn it, and hold the button to press it.
        </p>
        <HandsOn api={api} />
        <div className="grid gap-3 xl:grid-cols-2">
          <CodePanel api={api} />
          <div className="min-w-0 space-y-3">
            <SerialMonitor api={api} />
            <Scope api={api} />
          </div>
        </div>
      </div>
      <aside className="space-y-3">
        {side}
        <div className="space-y-2" aria-live="polite">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-fog-400">Lab notes</div>
          {api.issues.length === 0 && <p className="text-sm text-fog-400">Wire something up and I’ll tell you what the board sees.</p>}
          {api.issues.slice(0, 3).map((issue) => (
            <IssueCard key={issue.id} issue={issue} compact={issue.severity === 'success'} />
          ))}
        </div>
      </aside>
    </div>
  )
}

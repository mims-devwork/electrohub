import { useState, type ReactNode } from 'react'
import { PartGlyph } from '../circuit/PartGlyph'
import { IssueCard } from '../ui/primitives'
import { BENCH_H, BENCH_W, BOARD, PIN_BY_ID } from './board'
import { MicroBench } from './MicroBench'
import type { BoardPin, MicroPartKind } from './types'
import type { MicroApi } from './useMicro'

const TRAY_LABEL: Record<MicroPartKind, string> = {
  resistor: '10 kΩ resistor',
  pot: 'Potentiometer',
  button: 'Push button',
  led: 'LED + 220 Ω',
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
              {k === 'resistor' && <PartGlyph part={{ id: 'tray', kind: 'resistor', x: 0, y: 0, rot: 0, props: { ohms: BOARD.trayOhms } }} />}
              {k === 'button' && <PartGlyph part={{ id: 'tray', kind: 'button', x: 0, y: 0, rot: 0, props: {} }} />}
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
  const status = uploading
    ? { text: 'Uploading…', cls: 'border-volt/50 bg-volt/10 text-volt' }
    : !frame.sol.powered
      ? { text: 'No power', cls: 'border-danger/50 bg-danger/10 text-rose-200' }
      : { text: '● Running', cls: 'border-ok/50 bg-ok/10 text-ok' }
  return (
    <div className="panel min-w-0 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-fog-400">
          Program on the board · <span className="font-mono normal-case tracking-normal text-fog-300">{program.name}</span>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${status.cls}`}>{status.text}</span>
      </div>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-ink-950 p-3 font-mono text-[12.5px] leading-6 scrollbar-thin">
        {program.lines.map((l, i) => {
          const active = !!l.tag && frame.running && frame.active.includes(l.tag)
          return (
            <div key={i} className={`rounded px-1 transition-colors ${active ? 'bg-brain/20 text-fog-100' : 'text-fog-400'}`}>
              {l.code.map((tok, j) =>
                typeof tok === 'string' ? (
                  <span key={j}>{tok || ' '}</span>
                ) : (
                  <select
                    key={j}
                    value={slots[tok.slot]}
                    onChange={(e) => api.setSlot(tok.slot, e.target.value)}
                    aria-label={program.slots[tok.slot].label}
                    className="mx-0.5 cursor-pointer rounded border border-brain/60 bg-brain/15 px-1 font-mono text-[12.5px] text-brain"
                  >
                    {program.slots[tok.slot].options.map((o) => (
                      <option key={o} value={o} className="bg-ink-900 text-fog-100">
                        {o}
                      </option>
                    ))}
                  </select>
                ),
              )}
            </div>
          )
        })}
      </pre>
      <p className="mt-2 text-xs text-fog-400">
        {hasSlots ? 'The purple boxes are yours to change. The board re-uploads the program each time you do. ' : ''}Highlighted lines are the ones running right now.
        loop() repeats over and over, thousands of times a second on a real board.
      </p>
    </div>
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
  if (!pots.length && !buttons.length) return null
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
          <button
            key={b.id}
            onPointerDown={() => api.setPressed(b.id, true)}
            onPointerUp={() => api.setPressed(b.id, false)}
            onPointerLeave={() => api.setPressed(b.id, false)}
            onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && api.setPressed(b.id, true)}
            onKeyUp={() => api.setPressed(b.id, false)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium ${pressed ? 'border-volt bg-volt text-ink-950' : 'border-ink-500 bg-ink-900 text-fog-100'}`}
          >
            {pressed ? 'Pressed' : 'Press & hold the button'}
          </button>
        )
      })}
    </div>
  )
}

export function MicroWorkspace({ api, tray, side, onReset }: { api: MicroApi; tray: MicroPartKind[]; side?: ReactNode; onReset?: () => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [readings, setReadings] = useState(true)
  const highlight = api.issues.filter((i) => i.severity !== 'success').flatMap((i) => i.highlight)

  const addAtFreeSpot = (kind: MicroPartKind) => {
    const taken = (x: number, y: number) => api.circuit.parts.some((p) => Math.hypot(p.x - x, p.y - y) < 100)
    const spots = [
      { x: 620, y: 270 },
      { x: 720, y: 160 },
      { x: 720, y: 400 },
      { x: 560, y: 420 },
      { x: 760, y: 280 },
    ]
    const spot = spots.find((s) => !taken(s.x, s.y)) ?? { x: BENCH_W - 120, y: BENCH_H / 2 }
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

import { useState, type ReactNode } from 'react'
import type { PartKind } from '../sim/types'
import { IssueCard } from '../ui/primitives'
import { BENCH_H, BENCH_W, CircuitBench, type FlowMode } from './CircuitBench'
import { Inspector } from './Inspector'
import { Tray } from './Tray'
import type { CircuitApi } from './useCircuit'

export function LabWorkspace({ api, tray, side, onReset }: { api: CircuitApi; tray: PartKind[]; side?: ReactNode; onReset?: () => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [flow, setFlow] = useState<FlowMode>('conventional')
  const [readings, setReadings] = useState(true)
  const part = api.circuit.parts.find((p) => p.id === selected)
  const highlight = api.issues.filter((i) => i.severity !== 'success').flatMap((i) => i.highlight)
  const openLoop = api.issues.some((i) => i.id === 'open-loop')

  const addAtFreeSpot = (kind: PartKind) => {
    const taken = (x: number, y: number) => api.circuit.parts.some((p) => Math.hypot(p.x - x, p.y - y) < 90)
    let spot = { x: BENCH_W / 2, y: BENCH_H / 2 }
    outer: for (let ring = 0; ring < 6; ring++) {
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2
        const x = Math.round((BENCH_W / 2 + Math.cos(a) * ring * 90) / 10) * 10
        const y = Math.round((BENCH_H / 2 + Math.sin(a) * ring * 70) / 10) * 10
        if (x > 60 && x < BENCH_W - 60 && y > 50 && y < BENCH_H - 50 && !taken(x, y)) {
          spot = { x, y }
          break outer
        }
      }
    }
    setSelected(api.addPart(kind, spot.x, spot.y))
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_370px]">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-fog-400">Show flow as:</span>
          {(
            [
              ['conventional', 'Current (+ → −)'],
              ['electrons', 'Electrons (− → +)'],
              ['off', 'Off'],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setFlow(m)}
              className={`rounded-md border px-2 py-1 ${flow === m ? (m === 'electrons' ? 'border-flow bg-flow/15 text-flow' : 'border-volt bg-volt/15 text-volt') : 'border-ink-600 text-fog-400 hover:text-fog-100'}`}
            >
              {label}
            </button>
          ))}
          <label className="ml-2 flex items-center gap-1.5 text-fog-400">
            <input type="checkbox" checked={readings} onChange={(e) => setReadings(e.target.checked)} className="accent-amber-400" />
            Live readings
          </label>
          {onReset && (
            <button onClick={onReset} className="ml-auto rounded-md border border-ink-600 px-2 py-1 text-fog-400 hover:text-fog-100">
              ↺ Reset bench
            </button>
          )}
        </div>
        <Tray kinds={tray} onAdd={addAtFreeSpot} />
        <CircuitBench api={api} selectedId={selected} onSelect={setSelected} highlight={highlight} flowMode={flow} showReadings={readings} pulseDangling={openLoop} />
        <p className="text-xs text-fog-400">
          Drag from one circle to another to add a wire, or click one circle then another. Click a wire, then ✕, to remove it. Drag parts to move them, and click a part to inspect it.
        </p>
      </div>
      <aside className="space-y-3">
        {side}
        {part && <Inspector api={api} part={part} onClose={() => setSelected(null)} />}
        <div className="space-y-2" aria-live="polite">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-fog-400">Lab notes</div>
          {api.issues.length === 0 && <p className="text-sm text-fog-400">Build something and I’ll tell you what’s happening.</p>}
          {api.issues.slice(0, 3).map((issue) => (
            <IssueCard key={issue.id} issue={issue} compact={issue.severity === 'success'} />
          ))}
        </div>
      </aside>
    </div>
  )
}

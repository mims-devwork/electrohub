import { useEffect, useState } from 'react'
import type { WidgetProps } from './types'

type Id = 'battery' | 'fuse' | 'regulator' | 'sensor' | 'mcu' | 'driver' | 'motors'

const BLOCKS: Record<Id, { x: number; y: number; icon: string; label: string }> = {
  battery: { x: 70, y: 60, icon: '🔋', label: 'Battery' },
  fuse: { x: 230, y: 60, icon: '🧯', label: 'Fuse' },
  regulator: { x: 400, y: 60, icon: '⚡', label: 'Regulator' },
  sensor: { x: 120, y: 210, icon: '📡', label: 'Distance sensor' },
  mcu: { x: 400, y: 210, icon: '🧠', label: 'Microcontroller' },
  driver: { x: 580, y: 210, icon: '🔀', label: 'Motor driver' },
  motors: { x: 580, y: 330, icon: '⚙️', label: 'Motors' },
}

type Kind = 'power' | 'signal'
interface Link {
  from: Id
  to: Id
  kind: Kind
  note?: string
}
const REQUIRED: Link[] = [
  { from: 'battery', to: 'fuse', kind: 'power' },
  { from: 'fuse', to: 'regulator', kind: 'power' },
  { from: 'fuse', to: 'driver', kind: 'power' },
  { from: 'regulator', to: 'mcu', kind: 'power' },
  { from: 'sensor', to: 'mcu', kind: 'signal' },
  { from: 'mcu', to: 'driver', kind: 'signal' },
  { from: 'driver', to: 'motors', kind: 'power' },
]
/** Also right, but not needed to finish. */
const EXTRA: Link[] = [{ from: 'regulator', to: 'sensor', kind: 'power', note: 'Yes: the sensor needs a steady 5 V too.' }]

const WHY: Partial<Record<`${Id}>${Id}`, string>> = {
  'battery>driver': 'Close! But all the battery’s power should pass through the fuse first, so a short anywhere is protected.',
  'battery>regulator': 'Power should pass through the fuse first, so a short anywhere in the robot is protected.',
  'battery>mcu': 'The brain needs a steady 5 V, so its power comes through the regulator.',
  'battery>motors': 'Motors can’t be switched on and off, or reversed, without the driver in between.',
  'regulator>driver': 'Motors need far more current than the regulator can give. Motor power comes from the battery (through the fuse).',
  'regulator>motors': 'Motors need far more current than the regulator can give.',
  'mcu>motors': 'A pin can’t power a motor (remember Experiment 09). The microcontroller tells the driver what to do instead.',
  'sensor>driver': 'The sensor only measures. The microcontroller is what decides.',
  'sensor>motors': 'The sensor only measures. Something has to decide, and something has to supply the power.',
}

const key = (a: Id, b: Id) => `${a}>${b}` as const

export function BlockDiagram({ onEvent }: WidgetProps) {
  const [links, setLinks] = useState<{ from: Id; to: Id; kind: Kind }[]>([])
  const [from, setFrom] = useState<Id | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const done = REQUIRED.every((r) => links.some((l) => l.from === r.from && l.to === r.to))

  useEffect(() => {
    if (done) onEvent('diagram-done')
  }, [done, onEvent])

  const click = (id: Id) => {
    if (!from) return setFrom(id)
    if (from === id) return setFrom(null)
    const a = from
    setFrom(null)
    if (links.some((l) => l.from === a && l.to === id)) return
    const ok = REQUIRED.find((r) => r.from === a && r.to === id) ?? EXTRA.find((r) => r.from === a && r.to === id)
    if (ok) {
      setLinks((l) => [...l, { from: a, to: id, kind: ok.kind }])
      setMessage({ ok: true, text: ok.note ?? (ok.kind === 'power' ? `Power: ${BLOCKS[a].label} → ${BLOCKS[id].label}.` : `Signal: ${BLOCKS[a].label} → ${BLOCKS[id].label}.`) })
      return
    }
    const reversed = REQUIRED.some((r) => r.from === id && r.to === a)
    setMessage({
      ok: false,
      text: reversed ? `Right pair, wrong direction. The arrow shows which way it flows: from ${BLOCKS[id].label} to ${BLOCKS[a].label}.` : (WHY[key(a, id)] ?? `${BLOCKS[a].label} doesn’t feed ${BLOCKS[id].label} directly. Ask: where does each block get its power, and who tells it what to do?`),
    })
  }

  const arrow = (l: { from: Id; to: Id; kind: Kind }, i: number) => {
    const a = BLOCKS[l.from]
    const b = BLOCKS[l.to]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy)
    const ux = dx / len
    const uy = dy / len
    // Stop at the box edges (boxes are 120 × 52).
    const edge = (ux2: number, uy2: number) => Math.min(Math.abs(60 / (ux2 || 1e-9)), Math.abs(26 / (uy2 || 1e-9)))
    const s = edge(ux, uy) + 4
    const x1 = a.x + ux * s
    const y1 = a.y + uy * s
    const x2 = b.x - ux * (s + 6)
    const y2 = b.y - uy * (s + 6)
    const color = l.kind === 'power' ? '#fbbf24' : '#38bdf8'
    return (
      <g key={i}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="3" strokeDasharray={l.kind === 'signal' ? '7 5' : undefined} />
        <path d={`M ${x2 + ux * 8} ${y2 + uy * 8} L ${x2 - uy * 6} ${y2 + ux * 6} L ${x2 + uy * 6} ${y2 - ux * 6} Z`} fill={color} />
      </g>
    )
  }

  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-900 p-4">
      <svg viewBox="0 0 660 380" className="w-full select-none">
        {links.map(arrow)}
        {(Object.keys(BLOCKS) as Id[]).map((id) => {
          const b = BLOCKS[id]
          const active = from === id
          return (
            <g key={id} onClick={() => click(id)} style={{ cursor: 'pointer' }} role="button" aria-label={b.label}>
              <rect x={b.x - 60} y={b.y - 26} width="120" height="52" rx="10" fill={active ? '#2a2414' : '#0b1120'} stroke={active ? '#fbbf24' : '#3a4a6b'} strokeWidth="2" />
              <text x={b.x} y={b.y - 4} textAnchor="middle" fontSize="16">
                {b.icon}
              </text>
              <text x={b.x} y={b.y + 15} textAnchor="middle" fontSize="11.5" fontWeight="600" fill="#e8eef7">
                {b.label}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-fog-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-6 bg-volt" /> power
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-6 border-t-2 border-dashed border-flow" /> signal
        </span>
        <span>
          {links.filter((l) => REQUIRED.some((r) => r.from === l.from && r.to === l.to)).length} / {REQUIRED.length} connections
        </span>
        <span className="ml-auto">{from ? `From ${BLOCKS[from].label} to… (click a block)` : 'Click a block to start an arrow'}</span>
      </div>
      {message && (
        <p key={message.text} className={`rise-in mt-2 rounded-lg border px-3 py-2 text-sm ${message.ok ? 'border-ok/40 bg-ok/10 text-fog-100' : 'shake border-danger/40 bg-danger/10 text-rose-100'}`}>
          {message.ok ? '✓ ' : ''}
          {message.text}
        </p>
      )}
    </div>
  )
}

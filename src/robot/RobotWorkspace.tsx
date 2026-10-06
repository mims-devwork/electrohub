import type { ReactNode } from 'react'
import { CodeListing } from '../micro/CodeListing'
import { IssueCard, Meter } from '../ui/primitives'
import { ARENAS, ROBOT, castRay, type ArenaId } from './sim'
import type { RobotApi } from './useRobot'

const PAD = 6

function ArenaView({ api }: { api: RobotApi }) {
  const { arena, tick, trail } = api
  const s = tick.state
  const limit = Number(api.slots.cond.match(/(\d+)$/)?.[1] ?? 0)
  const grid = arena.w > 300 ? 50 : 20
  const sx = s.x + Math.cos(s.heading) * ROBOT.radius
  const sy = s.y + Math.sin(s.heading) * ROBOT.radius
  const beams = [-ROBOT.beam, 0, ROBOT.beam].map((a) => {
    const d = Math.min(castRay(arena, sx, sy, s.heading + a), ROBOT.sensorRange)
    return { x: sx + Math.cos(s.heading + a) * d, y: sy + Math.sin(s.heading + a) * d }
  })
  const close = s.reading > 0 && s.reading < limit
  // In the big hall the robot is tiny, so draw a ring round it to keep it easy to spot.
  const big = arena.w > 300
  return (
    <svg viewBox={`${-PAD} ${-PAD} ${arena.w + PAD * 2} ${arena.h + PAD * 2}`} className="block w-full rounded-2xl border border-ink-700 bg-ink-900" style={{ maxHeight: 'calc(100svh - 260px)' }} role="img" aria-label={`${arena.name}, seen from above`}>
      <rect x="0" y="0" width={arena.w} height={arena.h} fill="#111a2e" />
      {Array.from({ length: Math.floor(arena.w / grid) - 1 }, (_, i) => (
        <line key={`v${i}`} x1={(i + 1) * grid} x2={(i + 1) * grid} y1="0" y2={arena.h} stroke="#1f2d4d" strokeWidth={arena.w / 400} />
      ))}
      {Array.from({ length: Math.floor(arena.h / grid) - 1 }, (_, i) => (
        <line key={`h${i}`} y1={(i + 1) * grid} y2={(i + 1) * grid} x1="0" x2={arena.w} stroke="#1f2d4d" strokeWidth={arena.w / 400} />
      ))}
      <rect x="0" y="0" width={arena.w} height={arena.h} fill="none" stroke="#475569" strokeWidth={arena.w / 100} />
      {arena.pillars.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="#475569" stroke="#64748b" strokeWidth={arena.w / 400} />
      ))}
      {trail.length > 1 && <polyline points={trail.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#f472b6" strokeOpacity="0.35" strokeWidth={arena.w / 250} strokeDasharray={`${arena.w / 100} ${arena.w / 100}`} />}
      {s.reading > 0 && (
        <polygon points={`${sx},${sy} ${beams.map((b) => `${b.x},${b.y}`).join(' ')}`} fill={close ? '#f43f5e' : '#34d399'} opacity="0.18" />
      )}
      <line x1={sx} y1={sy} x2={beams[1].x} y2={beams[1].y} stroke={s.reading === 0 ? '#64748b' : close ? '#f43f5e' : '#34d399'} strokeWidth={arena.w / 300} strokeDasharray={s.reading === 0 ? `${arena.w / 80} ${arena.w / 80}` : undefined} />
      <g transform={`translate(${s.x} ${s.y}) rotate(${(s.heading * 180) / Math.PI})`}>
        {big && <circle r={ROBOT.radius * 2.6} fill="none" stroke="#f472b6" strokeWidth="2" strokeDasharray="4 4" />}
        <rect x={-5} y={-ROBOT.radius - 2.5} width="10" height="4" rx="1" fill="#111827" />
        <rect x={-5} y={ROBOT.radius - 1.5} width="10" height="4" rx="1" fill="#111827" />
        <circle r={ROBOT.radius} fill={s.touching ? '#f43f5e' : '#f472b6'} stroke="#831843" strokeWidth="1" />
        <rect x={ROBOT.radius - 4} y="-4" width="4" height="8" rx="1" fill="#0f172a" />
        <circle cx={ROBOT.radius - 2} cy="-2.2" r="1.3" fill="#94a3b8" />
        <circle cx={ROBOT.radius - 2} cy="2.2" r="1.3" fill="#94a3b8" />
      </g>
    </svg>
  )
}

function DistanceScope({ api }: { api: RobotApi }) {
  const W = 400
  const H = 120
  const max = Math.max(60, Math.min(ROBOT.sensorRange, api.arena.w))
  const limit = Number(api.slots.cond.match(/(\d+)$/)?.[1] ?? 0)
  const y = (cm: number) => H - 8 - (Math.min(cm, max) / max) * (H - 24)
  return (
    <div className="panel p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-fog-400">Distance reading over time</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full rounded-lg bg-ink-950">
        <line x1="0" x2={W} y1={y(limit)} y2={y(limit)} stroke="#f43f5e" strokeDasharray="5 5" />
        <text x={W - 6} y={y(limit) - 4} textAnchor="end" fontSize="10" fill="#fb7185">
          turn below {limit} cm
        </text>
        <line x1="0" x2={W} y1={y(0)} y2={y(0)} stroke="#1c2742" />
        <polyline points={api.scope.map((cm, i) => `${(i / (api.scope.length - 1)) * W},${y(cm)}`).join(' ')} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinejoin="round" />
        <text x="6" y="14" fontSize="10" fill="#8a9bb8">
          {max} cm
        </text>
      </svg>
      <p className="mt-2 text-xs text-fog-400">A reading of 0 means no echo came back at all.</p>
    </div>
  )
}

export function RobotWorkspace({ api, side, onReset }: { api: RobotApi; side?: ReactNode; onReset?: () => void }) {
  const s = api.tick.state
  const decision = !api.running ? 'paused' : api.uploading ? 'uploading…' : api.tick.turning ? 'TURN' : 'DRIVE'
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_370px]">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => api.setRunning(!api.running)}
            className={`rounded-md border px-3 py-1 font-medium ${api.running ? 'border-ink-600 text-fog-200' : 'border-volt bg-volt text-ink-950'}`}
          >
            {api.running ? '❚❚ Pause' : '▶ Run'}
          </button>
          <button onClick={api.putBack} className="rounded-md border border-ink-600 px-2 py-1 text-fog-300 hover:text-fog-100">
            ⟲ Put it back at the start
          </button>
          <span className="ml-2 text-fog-400">Arena:</span>
          {(Object.keys(ARENAS) as ArenaId[]).map((id) => (
            <button
              key={id}
              onClick={() => api.chooseArena(id)}
              className={`rounded-md border px-2 py-1 ${api.arena.id === id ? 'border-robot bg-robot/15 text-robot' : 'border-ink-600 text-fog-400 hover:text-fog-100'}`}
            >
              {ARENAS[id].name} ({ARENAS[id].w / 100} × {ARENAS[id].h / 100} m)
            </button>
          ))}
          {onReset && (
            <button onClick={onReset} className="ml-auto rounded-md border border-ink-600 px-2 py-1 text-fog-400 hover:text-fog-100">
              ↺ Reset bench
            </button>
          )}
        </div>
        <ArenaView api={api} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Meter label="Sensor" value={s.reading === 0 ? '0' : String(s.reading)} unit={s.reading === 0 ? 'no echo' : 'cm'} color="#38bdf8" />
          <Meter label="Decision" value={decision} color={api.tick.turning ? '#fb7185' : '#34d399'} />
          <Meter label="Wheels L · R" value={`${Math.round(s.left)} · ${Math.round(s.right)}`} unit="cm/s" />
          <Meter label="Since last bump" value={(s.odometer / 100).toFixed(1)} unit="m" color="#fbbf24" />
          <Meter label="Bumps" value={String(s.crashes)} color={s.crashes ? '#fb7185' : undefined} />
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          <CodeListing
            name={api.program.name}
            lines={api.program.lines}
            slots={api.program.slots}
            values={api.slots}
            active={api.running && !api.uploading ? api.tick.active : []}
            status={api.uploading ? { text: 'Uploading…', tone: 'busy' } : api.running ? { text: '● Running', tone: 'ok' } : { text: 'Paused', tone: 'busy' }}
            onSlot={api.setSlot}
            footnote="The purple boxes are yours to change. The robot stops while the new code uploads, and its bump counter and distance start again."
          />
          <DistanceScope api={api} />
        </div>
      </div>
      <aside className="space-y-3">
        {side}
        <div className="space-y-2" aria-live="polite">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-fog-400">Lab notes</div>
          {api.issues.length === 0 && <p className="text-sm text-fog-400">{api.running ? 'Watching the robot…' : 'Press Run to switch the robot on.'}</p>}
          {api.issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} compact={issue.severity === 'success'} />
          ))}
        </div>
      </aside>
    </div>
  )
}

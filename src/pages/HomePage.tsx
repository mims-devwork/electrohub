import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HUBS } from '../content'
import type { Hub } from '../content/types'
import { currentLevel, hubLevels, isHubUnlocked, isItemDone, levelProgress, type ProgressSnapshot } from '../lib/progression'
import { LabScene, type StationInfo } from '../three/LabScene'
import { NextUp, useSnapshot } from '../ui/Layout'
import { ProgressBar } from '../ui/primitives'

export function hubProgress(hub: Hub, snap: ProgressSnapshot) {
  const items = hubLevels(hub.id)
    .filter((l) => l.status === 'ready')
    .flatMap((l) => l.items)
  if (!items.length) return 0
  return items.filter((i) => isItemDone(i, snap)).length / items.length
}

export function HomePage() {
  const snap = useSnapshot()
  const navigate = useNavigate()
  const level = currentLevel(snap)
  const lp = levelProgress(level, snap)
  const [ready, setReady] = useState(false)
  const labels = useRef<(HTMLElement | null)[]>([])
  const stations: StationInfo[] = HUBS.map((hub) => ({
    hub,
    unlocked: isHubUnlocked(hub, snap),
    progress: hubProgress(hub, snap),
    isNext: hub.id === level.hubId,
  }))

  return (
    <div>
      <section className="relative h-[calc(100svh-56px)] min-h-[560px] w-full overflow-hidden">
        <LabScene stations={stations} onEnter={(id) => navigate(`/hub/${id}`)} onReady={() => setReady(true)} labels={labels} />
        {/* station name tags, positioned over the 3D stations every frame */}
        <div className="pointer-events-none absolute inset-0 z-10" style={{ visibility: ready ? 'visible' : 'hidden' }}>
          {stations.map((s, i) => {
            const color = s.unlocked ? s.hub.color : '#475569'
            return (
              <Link
                key={s.hub.id}
                ref={(el) => {
                  labels.current[i] = el
                }}
                to={`/hub/${s.hub.id}`}
                className="pointer-events-auto absolute left-0 top-0 w-[176px] rounded-xl border px-3 py-2 text-left backdrop-blur transition-colors hover:bg-ink-800"
                style={{ borderColor: `${color}88`, background: 'rgba(7,11,20,0.82)', visibility: 'hidden' }}
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-fog-100">
                  <span aria-hidden>{s.unlocked ? s.hub.icon : '🔒'}</span>
                  {s.hub.name}
                </span>
                <span className="mt-0.5 block text-[11px] text-fog-400">
                  {s.unlocked ? (s.hub.status === 'preview' ? 'Preview · being built' : `${Math.round(s.progress * 100)}% explored`) : `Unlocks at Level ${s.hub.unlockLevel}`}
                </span>
                {s.isNext && <span className="mt-1 block text-[11px] font-semibold text-volt">● You are here</span>}
              </Link>
            )
          })}
        </div>
        {!ready && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-fog-400">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 animate-ping rounded-full bg-volt" /> Switching on the lab lights…
            </span>
          </div>
        )}

        {/* Where am I / what am I learning / what next */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between">
          <div className="panel pointer-events-auto max-w-[19rem] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-fog-400">You are in the Lab</div>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-fog-100">Electronics → Robots, from zero.</h1>
            <p className="mt-1 hidden text-sm text-fog-300 sm:block">Each station is one part of a real robot. Start with electricity and follow the glowing path.</p>
            <div className="mt-3 hidden rounded-lg border border-ink-700 bg-ink-900/70 p-3 sm:block">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-fog-400">Learning now</span>
                <span className="font-mono text-fog-400">
                  {lp.done}/{lp.total}
                </span>
              </div>
              <div className="mt-0.5 text-sm font-medium text-fog-100">
                Level {level.n}: {level.title}
              </div>
              <ProgressBar value={lp.ratio} className="mt-2" />
            </div>
            <div className="mt-3">
              <NextUp compact={false} />
            </div>
          </div>
          <div className="panel pointer-events-auto hidden p-3 text-xs text-fog-400 md:block">Click a station to enter · drag to look around · scroll to zoom</div>
        </div>

        {/* the big picture chain */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-4">
          <div className="panel pointer-events-auto mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-3 py-2 no-scrollbar" aria-label="How the pieces of a robot connect">
            <span className="mr-2 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-fog-400">The journey</span>
            {stations.map((s, i) => (
              <span key={s.hub.id} className="flex shrink-0 items-center gap-1">
                <Link
                  to={`/hub/${s.hub.id}`}
                  className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${s.unlocked ? 'text-fog-100 hover:bg-ink-700' : 'text-fog-400 hover:text-fog-200'}`}
                  style={s.isNext ? { background: `color-mix(in oklab, ${s.hub.color} 22%, transparent)`, color: s.hub.color } : undefined}
                >
                  {s.unlocked ? s.hub.icon : '🔒'} {s.hub.chainLabel}
                </Link>
                {i < stations.length - 1 && (
                  <span className="text-fog-400" aria-hidden>
                    →
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Accessible / mobile-friendly list of the same stations */}
      <section className="border-t border-ink-700">
        <div className="mx-auto max-w-[1400px] px-4 py-10">
          <h2 className="text-lg font-semibold text-fog-100">Lab stations</h2>
          <p className="text-sm text-fog-400">The same stations as the 3D lab, as a list.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stations.map((s) => (
              <Link
                key={s.hub.id}
                to={`/hub/${s.hub.id}`}
                className="panel group block p-4 transition-colors hover:border-ink-500"
                style={s.isNext ? { borderColor: `color-mix(in oklab, ${s.hub.color} 60%, transparent)` } : undefined}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl" aria-hidden>
                    {s.hub.icon}
                  </span>
                  <span className="text-[11px] text-fog-400">{s.unlocked ? (s.hub.status === 'preview' ? 'Preview' : 'Open') : `🔒 Level ${s.hub.unlockLevel}`}</span>
                </div>
                <div className="mt-2 font-semibold text-fog-100">{s.hub.name}</div>
                <p className="mt-1 text-sm text-fog-300">{s.hub.tagline}</p>
                {s.hub.status === 'open' && <ProgressBar value={s.progress} color={s.hub.color} className="mt-3" />}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

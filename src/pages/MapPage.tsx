import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HUB_BY_ID, LEVELS } from '../content'
import { currentLevel, levelProgress, levelStatus } from '../lib/progression'
import { PageHeader, useSnapshot } from '../ui/Layout'
import { LevelBlock, StatusPill } from './hubs/shared'

export function MapPage() {
  const snap = useSnapshot()
  const [selected, setSelected] = useState(currentLevel(snap).n)
  const level = LEVELS.find((l) => l.n === selected)!
  const hub = HUB_BY_ID[level.hubId]

  return (
    <div className="pb-16">
      <PageHeader crumbs={[{ label: 'Learning Map' }]} title="Learning Map" learning="Twelve levels, from “what is electricity?” to designing your own robot’s electronics. Each one unlocks a new ability." />
      <div className="mx-auto grid max-w-[1400px] gap-6 px-4 pt-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <ol className="relative space-y-2">
          <div className="absolute bottom-6 left-[27px] top-6 w-0.5 bg-ink-700" aria-hidden />
          {LEVELS.map((l, i) => {
            const status = levelStatus(l, snap)
            const lp = levelProgress(l, snap)
            const h = HUB_BY_ID[l.hubId]
            const newHub = i === 0 || LEVELS[i - 1].hubId !== l.hubId
            const active = l.n === selected
            return (
              <li key={l.n}>
                {newHub && (
                  <div className="mb-1 ml-14 mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: h.color }}>
                    <span aria-hidden>{h.icon}</span> {h.name}
                  </div>
                )}
                <button
                  onClick={() => setSelected(l.n)}
                  className={`relative flex w-full items-center gap-4 rounded-xl border px-3 py-3 text-left transition-colors ${active ? 'border-volt/60 bg-ink-800' : 'border-transparent hover:bg-ink-800/60'}`}
                >
                  <span
                    className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-sm font-semibold"
                    style={{
                      borderColor: status === 'locked' ? 'var(--color-ink-500)' : h.color,
                      background: status === 'complete' ? h.color : 'var(--color-ink-900)',
                      color: status === 'complete' ? 'var(--color-ink-950)' : status === 'locked' ? 'var(--color-fog-400)' : h.color,
                    }}
                  >
                    {status === 'complete' ? '✓' : status === 'locked' ? '🔒' : l.n}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block font-medium ${status === 'locked' ? 'text-fog-400' : 'text-fog-100'}`}>
                      Level {l.n}: {l.title}
                    </span>
                    <span className="block truncate text-xs text-fog-400">{l.tagline}</span>
                  </span>
                  {l.status === 'ready' && lp.total > 0 && (
                    <span className="hidden font-mono text-xs text-fog-400 sm:block">
                      {lp.done}/{lp.total}
                    </span>
                  )}
                  <StatusPill status={status} />
                </button>
              </li>
            )
          })}
        </ol>
        <div className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <div className="panel p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-fog-400">Ability you unlock</div>
            <p className="mt-1 text-fog-100">{level.ability}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {level.topics.map((t) => (
                <span key={t} className="rounded-md bg-ink-700 px-2 py-0.5 text-xs text-fog-200">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <LevelBlock level={level} hub={hub} />
          <Link to={`/hub/${hub.id}`} className="block text-center text-sm text-flow hover:underline">
            Go to the {hub.name} →
          </Link>
        </div>
      </div>
    </div>
  )
}

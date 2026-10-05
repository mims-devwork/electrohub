import { Link } from 'react-router-dom'
import { EXPERIMENTS } from '../../content'
import type { Hub } from '../../content/types'
import { hubLevels } from '../../lib/progression'
import { useSnapshot } from '../../ui/Layout'
import { LinkButton, SectionTitle } from '../../ui/primitives'
import { LevelBlock } from './shared'

export function CircuitsHub({ hub }: { hub: Hub }) {
  const snap = useSnapshot()
  return (
    <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        {hubLevels(hub.id).map((l) => (
          <LevelBlock key={l.n} level={l} hub={hub} />
        ))}
        <div className="panel p-4">
          <SectionTitle eyebrow="Free build" title="Open bench">
            No instructions and no goals. Grab parts, wire things up, break them and see what happens.
          </SectionTitle>
          <LinkButton to="/lab/sandbox" variant="primary" className="mt-3">
            Open the bench →
          </LinkButton>
        </div>
      </div>
      <div>
        <SectionTitle eyebrow="All experiments" title="From one LED to a whole robot">
          Each experiment introduces exactly what you need for the next one.
        </SectionTitle>
        <ol className="relative mt-4 space-y-2 border-l border-ink-600 pl-5">
          {EXPERIMENTS.map((e) => {
            const done = snap.completed.includes(`experiment:${e.id}`)
            const ready = e.status === 'ready'
            return (
              <li key={e.id} className="relative">
                <span
                  className={`absolute -left-[29px] top-3 grid h-4 w-4 place-items-center rounded-full border-2 ${done ? 'border-ok bg-ok' : ready ? 'border-volt bg-ink-900' : 'border-ink-500 bg-ink-900'}`}
                />
                <Link to={`/experiment/${e.id}`} className={`panel block p-3 transition-colors ${ready ? 'hover:border-ink-500' : 'opacity-60'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-fog-400">EXP {String(e.number).padStart(2, '0')} · Level {e.levelN}</span>
                    <span className="text-[11px] text-fog-400">{done ? '✓ done' : ready ? `${e.xp} XP` : '🚧 being built'}</span>
                  </div>
                  <div className="mt-0.5 font-medium text-fog-100">{e.title}</div>
                  <p className="text-sm text-fog-400">{e.summary}</p>
                </Link>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

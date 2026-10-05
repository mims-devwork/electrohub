import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CATALOG, EXPERIMENTS, HUBS, LEVELS } from '../content'
import { isHubUnlocked, levelProgress, levelStatus, rankFor } from '../lib/progression'
import { useProgress } from '../store/progress'
import { PageHeader, useSnapshot } from '../ui/Layout'
import { Button, ProgressBar } from '../ui/primitives'
import { SchematicSymbol } from '../ui/Symbol'

export function ProgressPage() {
  const snap = useSnapshot()
  const xp = useProgress((s) => s.xp)
  const reset = useProgress((s) => s.reset)
  const [confirm, setConfirm] = useState(false)
  const rank = rankFor(xp)
  const readyLevels = LEVELS.filter((l) => l.status === 'ready')
  const abilities = readyLevels.filter((l) => levelStatus(l, snap) === 'complete')
  const experiments = EXPERIMENTS.filter((e) => e.status === 'ready')

  return (
    <div className="pb-16">
      <PageHeader crumbs={[{ label: 'Progress' }]} title="Your progress" learning="What you can do now, what you’ve collected, and which parts of the lab you’ve opened." />
      <div className="mx-auto grid max-w-[1400px] gap-5 px-4 pt-6 lg:grid-cols-3">
        <div className="panel p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-fog-400">Rank</div>
          <div className="mt-1 text-2xl font-semibold text-fog-100">{rank.name}</div>
          <div className="font-mono text-volt">{xp} XP</div>
          {rank.next && (
            <>
              <ProgressBar value={(xp - rank.floor) / Math.max(1, rank.ceil - rank.floor)} className="mt-3" />
              <div className="mt-1 text-xs text-fog-400">
                {rank.toNext} XP to {rank.next}
              </div>
            </>
          )}
        </div>
        <div className="panel p-5 lg:col-span-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-fog-400">Abilities unlocked</div>
          {abilities.length === 0 ? (
            <p className="mt-2 text-sm text-fog-300">
              None yet. Finish Level 1 to unlock your first. <Link to="/map" className="text-flow hover:underline">See the map →</Link>
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {abilities.map((l) => (
                <li key={l.n} className="flex gap-2 text-sm text-fog-100">
                  <span className="text-ok">✓</span>
                  <span>
                    <span className="text-fog-400">L{l.n} · </span>
                    {l.ability}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="panel p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-fog-400">Levels</div>
          <ul className="mt-2 space-y-2">
            {readyLevels.map((l) => {
              const lp = levelProgress(l, snap)
              return (
                <li key={l.n}>
                  <div className="flex justify-between text-sm text-fog-200">
                    <span>
                      L{l.n} {l.title}
                    </span>
                    <span className="font-mono text-xs text-fog-400">
                      {lp.done}/{lp.total}
                    </span>
                  </div>
                  <ProgressBar value={lp.ratio} className="mt-1" />
                </li>
              )
            })}
          </ul>
          <div className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-fog-400">Experiments</div>
          <ul className="mt-2 space-y-1 text-sm">
            {experiments.map((e) => (
              <li key={e.id} className="flex items-center gap-2">
                <span className={snap.completed.includes(`experiment:${e.id}`) ? 'text-ok' : 'text-ink-500'}>●</span>
                <Link to={`/experiment/${e.id}`} className="text-fog-200 hover:text-fog-100">
                  {String(e.number).padStart(2, '0')} · {e.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel p-5 lg:col-span-2">
          <div className="flex items-baseline justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-fog-400">Component collection</div>
            <span className="font-mono text-xs text-fog-400">
              {snap.inspected.length}/{CATALOG.length}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
            {CATALOG.map((c) => {
              const has = snap.inspected.includes(c.id)
              return (
                <Link
                  key={c.id}
                  to={`/components/${c.id}`}
                  className={`flex flex-col items-center rounded-xl border p-2 text-center transition-colors ${has ? 'border-flow/40 bg-flow/5 hover:bg-flow/10' : 'border-dashed border-ink-600 hover:border-ink-500'}`}
                >
                  <SchematicSymbol symbol={c.symbol} className={`h-8 w-16 ${has ? 'text-flow' : 'text-ink-500'}`} />
                  <span className={`mt-1 text-[11px] ${has ? 'text-fog-100' : 'text-fog-400'}`}>{has ? c.name : '?'}</span>
                </Link>
              )
            })}
          </div>
          <div className="mt-5 text-[11px] font-semibold uppercase tracking-wider text-fog-400">Lab areas</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {HUBS.map((h) => (
              <span key={h.id} className={`rounded-lg border px-2.5 py-1 text-xs ${isHubUnlocked(h, snap) ? 'border-ink-500 text-fog-100' : 'border-dashed border-ink-600 text-fog-400'}`}>
                {isHubUnlocked(h, snap) ? h.icon : '🔒'} {h.name}
              </span>
            ))}
          </div>
          <div className="mt-6 border-t border-ink-700 pt-4">
            {confirm ? (
              <div className="flex flex-wrap items-center gap-2 text-sm text-fog-300">
                Erase all progress on this device?
                <Button
                  variant="danger"
                  onClick={() => {
                    reset()
                    setConfirm(false)
                  }}
                >
                  Yes, start over
                </Button>
                <Button variant="ghost" onClick={() => setConfirm(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button variant="ghost" onClick={() => setConfirm(true)}>
                Reset progress…
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

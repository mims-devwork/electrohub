import { Link } from 'react-router-dom'
import { EXPERIMENT_BY_ID, LESSON_BY_ID } from '../../content'
import type { Hub, Level } from '../../content/types'
import { isItemDone, itemPlayable, itemRoute, itemTitle, levelProgress, levelStatus } from '../../lib/progression'
import { useSnapshot } from '../../ui/Layout'
import { Pill, ProgressBar } from '../../ui/primitives'

export function LevelBlock({ level, hub }: { level: Level; hub: Hub }) {
  const snap = useSnapshot()
  const status = levelStatus(level, snap)
  const lp = levelProgress(level, snap)
  return (
    <div className="panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-fog-400">Level {level.n}</div>
          <h3 className="font-semibold text-fog-100">{level.title}</h3>
          <p className="text-sm text-fog-400">{level.tagline}</p>
        </div>
        <StatusPill status={status} />
      </div>
      {level.status === 'ready' && <ProgressBar value={lp.ratio} color={hub.color} className="mt-3" />}
      <ol className="mt-3 space-y-1.5">
        {level.items.map((item, i) => {
          const done = isItemDone(item, snap)
          const playable = itemPlayable(item)
          const meta =
            item.type === 'lesson'
              ? `${LESSON_BY_ID[item.id]?.minutes ?? 3} min · ${LESSON_BY_ID[item.id]?.xp ?? 0} XP`
              : item.type === 'experiment'
                ? playable
                  ? `Experiment · ${EXPERIMENT_BY_ID[item.id]?.xp} XP`
                  : 'Being built'
                : `${item.componentIds.filter((c) => snap.inspected.includes(c)).length}/${item.componentIds.length} inspected`
          const body = (
            <>
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px] ${done ? 'border-ok bg-ok/20 text-ok' : 'border-ink-500 text-fog-400'}`}>{done ? '✓' : i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-sm ${playable ? 'text-fog-100' : 'text-fog-400'}`}>{itemTitle(item)}</span>
                <span className="text-[11px] text-fog-400">{meta}</span>
              </span>
              {playable && <span className="text-fog-400 transition-transform group-hover:translate-x-0.5">→</span>}
            </>
          )
          return (
            <li key={`${item.type}:${item.id}`}>
              {playable ? (
                <Link to={itemRoute(item)} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-ink-800">
                  {body}
                </Link>
              ) : (
                <div className="flex items-center gap-3 px-2 py-1.5">{body}</div>
              )}
            </li>
          )
        })}
        {level.items.length === 0 && <li className="px-2 text-sm text-fog-400">Topics: {level.topics.join(' · ')}</li>}
      </ol>
    </div>
  )
}

export function StatusPill({ status }: { status: ReturnType<typeof levelStatus> }) {
  switch (status) {
    case 'complete':
      return <Pill color="var(--color-ok)">✓ Complete</Pill>
    case 'current':
      return <Pill color="var(--color-volt)">● In progress</Pill>
    case 'available':
      return <Pill color="var(--color-flow)">Open</Pill>
    case 'building':
      return <Pill color="var(--color-brain)">🚧 Being built</Pill>
    case 'locked':
      return <Pill>🔒 Locked</Pill>
  }
}

/** Banner + roadmap for hubs that are previews of future levels. */
export function PreviewBanner({ hub, levels }: { hub: Hub; levels: Level[] }) {
  return (
    <div className="rounded-2xl border border-brain/30 bg-brain/5 p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          🚧
        </span>
        <div>
          <div className="font-semibold text-fog-100">This lab is still being built</div>
          <p className="text-sm text-fog-300">
            It opens at Level {hub.unlockLevel}. Until then, here’s a working preview, so you can see where the electricity, components and circuits you’re learning now are heading.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {levels.map((l) => (
              <Pill key={l.n} color={hub.color}>
                L{l.n} · {l.title}
              </Pill>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

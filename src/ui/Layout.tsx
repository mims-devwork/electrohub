import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { HUBS, LEVEL_BY_N } from '../content'
import { currentLevel, highestUnlocked, nextAction, rankFor, type ProgressSnapshot } from '../lib/progression'
import { useProgress } from '../store/progress'

export function useSnapshot(): ProgressSnapshot {
  return useProgress(useShallow((s) => ({ completed: s.completed, inspected: s.inspected })))
}

const NAV = [
  { to: '/', label: 'Lab', end: true },
  { to: '/map', label: 'Learning Map' },
  { to: '/projects', label: 'Projects' },
  { to: '/progress', label: 'Progress' },
]

export function Layout() {
  const snap = useSnapshot()
  const xp = useProgress((s) => s.xp)
  const rank = rankFor(xp)
  const level = currentLevel(snap)
  const location = useLocation()

  // Celebrate newly unlocked levels and lab areas, quietly.
  const unlocked = highestUnlocked(snap)
  const prev = useRef(unlocked)
  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => {
    if (unlocked > prev.current) {
      const lvl = LEVEL_BY_N[unlocked]
      const hub = HUBS.find((h) => h.unlockLevel === unlocked)
      setToast(`Level ${unlocked} unlocked: ${lvl?.title}${hub ? `. ${hub.name} is now open.` : ''}`)
      const t = setTimeout(() => setToast(null), 6000)
      prev.current = unlocked
      return () => clearTimeout(t)
    }
    prev.current = unlocked
  }, [unlocked])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-ink-700/70 bg-ink-950/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4">
          <Link to="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight text-fog-100">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-volt/15 text-volt" aria-hidden>
              ⚡
            </span>
            <span className="hidden sm:inline">ElectroHub</span>
          </Link>
          <nav className="no-scrollbar flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto sm:gap-1" aria-label="Main">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-md px-2 py-1.5 text-[13px] transition-colors sm:px-2.5 sm:text-sm ${isActive ? 'bg-ink-700 text-fog-100' : 'text-fog-400 hover:text-fog-100'}`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <Link
            to="/progress"
            className="hidden shrink-0 items-center gap-3 rounded-lg border border-ink-700 px-3 py-1.5 text-xs md:flex"
            title={rank.next ? `${rank.toNext} XP to ${rank.next}` : 'Top rank reached'}
          >
            <span className="text-fog-400">
              Level <span className="font-semibold text-fog-100">{level.n}</span>
            </span>
            <span className="h-4 w-px bg-ink-600" />
            <span className="text-fog-300">{rank.name}</span>
            <span className="font-mono text-volt">{xp} XP</span>
          </Link>
        </div>
      </header>
      <main className="lab-grid flex-1">
        <Outlet />
      </main>
      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 w-[min(92vw,520px)] -translate-x-1/2 rise-in" role="status">
          <div className="panel-strong flex items-center gap-3 px-4 py-3 text-sm shadow-2xl">
            <span className="text-xl" aria-hidden>
              🔓
            </span>
            <span className="flex-1 text-fog-100">{toast}</span>
            <button className="text-fog-400 hover:text-fog-100" onClick={() => setToast(null)} aria-label="Dismiss">
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export interface Crumb {
  label: string
  to?: string
}

/**
 * Every screen answers three questions:
 * Where am I? (crumbs) · What am I learning? (title + learning) · What next? (next action)
 */
export function PageHeader({
  crumbs,
  title,
  learning,
  accent = 'var(--color-volt)',
  icon,
  right,
  hideNext = false,
}: {
  crumbs: Crumb[]
  title: string
  learning?: ReactNode
  accent?: string
  icon?: string
  right?: ReactNode
  hideNext?: boolean
}) {
  return (
    <div className="border-b border-ink-700/60 bg-ink-900/40">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <nav className="flex flex-wrap items-center gap-1 text-xs text-fog-400" aria-label="You are here">
            <Link to="/" className="hover:text-fog-100">
              Lab
            </Link>
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                <span aria-hidden>›</span>
                {c.to ? (
                  <Link to={c.to} className="hover:text-fog-100">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-fog-200">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-tight text-fog-100 md:text-2xl">
            {icon && (
              <span className="grid h-8 w-8 place-items-center rounded-lg text-lg" style={{ background: `color-mix(in oklab, ${accent} 16%, transparent)` }} aria-hidden>
                {icon}
              </span>
            )}
            {title}
          </h1>
          {learning && <p className="mt-1 max-w-2xl text-sm text-fog-300">{learning}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {right}
          {!hideNext && <NextUp />}
        </div>
      </div>
    </div>
  )
}

export function NextUp({ compact = true }: { compact?: boolean }) {
  const snap = useSnapshot()
  const next = nextAction(snap)
  const location = useLocation()
  if (location.pathname === next.to) return null
  return (
    <Link
      to={next.to}
      className={`group flex items-center gap-3 rounded-xl border border-volt/40 bg-volt/10 text-left transition-colors hover:bg-volt/20 ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}
    >
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-volt">Next up</div>
        <div className="truncate text-sm font-medium text-fog-100">{next.title}</div>
        {!compact && <div className="text-xs text-fog-400">{next.subtitle}</div>}
      </div>
      <span className="text-volt transition-transform group-hover:translate-x-0.5" aria-hidden>
        →
      </span>
    </Link>
  )
}

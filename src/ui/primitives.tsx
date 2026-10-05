import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Analogy, Term } from '../content/types'
import type { Issue } from '../sim/diagnose'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-volt text-ink-950 hover:bg-amber-300 font-semibold',
  secondary: 'bg-ink-700 text-fog-100 hover:bg-ink-600 border border-ink-600',
  ghost: 'text-fog-300 hover:text-fog-100 hover:bg-ink-800',
  danger: 'bg-danger/15 text-rose-200 border border-danger/40 hover:bg-danger/25',
}

export function Button({
  variant = 'secondary',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
      {...rest}
    />
  )
}

export function LinkButton({
  to,
  variant = 'secondary',
  className = '',
  children,
}: {
  to: string
  variant?: Variant
  className?: string
  children: ReactNode
}) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm transition-colors ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </Link>
  )
}

export function ProgressBar({ value, color = 'var(--color-volt)', className = '' }: { value: number; color?: string; className?: string }) {
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-ink-700 ${className}`}>
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, background: color }} />
    </div>
  )
}

export function TermCard({ term }: { term: Term }) {
  return (
    <div className="rounded-xl border border-flow/30 bg-flow/5 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-flow">Technical name</div>
      <div className="mt-0.5 font-semibold text-fog-100">{term.name}</div>
      <div className="text-sm text-fog-300">{term.plain}</div>
    </div>
  )
}

export function AnalogyCard({ analogy }: { analogy: Analogy }) {
  return (
    <div className="rounded-xl border border-ink-600 bg-ink-800/70 px-4 py-3 text-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-volt">Think of it like…</div>
      <p className="mt-1 text-fog-100">{analogy.text}</p>
      <p className="mt-2 text-fog-400">
        <span className="font-medium text-fog-300">Where the analogy breaks: </span>
        {analogy.limit}
      </p>
    </div>
  )
}

const ISSUE_STYLE: Record<Issue['severity'], { ring: string; icon: string; label: string }> = {
  danger: { ring: 'border-danger/50 bg-danger/10', icon: '⚠️', label: 'Something went wrong' },
  warning: { ring: 'border-warn/50 bg-warn/10', icon: '🌡️', label: 'Careful' },
  info: { ring: 'border-flow/40 bg-flow/5', icon: '💡', label: 'Hint' },
  success: { ring: 'border-ok/40 bg-ok/10', icon: '✅', label: 'Working' },
}

/** What happened → Why → How to fix. */
export function IssueCard({ issue, compact = false }: { issue: Issue; compact?: boolean }) {
  const s = ISSUE_STYLE[issue.severity]
  return (
    <div className={`rise-in rounded-xl border px-4 py-3 text-sm ${s.ring}`} role={issue.severity === 'danger' ? 'alert' : undefined}>
      <div className="flex items-center gap-2 font-semibold text-fog-100">
        <span aria-hidden>{s.icon}</span>
        {issue.title}
      </div>
      <p className="mt-1.5 text-fog-200">{issue.what}</p>
      {!compact && (
        <p className="mt-2 text-fog-300">
          <span className="font-semibold text-fog-100">Why? </span>
          {issue.why}
        </p>
      )}
      {issue.fix && (
        <p className="mt-2 text-fog-300">
          <span className="font-semibold text-ok">Fix it: </span>
          {issue.fix}
        </p>
      )}
    </div>
  )
}

export function Meter({ label, value, unit, color = 'var(--color-fog-100)', hint }: { label: string; value: string; unit?: string; color?: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-900/80 px-3 py-2" title={hint}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-fog-400">{label}</div>
      <div className="font-mono text-lg leading-tight" style={{ color }}>
        {value}
        {unit && <span className="ml-1 text-xs text-fog-400">{unit}</span>}
      </div>
    </div>
  )
}

export function Pill({ children, color = 'var(--color-fog-300)' }: { children: ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{ color, borderColor: `color-mix(in oklab, ${color} 45%, transparent)`, background: `color-mix(in oklab, ${color} 10%, transparent)` }}
    >
      {children}
    </span>
  )
}

export function SectionTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div>
      {eyebrow && <div className="text-[11px] font-semibold uppercase tracking-wider text-fog-400">{eyebrow}</div>}
      <h2 className="text-lg font-semibold text-fog-100">{title}</h2>
      {children && <p className="mt-1 text-sm text-fog-300">{children}</p>}
    </div>
  )
}

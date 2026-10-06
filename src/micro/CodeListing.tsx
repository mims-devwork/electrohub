import type { CodeToken } from './programs'

export interface CodeStatus {
  text: string
  tone: 'ok' | 'busy' | 'bad'
}

const TONE = {
  ok: 'border-ok/50 bg-ok/10 text-ok',
  busy: 'border-volt/50 bg-volt/10 text-volt',
  bad: 'border-danger/50 bg-danger/10 text-rose-200',
}

/** A program listing with live line highlighting and drop-downs for the parts the learner may edit. */
export function CodeListing({
  name,
  lines,
  slots,
  values,
  active,
  status,
  onSlot,
  footnote,
}: {
  name: string
  lines: { code: CodeToken[]; tag?: string }[]
  slots: Record<string, { label: string; options: string[] }>
  values: Record<string, string>
  /** Tags of the lines running right now. */
  active: string[]
  status: CodeStatus
  onSlot: (id: string, value: string) => void
  footnote: string
}) {
  return (
    <div className="panel min-w-0 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-fog-400">
          Program on the board · <span className="font-mono normal-case tracking-normal text-fog-300">{name}</span>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONE[status.tone]}`}>{status.text}</span>
      </div>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-ink-950 p-3 font-mono text-[12.5px] leading-6 scrollbar-thin">
        {lines.map((l, i) => {
          const on = !!l.tag && active.includes(l.tag)
          return (
            <div key={i} className={`rounded px-1 transition-colors ${on ? 'bg-brain/20 text-fog-100' : 'text-fog-400'}`}>
              {l.code.map((tok, j) =>
                typeof tok === 'string' ? (
                  <span key={j}>{tok || ' '}</span>
                ) : (
                  <select
                    key={j}
                    value={values[tok.slot]}
                    onChange={(e) => onSlot(tok.slot, e.target.value)}
                    aria-label={slots[tok.slot].label}
                    className="mx-0.5 cursor-pointer rounded border border-brain/60 bg-brain/15 px-1 font-mono text-[12.5px] text-brain"
                  >
                    {slots[tok.slot].options.map((o) => (
                      <option key={o} value={o} className="bg-ink-900 text-fog-100">
                        {o}
                      </option>
                    ))}
                  </select>
                ),
              )}
            </div>
          )
        })}
      </pre>
      <p className="mt-2 text-xs text-fog-400">{footnote}</p>
    </div>
  )
}

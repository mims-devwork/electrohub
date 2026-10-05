import { PART_DEFS } from '../sim/parts'
import type { Part, PartKind } from '../sim/types'
import { PartGlyph } from './PartGlyph'

const PREVIEW: Record<PartKind, Part> = Object.fromEntries(
  (Object.keys(PART_DEFS) as PartKind[]).map((k) => [k, { id: k, kind: k, x: 0, y: 0, rot: 0, props: { ...PART_DEFS[k].defaults } }]),
) as Record<PartKind, Part>

/** Parts you can drag onto the bench (or tap to add on touch screens). */
export function Tray({ kinds, onAdd }: { kinds: PartKind[]; onAdd: (kind: PartKind) => void }) {
  if (!kinds.length) return null
  return (
    <div className="panel flex flex-wrap items-center gap-3 p-2.5">
      <div className="px-1 text-[11px] font-semibold uppercase tracking-wider text-fog-400">Parts tray<span className="block font-normal normal-case tracking-normal">drag onto the bench, or click</span></div>
      <div className="flex flex-wrap gap-2">
        {kinds.map((k) => (
          <button
            key={k}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/x-electrohub-part', k)
              e.dataTransfer.effectAllowed = 'copy'
            }}
            onClick={() => onAdd(k)}
            className="group flex w-[96px] flex-col items-center rounded-xl border border-ink-600 bg-ink-900 px-2 py-1.5 transition-colors hover:border-volt/60"
          >
            <svg viewBox="-60 -30 120 60" className="h-8 w-full">
              <PartGlyph part={PREVIEW[k]} />
            </svg>
            <span className="text-xs text-fog-200">{PART_DEFS[k].name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

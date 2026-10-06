import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CATALOG, CATALOG_BY_ID, HUB_BY_ID, LEVELS } from '../../content'
import { isItemDone, isLevelUnlocked } from '../../lib/progression'
import type { CatalogComponent } from '../../content/types'
import { useProgress } from '../../store/progress'
import { ComponentViewer } from '../../three/ComponentViewer'
import { useSnapshot } from '../../ui/Layout'
import { AnalogyCard, LinkButton, ProgressBar, TermCard } from '../../ui/primitives'
import { SchematicSymbol } from '../../ui/Symbol'
import { LevelBlock } from './shared'

const GROUP_LABEL: Record<CatalogComponent['group'], string> = {
  power: 'Power',
  passive: 'Passive parts',
  semiconductor: 'Semiconductors',
  switching: 'Switching',
  connection: 'Connections',
  protection: 'Protection',
  computing: 'Computing',
  sensing: 'Sensors',
  motion: 'Motors',
}

export function ComponentsHub() {
  const { componentId } = useParams()
  const navigate = useNavigate()
  const snap = useSnapshot()
  const inspect = useProgress((s) => s.inspect)
  const selected = CATALOG_BY_ID[componentId ?? ''] ?? CATALOG_BY_ID.led
  const [hotspot, setHotspot] = useState<string | null>(null)
  // Show the kit you're collecting now: the first unlocked, unfinished one (or the starter kit).
  const kits = LEVELS.flatMap((l) => l.items.flatMap((i) => (i.type === 'collect' ? [{ level: l, kit: i }] : [])))
  const kitNow = kits.find(({ level, kit }) => isLevelUnlocked(level.n, snap) && !isItemDone(kit, snap)) ?? kits[0]
  const starterIds = kitNow.kit.componentIds
  const collected = snap.inspected.includes(selected.id)
  const activeHotspot = selected.hotspots.find((h) => h.id === hotspot)

  const select = (id: string) => {
    setHotspot(null)
    navigate(`/components/${id}`, { replace: !!componentId })
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)_380px]">
      {/* catalog */}
      <div className="space-y-4">
        <div className="panel p-3">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-semibold text-fog-100">{kitNow.kit.title.replace(/^Inspect the /, '').replace(/^./, (c) => c.toUpperCase())}</span>
            <span className="font-mono text-fog-400">
              {starterIds.filter((id) => snap.inspected.includes(id)).length}/{starterIds.length}
            </span>
          </div>
          <ProgressBar value={starterIds.filter((id) => snap.inspected.includes(id)).length / Math.max(1, starterIds.length)} color="var(--color-flow)" className="mt-2" />
          <p className="mt-2 text-[11px] text-fog-400">Click at least one numbered spot on a part to add it to your collection.</p>
        </div>
        {(Object.keys(GROUP_LABEL) as CatalogComponent['group'][]).map((g) => {
          const items = CATALOG.filter((c) => c.group === g)
          if (!items.length) return null
          return (
            <div key={g}>
              <div className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wider text-fog-400">{GROUP_LABEL[g]}</div>
              <div className="grid grid-cols-2 gap-1.5 xl:grid-cols-1">
                {items.map((c) => {
                  const has = snap.inspected.includes(c.id)
                  const active = c.id === selected.id
                  return (
                    <button
                      key={c.id}
                      onClick={() => select(c.id)}
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-sm transition-colors ${
                        active ? 'border-flow/60 bg-flow/10 text-fog-100' : 'border-transparent text-fog-300 hover:bg-ink-800'
                      }`}
                    >
                      <SchematicSymbol symbol={c.symbol} className="h-5 w-10 shrink-0 text-fog-400" />
                      <span className="flex-1 truncate">{c.name}</span>
                      {has && (
                        <span className="text-ok" title="Collected">
                          ✓
                        </span>
                      )}
                      {!has && starterIds.includes(c.id) && <span className="h-1.5 w-1.5 rounded-full bg-flow" title={`Part of the ${kitNow.kit.title.replace(/^Inspect the /, '')}`} />}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* 3D inspector */}
      <div className="min-w-0 space-y-3">
        <ComponentViewer
          key={selected.id}
          component={selected}
          activeHotspot={hotspot}
          onHotspot={(id) => {
            setHotspot(id)
            inspect(selected.id)
          }}
          height="min(62vh, 520px)"
        />
        {activeHotspot ? (
          <div className="panel rise-in p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-volt">Inspecting</div>
            <div className="font-semibold text-fog-100">{activeHotspot.label}</div>
            <p className="mt-1 text-sm text-fog-300">{activeHotspot.detail}</p>
          </div>
        ) : (
          <div className="panel p-4 text-sm text-fog-400">👆 Click a numbered spot on the model to inspect that feature.</div>
        )}
        <div className="flex flex-wrap gap-2">
          {selected.hotspots.map((h, i) => (
            <button
              key={h.id}
              onClick={() => {
                setHotspot(h.id)
                inspect(selected.id)
              }}
              className={`rounded-full border px-3 py-1 text-xs ${hotspot === h.id ? 'border-volt bg-volt/15 text-volt' : 'border-ink-600 text-fog-300 hover:text-fog-100'}`}
            >
              {i + 1}. {h.label}
            </button>
          ))}
        </div>
      </div>

      {/* What → Does → Why → Where */}
      <div className="space-y-3">
        <div className="panel p-4">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-xl font-semibold text-fog-100">{selected.name}</h2>
            {collected ? <span className="text-xs text-ok">✓ In your collection</span> : <span className="text-xs text-fog-400">Not inspected yet</span>}
          </div>
          <dl className="mt-3 space-y-3 text-sm">
            {[
              ['What is it?', selected.what],
              ['What does it do?', selected.does],
              ['Why do we need it?', selected.why],
            ].map(([q, a]) => (
              <div key={q}>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-fog-400">{q}</dt>
                <dd className="mt-0.5 text-fog-100">{a}</dd>
              </div>
            ))}
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-fog-400">Where is it used?</dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {selected.where.map((w) => (
                  <span key={w} className="rounded-md bg-ink-700 px-2 py-0.5 text-xs text-fog-200">
                    {w}
                  </span>
                ))}
              </dd>
            </div>
          </dl>
        </div>
        {selected.analogy && <AnalogyCard analogy={selected.analogy} />}
        <TermCard term={{ name: selected.technical, plain: selected.what }} />
        <div className="panel flex items-center gap-4 p-4">
          <SchematicSymbol symbol={selected.symbol} className="h-14 w-28 shrink-0 text-flow" />
          <p className="text-xs text-fog-300">
            <span className="font-semibold text-fog-100">Schematic symbol.</span> This is how {/^[A-Z]{2,}/.test(selected.name) ? `an ${selected.name}` : `a ${selected.name.toLowerCase()}`} is drawn in circuit diagrams. You’ll read and draw these in Level 10.
          </p>
        </div>
        {selected.tryIt && (
          <LinkButton to={selected.tryIt.to} variant="primary" className="w-full">
            {selected.tryIt.label} →
          </LinkButton>
        )}
        <div className="pt-2">
          <LevelBlock level={kitNow.level} hub={HUB_BY_ID[kitNow.level.hubId]} />
        </div>
        <Link to="/hub/circuits" className="block text-center text-xs text-flow hover:underline">
          Ready to wire them up? Go to the Circuit Lab →
        </Link>
      </div>
    </div>
  )
}

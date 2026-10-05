import type { Hub } from '../../content/types'
import { hubLevels } from '../../lib/progression'
import { MicroPlayground } from './MicroPlayground'
import { LevelBlock } from './shared'

export function MicroHub({ hub }: { hub: Hub }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        {hubLevels(hub.id).map((l) => (
          <LevelBlock key={l.n} level={l} hub={hub} />
        ))}
      </div>
      <div className="min-w-0">
        <MicroPlayground />
      </div>
    </div>
  )
}

import type { Hub } from '../../content/types'
import { hubLevels } from '../../lib/progression'
import { LevelBlock } from './shared'
import { RoboticsPlayground } from './RoboticsPlayground'

export function RoboticsHub({ hub }: { hub: Hub }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        {hubLevels(hub.id).map((l) => (
          <LevelBlock key={l.n} level={l} hub={hub} />
        ))}
      </div>
      <div className="min-w-0">
        <RoboticsPlayground />
      </div>
    </div>
  )
}

import type { Hub } from '../../content/types'
import { hubLevels } from '../../lib/progression'
import { SectionTitle } from '../../ui/primitives'
import { FlowLoop } from '../../widgets/FlowLoop'
import { LevelBlock } from './shared'

const noop = () => {}

export function ElectricityHub({ hub }: { hub: Hub }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
      <div className="space-y-4">
        {hubLevels(hub.id).map((l) => (
          <LevelBlock key={l.n} level={l} hub={hub} />
        ))}
      </div>
      <div className="space-y-3">
        <SectionTitle eyebrow="Free play" title="The test loop">
          Everything from Level 1 on one bench. Change the push, add resistance, flip the switch, and switch on the electrons or the current arrows.
        </SectionTitle>
        <FlowLoop onEvent={noop} props={{ controls: ['voltage', 'resistance'], voltage: 6, resistance: 6, switchClosed: true }} />
      </div>
    </div>
  )
}

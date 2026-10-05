import { LabWorkspace } from '../circuit/LabWorkspace'
import { useCircuit } from '../circuit/useCircuit'
import { HUB_BY_ID } from '../content'
import type { Circuit } from '../sim/types'
import { PageHeader } from '../ui/Layout'

const START: Circuit = {
  parts: [
    { id: 'bat', kind: 'battery', x: 170, y: 260, rot: 270, props: { voltage: 9 } },
    { id: 'r1', kind: 'resistor', x: 420, y: 140, rot: 0, props: { ohms: 470 } },
    { id: 'led', kind: 'led', x: 660, y: 260, rot: 90, props: { color: 'blue' } },
    { id: 'sw', kind: 'switch', x: 420, y: 400, rot: 0, props: { closed: false } },
  ],
  wires: [],
}

export function SandboxPage() {
  const api = useCircuit(START)
  const hub = HUB_BY_ID.circuits
  return (
    <div className="pb-16">
      <PageHeader
        crumbs={[{ label: hub.name, to: '/hub/circuits' }, { label: 'Open bench' }]}
        title="Open bench"
        learning="Free building. Try two LEDs, swap battery voltages, or make a short circuit on purpose and read what the lab notes say."
        icon={hub.icon}
        accent={hub.color}
      />
      <div className="mx-auto max-w-[1400px] px-4 pt-5">
        <LabWorkspace api={api} tray={['battery', 'resistor', 'led', 'switch', 'button']} onReset={() => api.reset(START)} />
      </div>
    </div>
  )
}

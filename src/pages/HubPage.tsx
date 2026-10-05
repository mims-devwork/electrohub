import { Navigate, useParams } from 'react-router-dom'
import { HUB_BY_ID } from '../content'
import type { HubId } from '../content/types'
import { hubLevels, isHubUnlocked } from '../lib/progression'
import { usePeeking } from '../store/peek'
import { PageHeader, useSnapshot } from '../ui/Layout'
import { NotFoundBlock } from './LessonPage'
import { LockedNotice } from './LockedNotice'
import { CircuitsHub } from './hubs/CircuitsHub'
import { ComponentsHub } from './hubs/ComponentsHub'
import { ElectricityHub } from './hubs/ElectricityHub'
import { MicroHub } from './hubs/MicroHub'
import { PcbPreview } from './previews/PcbPreview'
import { RoboticsPreview } from './previews/RoboticsPreview'
import { PreviewBanner } from './hubs/shared'

export function HubPage() {
  const { hubId = '' } = useParams()
  const hub = HUB_BY_ID[hubId as HubId]
  const snap = useSnapshot()
  const [peek, setPeek] = usePeeking(hub?.unlockLevel ?? 0)
  if (!hub) return <NotFoundBlock what="lab" />
  if (hub.id === 'projects') return <Navigate to="/projects" replace />

  const unlocked = isHubUnlocked(hub, snap)
  const levels = hubLevels(hub.id)
  const levelRange = levels.length ? (levels.length > 1 ? `Levels ${levels[0].n}–${levels[levels.length - 1].n}` : `Level ${levels[0].n}`) : ''

  const header = <PageHeader crumbs={[{ label: hub.name }]} title={hub.name} learning={`${hub.tagline} ${levelRange ? `(${levelRange})` : ''}`} icon={hub.icon} accent={hub.color} />

  // Open hubs gate on progress; preview hubs are always viewable as previews.
  if (hub.status === 'open' && !unlocked && !peek) {
    return (
      <>
        {header}
        <LockedNotice levelN={hub.unlockLevel} onPeek={setPeek} />
      </>
    )
  }

  return (
    <div className="pb-16">
      {header}
      <div className="mx-auto max-w-[1400px] space-y-6 px-4 pt-6">
        {hub.status === 'preview' && <PreviewBanner hub={hub} levels={levels} />}
        {hub.id === 'electricity' && <ElectricityHub hub={hub} />}
        {hub.id === 'components' && <ComponentsHub />}
        {hub.id === 'circuits' && <CircuitsHub hub={hub} />}
        {hub.id === 'microcontrollers' && <MicroHub hub={hub} />}
        {hub.id === 'robotics' && <RoboticsPreview />}
        {hub.id === 'pcb' && <PcbPreview />}
      </div>
    </div>
  )
}

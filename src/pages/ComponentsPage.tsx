import { useParams } from 'react-router-dom'
import { CATALOG_BY_ID, HUB_BY_ID } from '../content'
import { isHubUnlocked } from '../lib/progression'
import { usePeeking } from '../store/peek'
import { PageHeader, useSnapshot } from '../ui/Layout'
import { ComponentsHub } from './hubs/ComponentsHub'
import { LockedNotice } from './LockedNotice'

/** /components/:componentId — the Components Lab focused on one part. */
export function ComponentsPage() {
  const { componentId = '' } = useParams()
  const hub = HUB_BY_ID.components
  const snap = useSnapshot()
  const [peek, setPeek] = usePeeking(hub.unlockLevel)
  const c = CATALOG_BY_ID[componentId]
  const header = (
    <PageHeader
      crumbs={[{ label: hub.name, to: '/hub/components' }, { label: c?.name ?? 'Component' }]}
      title={c ? `${c.name}` : hub.name}
      learning={c ? `${c.what} Rotate it, click the numbered spots, and find out what each feature does.` : hub.tagline}
      icon={hub.icon}
      accent={hub.color}
    />
  )
  // Peeking at parts you've already met (e.g. linked from the Circuit Lab) is always allowed.
  const alwaysOpen = componentId === 'battery'
  if (!isHubUnlocked(hub, snap) && !peek && !alwaysOpen) {
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
      <div className="mx-auto max-w-[1400px] px-4 pt-6">
        <ComponentsHub />
      </div>
    </div>
  )
}

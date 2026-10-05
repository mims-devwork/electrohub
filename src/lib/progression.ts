import { EXPERIMENT_BY_ID, HUBS, LESSON_BY_ID, LEVELS } from '../content'
import type { Hub, Level, LevelItem } from '../content/types'

export interface ProgressSnapshot {
  completed: string[]
  inspected: string[]
}

export type LevelStatus = 'complete' | 'current' | 'available' | 'locked' | 'building'

export function itemKey(item: LevelItem): string {
  return `${item.type}:${item.id}`
}

export function itemRoute(item: LevelItem): string {
  switch (item.type) {
    case 'lesson':
      return `/lesson/${item.id}`
    case 'experiment':
      return `/experiment/${item.id}`
    case 'collect':
      return '/hub/components'
  }
}

export function itemTitle(item: LevelItem): string {
  switch (item.type) {
    case 'lesson':
      return LESSON_BY_ID[item.id]?.title ?? item.id
    case 'experiment': {
      const e = EXPERIMENT_BY_ID[item.id]
      return e ? `Experiment ${String(e.number).padStart(2, '0')}: ${e.title}` : item.id
    }
    case 'collect':
      return item.title
  }
}

export function itemPlayable(item: LevelItem): boolean {
  if (item.type === 'lesson') return !!LESSON_BY_ID[item.id]
  if (item.type === 'experiment') return EXPERIMENT_BY_ID[item.id]?.status === 'ready'
  return true
}

export function isItemDone(item: LevelItem, p: ProgressSnapshot): boolean {
  if (item.type === 'collect') return item.componentIds.every((id) => p.inspected.includes(id))
  return p.completed.includes(itemKey(item))
}

export function levelProgress(level: Level, p: ProgressSnapshot) {
  const total = level.items.length
  const done = level.items.filter((i) => isItemDone(i, p)).length
  return { done, total, ratio: total ? done / total : 0 }
}

export function isLevelComplete(level: Level, p: ProgressSnapshot): boolean {
  return level.status === 'ready' && level.items.every((i) => isItemDone(i, p))
}

export function isLevelUnlocked(n: number, p: ProgressSnapshot): boolean {
  if (n <= 1) return true
  const prev = LEVELS.find((l) => l.n === n - 1)
  return !!prev && isLevelComplete(prev, p)
}

export function levelStatus(level: Level, p: ProgressSnapshot): LevelStatus {
  if (!isLevelUnlocked(level.n, p)) return 'locked'
  if (level.status === 'planned') return 'building'
  if (isLevelComplete(level, p)) return 'complete'
  return level.n === currentLevel(p).n ? 'current' : 'available'
}

/** The first level that is unlocked but not finished. */
export function currentLevel(p: ProgressSnapshot): Level {
  return LEVELS.find((l) => isLevelUnlocked(l.n, p) && !isLevelComplete(l, p)) ?? LEVELS[LEVELS.length - 1]
}

/** Highest level number the learner has unlocked. */
export function highestUnlocked(p: ProgressSnapshot): number {
  let n = 1
  for (const l of LEVELS) if (isLevelUnlocked(l.n, p)) n = l.n
  return n
}

export function isHubUnlocked(hub: Hub, p: ProgressSnapshot): boolean {
  return highestUnlocked(p) >= hub.unlockLevel
}

export interface NextAction {
  title: string
  subtitle: string
  to: string
  level: Level
}

/** Answers "What should I do next?" for every screen. */
export function nextAction(p: ProgressSnapshot): NextAction {
  const level = currentLevel(p)
  if (level.status === 'ready') {
    const item = level.items.find((i) => !isItemDone(i, p) && itemPlayable(i))
    if (item) {
      return { title: itemTitle(item), subtitle: `Level ${level.n} · ${level.title}`, to: itemRoute(item), level }
    }
  }
  return {
    title: `Level ${level.n} is being built`,
    subtitle: 'Explore the previews of what’s coming next',
    to: `/hub/${level.hubId}`,
    level,
  }
}

export function hubLevels(hubId: Hub['id']): Level[] {
  return LEVELS.filter((l) => l.hubId === hubId)
}

export function hubForLevel(n: number): Hub | undefined {
  const level = LEVELS.find((l) => l.n === n)
  return HUBS.find((h) => h.id === level?.hubId)
}

const RANKS = [
  { xp: 0, name: 'Curious beginner' },
  { xp: 150, name: 'Spark' },
  { xp: 400, name: 'Loop closer' },
  { xp: 650, name: 'Parts collector' },
  { xp: 900, name: 'Circuit builder' },
  { xp: 1300, name: 'Bench engineer' },
]

export function rankFor(xp: number) {
  let idx = 0
  RANKS.forEach((r, i) => {
    if (xp >= r.xp) idx = i
  })
  const next = RANKS[idx + 1]
  return { name: RANKS[idx].name, next: next?.name, toNext: next ? next.xp - xp : 0, floor: RANKS[idx].xp, ceil: next?.xp ?? RANKS[idx].xp }
}

// Single entry point for all learning content.
import { COMPONENT_LESSONS } from './lessons/components'
import { ELECTRICITY_LESSONS } from './lessons/electricity'
import { MICROCONTROLLER_LESSONS } from './lessons/microcontrollers'
import { ROBOTICS_LESSONS } from './lessons/robotics'
import type { Lesson } from './types'

export { CATALOG, CATALOG_BY_ID } from './components'
export { EXPERIMENTS, EXPERIMENT_BY_ID } from './experiments'
export { HUBS, HUB_BY_ID } from './hubs'
export { CAPSTONE, LEVELS, LEVEL_BY_N } from './levels'

export const LESSONS: Lesson[] = [...ELECTRICITY_LESSONS, ...COMPONENT_LESSONS, ...MICROCONTROLLER_LESSONS, ...ROBOTICS_LESSONS]
export const LESSON_BY_ID = Object.fromEntries(LESSONS.map((l) => [l.id, l])) as Record<string, Lesson>

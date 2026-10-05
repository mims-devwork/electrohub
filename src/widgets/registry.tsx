import type { ComponentType } from 'react'
import type { WidgetId } from '../content/types'
import { AcDc } from './AcDc'
import { BatteryStack } from './BatteryStack'
import { ColorBands } from './ColorBands'
import { FlowLoop } from './FlowLoop'
import { GroundProbe } from './GroundProbe'
import { LedLegs } from './LedLegs'
import { SafetySort } from './SafetySort'
import type { WidgetProps } from './types'

/** Lesson content refers to widgets by id; this maps ids to implementations. */
export const WIDGETS: Record<WidgetId, ComponentType<WidgetProps>> = {
  'flow-loop': FlowLoop,
  'ac-dc': AcDc,
  'battery-stack': BatteryStack,
  'ground-probe': GroundProbe,
  'safety-sort': SafetySort,
  'color-bands': ColorBands,
  'led-legs': LedLegs,
}

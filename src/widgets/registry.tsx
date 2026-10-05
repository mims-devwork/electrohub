import type { ComponentType } from 'react'
import type { WidgetId } from '../content/types'
import { AcDc } from './AcDc'
import { BatteryStack } from './BatteryStack'
import { CodeStepper } from './CodeStepper'
import { ColorBands } from './ColorBands'
import { Divider } from './Divider'
import { FlowLoop } from './FlowLoop'
import { GroundProbe } from './GroundProbe'
import { LedLegs } from './LedLegs'
import { LogicThreshold } from './LogicThreshold'
import { PinFinder } from './PinFinder'
import { PotKnob } from './PotKnob'
import { Pwm } from './Pwm'
import { SafetySort } from './SafetySort'
import { SignalScope } from './SignalScope'
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
  'signal-scope': SignalScope,
  'logic-threshold': LogicThreshold,
  divider: Divider,
  'pot-knob': PotKnob,
  'pin-finder': PinFinder,
  'code-stepper': CodeStepper,
  pwm: Pwm,
}

import type { ComponentType } from 'react'
import type { WidgetId } from '../content/types'
import { AcDc } from './AcDc'
import { BatteryStack } from './BatteryStack'
import { BlockDiagram } from './BlockDiagram'
import { CodeStepper } from './CodeStepper'
import { ColorBands } from './ColorBands'
import { ControlLoop } from './ControlLoop'
import { Divider } from './Divider'
import { FlowLoop } from './FlowLoop'
import { GroundProbe } from './GroundProbe'
import { HBridge } from './HBridge'
import { LedLegs } from './LedLegs'
import { LightSensor } from './LightSensor'
import { LogicThreshold } from './LogicThreshold'
import { MotorLoad } from './MotorLoad'
import { PinFinder } from './PinFinder'
import { PotKnob } from './PotKnob'
import { PowerBudget } from './PowerBudget'
import { Protection } from './Protection'
import { Pwm } from './Pwm'
import { Regulator } from './Regulator'
import { SafetySort } from './SafetySort'
import { SensorSort } from './SensorSort'
import { ServoPulse } from './ServoPulse'
import { SignalScope } from './SignalScope'
import { Uart } from './Uart'
import { Ultrasonic } from './Ultrasonic'
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
  'sensor-sort': SensorSort,
  'light-sensor': LightSensor,
  ultrasonic: Ultrasonic,
  uart: Uart,
  'motor-load': MotorLoad,
  'h-bridge': HBridge,
  'servo-pulse': ServoPulse,
  'power-budget': PowerBudget,
  regulator: Regulator,
  protection: Protection,
  'block-diagram': BlockDiagram,
  'control-loop': ControlLoop,
}

// Data model for the Microcontroller Lab bench.
// Like the circuit simulator, everything is plain data: an experiment describes
// the parts, the wires and which program is on the board; the engine decides
// what every pin sees.

import type { LedColor } from '../sim/types'

/** The header pins we expose on the board. GND2 is a second ground pin (same net as GND). */
export type BoardPin = '5V' | 'GND' | 'A0' | 'D2' | 'D9' | 'D13' | 'GND2'

/** Parts that can sit next to the board. */
export type MicroPartKind = 'pot' | 'button' | 'led' | 'resistor'

export interface MicroPart {
  id: string
  kind: MicroPartKind
  x: number
  y: number
  props: {
    /** resistor */
    ohms?: number
    /** led (module with its own 220 Ω resistor) */
    color?: LedColor
  }
  /** Parts placed by an experiment that the learner may not delete. */
  locked?: boolean
}

/** "partId:terminal", or "board:PIN" for a header pin. */
export type MicroRef = string

export interface MicroWire {
  id: string
  from: MicroRef
  to: MicroRef
}

export type ProgramId = 'read-pot' | 'button-led' | 'dimmer'

export interface MicroSetup {
  parts: MicroPart[]
  wires: MicroWire[]
  program: ProgramId
  /** Starting values for the editable parts of the program. */
  slots?: Record<string, string>
  /** Starting knob position for every potentiometer, 0…1. */
  knob?: number
  /** Pins shown on the signal scope. */
  scope: BoardPin[]
}

export interface MicroCircuit {
  parts: MicroPart[]
  wires: MicroWire[]
}

/** What the learner is doing with their hands right now. */
export interface MicroInputs {
  /** Knob position per potentiometer, 0 (leg 1 end) … 1 (leg 3 end). */
  knob: Record<string, number>
  /** Button held down? */
  pressed: Record<string, boolean>
}

/** Output pin levels set by the program: 0 = LOW, 1 = HIGH, in between = PWM duty cycle. */
export type PinOutputs = Partial<Record<BoardPin, number>>

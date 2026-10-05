// Core data model for the circuit simulator.
// Everything here is plain data so circuits can be saved, loaded from lesson
// content, and diffed without touching any UI code.

export type PartKind = 'battery' | 'resistor' | 'led' | 'switch' | 'button'

export type LedColor = 'red' | 'yellow' | 'green' | 'blue' | 'white'

export type Rotation = 0 | 90 | 180 | 270

export interface PartProps {
  /** battery */
  voltage?: number
  /** resistor */
  ohms?: number
  /** led */
  color?: LedColor
  burnt?: boolean
  /** Current (A) that was flowing at the moment the LED burnt out. */
  burntAt?: number
  /** switch / button */
  closed?: boolean
}

export interface Part {
  id: string
  kind: PartKind
  x: number
  y: number
  rot: Rotation
  props: PartProps
  /** Parts placed by an experiment that the learner may not delete. */
  locked?: boolean
}

/** "partId:terminalName" */
export type TerminalRef = string

export interface Wire {
  id: string
  from: TerminalRef
  to: TerminalRef
}

export interface Circuit {
  parts: Part[]
  wires: Wire[]
}

export type LedState = 'off' | 'on' | 'burnt'

export interface PartResult {
  /** Current through the part, flowing from terminal[0] to terminal[1] (amps). */
  current: number
  /** Voltage of terminal[0] minus terminal[1] (volts). */
  voltage: number
  /** Power turned into heat/light in the part (watts). */
  power: number
  /** 0..1 how bright an LED looks */
  brightness?: number
  ledState?: LedState
  /** LED would be destroyed by this current */
  overload?: boolean
}

export interface SimResult {
  /** Voltage at each terminal relative to the first battery's negative terminal. */
  terminalVoltage: Record<TerminalRef, number>
  parts: Record<string, PartResult>
  /** Current along each wire, flowing from `from` to `to` (amps). */
  wires: Record<string, number>
  /** Terminals with no wire attached. */
  dangling: TerminalRef[]
}

import { solveBoard } from './engine'
import type { Frame } from './runtime'
import type { BoardPin, MicroCircuit, MicroInputs } from './types'

/**
 * Declarative goals for Microcontroller Lab experiments. Content says what the
 * learner should achieve; this module decides whether the bench shows it.
 */
export type MicroGoal =
  /** Turning the knob takes this pin all the way from 0 V to 5 V. */
  | { type: 'potControls'; pin: BoardPin }
  /** analogRead(pin) has been seen below `below` and above `above` (while wired up). */
  | { type: 'analogSwept'; pin: BoardPin; below: number; above: number }
  /** analogRead(pin) is in range right now. */
  | { type: 'analogRange'; pin: BoardPin; min: number; max: number }
  /** digitalRead(pin) has given both 0 and 1 while the knob drives it. */
  | { type: 'digitalBoth'; pin: BoardPin }
  /** What the LED did while the button was pressed / released (input not floating). */
  | { type: 'buttonLed'; pressed?: 'on' | 'off'; released?: 'on' | 'off' }
  /** LED brightness, as a fraction of fully on, is in range right now. */
  | { type: 'ledLevel'; min: number; max: number }
  /** LED has been seen nearly off and nearly fully on. */
  | { type: 'ledSwept'; below: number; above: number }
  | { type: 'acknowledge' }

export interface MicroHistory {
  analogMin: Partial<Record<BoardPin, number>>
  analogMax: Partial<Record<BoardPin, number>>
  digitalSeen: Partial<Record<BoardPin, [boolean, boolean]>>
  buttonLed: { pressedOn: boolean; pressedOff: boolean; releasedOn: boolean; releasedOff: boolean }
  ledMin: number
  ledMax: number
}

export const emptyButtonLed = () => ({ pressedOn: false, pressedOff: false, releasedOn: false, releasedOff: false })

export const emptyMicroHistory = (): MicroHistory => ({
  analogMin: {},
  analogMax: {},
  digitalSeen: {},
  buttonLed: emptyButtonLed(),
  ledMin: 1,
  ledMax: 0,
})

/** An LED counts as on/off when it's clearly one or the other. */
const LED_ON = 0.5
const LED_OFF = 0.05

function firstLedLevel(circuit: MicroCircuit, frame: Frame): number | null {
  const led = circuit.parts.find((p) => p.kind === 'led')
  return led ? (frame.sol.leds[led.id]?.level ?? 0) : null
}

/** Is something actually driving the LED (rather than it hanging off a floating pin)? */
function ledDriven(circuit: MicroCircuit, frame: Frame): boolean {
  const led = circuit.parts.find((p) => p.kind === 'led')
  if (!led) return false
  const { netOf, floating } = frame.sol
  return !floating[netOf[`${led.id}:anode`]] && !floating[netOf[`${led.id}:cathode`]]
}

/** Does sweeping a potentiometer's knob take `pin` from one end of 0–5 V to the other? */
export function potControls(circuit: MicroCircuit, inputs: MicroInputs, frame: Frame, pin: BoardPin): boolean {
  if (!frame.sol.powered) return false
  return circuit.parts
    .filter((p) => p.kind === 'pot')
    .some((pot) => {
      const at = (pos: number) => solveBoard(circuit, { ...inputs, knob: { ...inputs.knob, [pot.id]: pos } }, frame.outputs)
      const lo = at(0)
      const hi = at(1)
      if (!lo.powered || !hi.powered || lo.pinFloating[pin] || hi.pinFloating[pin]) return false
      return Math.abs(hi.pinVolts[pin] - lo.pinVolts[pin]) > 4
    })
}

export function updateMicroHistory(h: MicroHistory, circuit: MicroCircuit, inputs: MicroInputs, frame: Frame): MicroHistory {
  if (!frame.running) return h
  const next: MicroHistory = { ...h }
  for (const [pin, value] of Object.entries(frame.reads) as [BoardPin, number][]) {
    // Readings from a floating pin are just noise, so they never count.
    if (frame.sol.pinFloating[pin]) continue
    if (pin.startsWith('A')) {
      next.analogMin = { ...next.analogMin, [pin]: Math.min(next.analogMin[pin] ?? Infinity, value) }
      next.analogMax = { ...next.analogMax, [pin]: Math.max(next.analogMax[pin] ?? -Infinity, value) }
    }
    const seen = next.digitalSeen[pin] ?? [false, false]
    const v = frame.sol.pinVolts[pin]
    // Only count clear digital levels (not the analog pin's in-between values).
    if (!pin.startsWith('A') && !seen[value]) {
      const clear = value === 0 ? v <= 1.5 : v >= 3.0
      if (clear) next.digitalSeen = { ...next.digitalSeen, [pin]: (value === 0 ? [true, seen[1]] : [seen[0], true]) as [boolean, boolean] }
    }
  }

  const level = firstLedLevel(circuit, frame)
  if (level !== null && ledDriven(circuit, frame)) {
    next.ledMin = Math.min(h.ledMin, level)
    next.ledMax = Math.max(h.ledMax, level)
    const buttons = circuit.parts.filter((p) => p.kind === 'button')
    const stable = Object.keys(frame.reads).length > 0 && Object.keys(frame.reads).every((pin) => !frame.sol.pinFloating[pin as BoardPin])
    if (buttons.length && stable) {
      const pressed = buttons.some((b) => inputs.pressed[b.id])
      const on = level > LED_ON
      const off = level < LED_OFF
      const b = { ...h.buttonLed }
      if (pressed && on) b.pressedOn = true
      if (pressed && off) b.pressedOff = true
      if (!pressed && on) b.releasedOn = true
      if (!pressed && off) b.releasedOff = true
      next.buttonLed = b
    }
  }
  return next
}

export function microGoalMet(goal: MicroGoal, circuit: MicroCircuit, inputs: MicroInputs, frame: Frame, h: MicroHistory): boolean {
  switch (goal.type) {
    case 'potControls':
      return potControls(circuit, inputs, frame, goal.pin)
    case 'analogSwept':
      return (h.analogMin[goal.pin] ?? Infinity) <= goal.below && (h.analogMax[goal.pin] ?? -Infinity) >= goal.above
    case 'analogRange': {
      const v = frame.reads[goal.pin]
      return frame.running && v !== undefined && !frame.sol.pinFloating[goal.pin] && v >= goal.min && v <= goal.max
    }
    case 'digitalBoth': {
      const seen = h.digitalSeen[goal.pin]
      return !!seen && seen[0] && seen[1] && potControls(circuit, inputs, frame, goal.pin)
    }
    case 'buttonLed': {
      const b = h.buttonLed
      const okPressed = goal.pressed === undefined || (goal.pressed === 'on' ? b.pressedOn : b.pressedOff)
      const okReleased = goal.released === undefined || (goal.released === 'on' ? b.releasedOn : b.releasedOff)
      return okPressed && okReleased
    }
    case 'ledLevel': {
      const level = firstLedLevel(circuit, frame)
      return frame.running && level !== null && level >= goal.min && level <= goal.max
    }
    case 'ledSwept':
      return h.ledMin <= goal.below && h.ledMax >= goal.above
    case 'acknowledge':
      return false
  }
}

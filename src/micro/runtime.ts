import { BOARD } from './board'
import { solveBoard, type BoardSolution } from './engine'
import { PROGRAMS } from './programs'
import type { BoardPin, MicroCircuit, MicroInputs, PinOutputs, ProgramId } from './types'

/**
 * What carries over from one pass to the next: last readings (so floating pins
 * drift rather than jump), how fast each motor is really turning, and pulses
 * counted on interrupt pins since the board last reset.
 */
export interface PinMemory {
  analog: Partial<Record<BoardPin, number>>
  digital: Partial<Record<BoardPin, 0 | 1>>
  spin: Record<string, number>
  /** Pulses counted per pin, including the fraction of the next one. */
  ticks: Partial<Record<BoardPin, number>>
}

export const emptyMemory = (): PinMemory => ({ analog: {}, digital: {}, spin: {}, ticks: {} })

/** Only these pins can trigger an interrupt on an Uno-style board (we expose D2). */
const INTERRUPT_PINS: BoardPin[] = ['D2']

/** One pass through loop(): read the pins, run the code, drive the outputs. */
export interface Frame {
  sol: BoardSolution
  /** Values the program got back from analogRead / digitalRead this pass. */
  reads: Partial<Record<BoardPin, number>>
  outputs: PinOutputs
  serial?: string
  active: string[]
  /** False while uploading, or when the board has no power. */
  running: boolean
  values?: Record<string, number>
  /** How fast each motor is actually turning, −1…1. */
  spin: Record<string, number>
  /** Whole pulses counted on each interrupt pin. */
  ticks: Partial<Record<BoardPin, number>>
}

/** Let each motor's shaft catch up with its voltage, then count encoder pulses. */
function advanceMechanics(circuit: MicroCircuit, sol: BoardSolution, mem: PinMemory, dt: number, counting: boolean) {
  const ease = 1 - Math.exp(-dt / BOARD.motorLag)
  for (const m of circuit.parts.filter((p) => p.kind === 'motor')) {
    const now = mem.spin[m.id] ?? 0
    const next = now + ((sol.motors[m.id]?.target ?? 0) - now) * ease
    mem.spin[m.id] = Math.abs(next) < 1e-3 ? 0 : next
  }
  if (!counting) return
  // Each encoder watches the first motor on the bench (it's mounted on its wheel).
  const motor = circuit.parts.find((p) => p.kind === 'motor')
  const spin = motor ? Math.abs(mem.spin[motor.id] ?? 0) : 0
  for (const enc of Object.values(sol.encoders)) {
    for (const pin of enc.pins.filter((p) => INTERRUPT_PINS.includes(p))) {
      mem.ticks[pin] = (mem.ticks[pin] ?? 0) + spin * BOARD.motorRevsPerSec * BOARD.encoderSlots * dt
    }
  }
}

const wholeTicks = (mem: PinMemory) =>
  Object.fromEntries(Object.entries(mem.ticks).map(([pin, t]) => [pin, Math.floor(t ?? 0)])) as Partial<Record<BoardPin, number>>

/** analogRead(): 0 V → 0, 5 V → 1023. A floating pin wanders randomly. */
export function readAnalog(sol: BoardSolution, pin: BoardPin, mem: PinMemory, rng: () => number): number {
  let value: number
  if (sol.pinFloating[pin]) {
    const prev = mem.analog[pin] ?? 300 + rng() * 400
    // Drift, but get pulled back towards the middle like real pickup noise.
    value = prev + (rng() - 0.5) * 140 + (512 - prev) * 0.05
  } else {
    value = (sol.pinVolts[pin] / BOARD.volts) * BOARD.adcMax
  }
  const out = Math.round(Math.max(0, Math.min(BOARD.adcMax, value)))
  mem.analog[pin] = out
  return out
}

/** digitalRead(): clearly low → 0, clearly high → 1, anything else is unreliable. */
export function readDigital(sol: BoardSolution, pin: BoardPin, mem: PinMemory, rng: () => number): 0 | 1 {
  const prev = mem.digital[pin] ?? 0
  let value: 0 | 1
  const v = sol.pinVolts[pin]
  if (sol.pinFloating[pin]) value = rng() < 0.12 ? ((1 - prev) as 0 | 1) : prev
  else if (v <= BOARD.lowMax) value = 0
  else if (v >= BOARD.highMin) value = 1
  else value = rng() < 0.3 ? ((1 - prev) as 0 | 1) : prev
  mem.digital[pin] = value
  return value
}

export function runFrame(
  circuit: MicroCircuit,
  inputs: MicroInputs,
  program: ProgramId,
  slots: Record<string, string>,
  prevOutputs: PinOutputs,
  mem: PinMemory,
  rng: () => number,
  uploading = false,
  dt = 0.06,
): Frame {
  const withSpin = { ...inputs, spin: mem.spin }
  const finish = (sol: BoardSolution, rest: Omit<Frame, 'sol' | 'spin' | 'ticks'>): Frame => {
    advanceMechanics(circuit, sol, mem, dt, rest.running)
    return { sol, ...rest, spin: { ...mem.spin }, ticks: wholeTicks(mem) }
  }
  // What the pins see right now, with the outputs from the last pass.
  const before = solveBoard(circuit, withSpin, prevOutputs)
  if (uploading || !before.powered) {
    // A reset (or losing power) wipes the program's memory, including any counts.
    mem.ticks = {}
    return finish(solveBoard(circuit, withSpin, {}), { reads: {}, outputs: {}, active: [], running: false })
  }
  const reads: Partial<Record<BoardPin, number>> = {}
  const res = PROGRAMS[program].run(
    {
      analogRead: (pin) => (reads[pin] = readAnalog(before, pin, mem, rng)),
      digitalRead: (pin) => (reads[pin] = readDigital(before, pin, mem, rng)),
      ticks: (pin) => Math.floor(mem.ticks[pin] ?? 0),
    },
    slots,
  )
  const sol = solveBoard(circuit, withSpin, res.outputs)
  // The new outputs might short the board (e.g. a pin wired to GND is fine, 5V to GND isn't).
  if (!sol.powered) {
    mem.ticks = {}
    return finish(sol, { reads: {}, outputs: {}, active: [], running: false })
  }
  return finish(sol, { reads, outputs: res.outputs, serial: res.serial, active: res.active, values: res.values, running: true })
}

import { BOARD } from './board'
import { solveBoard, type BoardSolution } from './engine'
import { PROGRAMS } from './programs'
import type { BoardPin, MicroCircuit, MicroInputs, PinOutputs, ProgramId } from './types'

/** What the pins read last time, so floating pins can drift rather than jump. */
export interface PinMemory {
  analog: Partial<Record<BoardPin, number>>
  digital: Partial<Record<BoardPin, 0 | 1>>
}

export const emptyMemory = (): PinMemory => ({ analog: {}, digital: {} })

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
}

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
): Frame {
  // What the pins see right now, with the outputs from the last pass.
  const before = solveBoard(circuit, inputs, prevOutputs)
  if (uploading || !before.powered) {
    return { sol: solveBoard(circuit, inputs, {}), reads: {}, outputs: {}, active: [], running: false }
  }
  const reads: Partial<Record<BoardPin, number>> = {}
  const res = PROGRAMS[program].run(
    {
      analogRead: (pin) => (reads[pin] = readAnalog(before, pin, mem, rng)),
      digitalRead: (pin) => (reads[pin] = readDigital(before, pin, mem, rng)),
    },
    slots,
  )
  const sol = solveBoard(circuit, inputs, res.outputs)
  // The new outputs might short the board (e.g. a pin wired to GND is fine, 5V to GND isn't).
  if (!sol.powered) return { sol, reads: {}, outputs: {}, active: [], running: false }
  return { sol, reads, outputs: res.outputs, serial: res.serial, active: res.active, running: true }
}

import { describe, expect, it } from 'vitest'
import { EXPERIMENT_BY_ID } from '../content'
import type { MicroExperiment } from '../content/types'
import { solveBoard } from './engine'
import { emptyMicroHistory, microGoalMet, updateMicroHistory, type MicroGoal, type MicroHistory } from './goals'
import { defaultSlots } from './programs'
import { emptyMemory, runFrame, type Frame } from './runtime'
import type { MicroCircuit, MicroInputs, MicroWire } from './types'

const exp = (id: string) => EXPERIMENT_BY_ID[id] as MicroExperiment
const rng = () => 0.5

/** Run the board for a series of hand positions, collecting history like the experiment page does. */
function play(e: MicroExperiment, circuit: MicroCircuit, moves: Partial<MicroInputs>[], slots = defaultSlots(e.setup.program, e.setup.slots)) {
  const mem = emptyMemory()
  let outputs = {}
  let h: MicroHistory = emptyMicroHistory()
  let frame: Frame | null = null
  let inputs: MicroInputs = { knob: { pot: e.setup.knob ?? 0.5 }, pressed: {} }
  for (const m of moves) {
    inputs = { knob: { ...inputs.knob, ...m.knob }, pressed: { ...inputs.pressed, ...m.pressed } }
    // Run a few passes so outputs settle (each pass reads what the last one wrote).
    for (let i = 0; i < 3; i++) {
      frame = runFrame(circuit, inputs, e.setup.program, slots, outputs, mem, rng)
      outputs = frame.outputs
      h = updateMicroHistory(h, circuit, inputs, frame)
    }
  }
  return { frame: frame!, h, inputs, met: (goal: MicroGoal) => microGoalMet(goal, circuit, inputs, frame!, h) }
}

const withWires = (e: MicroExperiment, wires: MicroWire[], extraParts: MicroCircuit['parts'] = []): MicroCircuit => ({
  parts: [...e.setup.parts, ...extraParts],
  wires: [...e.setup.wires, ...wires],
})

const potWiring = (pin: string): MicroWire[] => [
  { id: 'g', from: 'board:GND', to: 'pot:a' },
  { id: 'w', from: `board:${pin}`, to: 'pot:w' },
  { id: 'v', from: 'board:5V', to: 'pot:b' },
]

describe('board engine', () => {
  it('an unconnected input pin is floating, and a wired one is not', () => {
    const e = exp('read-pot')
    const bare = solveBoard(e.setup, { knob: { pot: 0.5 }, pressed: {} }, {})
    expect(bare.pinFloating.A0).toBe(true)
    const wired = solveBoard(withWires(e, potWiring('A0')), { knob: { pot: 0.5 }, pressed: {} }, {})
    expect(wired.pinFloating.A0).toBe(false)
    expect(wired.pinVolts.A0).toBeCloseTo(2.5, 2)
  })

  it('5V wired straight to GND cuts the power', () => {
    const e = exp('read-pot')
    const sol = solveBoard(withWires(e, [{ id: 's', from: 'board:5V', to: 'board:GND2' }]), { knob: {}, pressed: {} }, {})
    expect(sol.powered).toBe(false)
  })

  it('an LED module on a HIGH pin draws a safe current', () => {
    const e = exp('button-code')
    const sol = solveBoard(e.setup, { knob: {}, pressed: {} }, { D13: 1 })
    expect(sol.leds.led.current * 1000).toBeGreaterThan(8)
    expect(sol.leds.led.current * 1000).toBeLessThan(20)
    expect(sol.leds.led.level).toBeCloseTo(1, 2)
  })

  it('an output pin wired straight to GND is overloaded', () => {
    const e = exp('button-code')
    const sol = solveBoard(withWires(e, [{ id: 'x', from: 'board:D13', to: 'board:GND' }]), { knob: {}, pressed: {} }, { D13: 1 })
    expect(sol.pinCurrent.D13!).toBeGreaterThan(0.04)
  })
})

describe('Experiment 04: read a potentiometer', () => {
  const e = exp('read-pot')

  it('only correct wiring lets the knob control A0', () => {
    expect(play(e, e.setup, [{}]).met(e.steps[0].goal)).toBe(false)
    // Wiper and one end only: the knob can't sweep the full range.
    const half = withWires(e, potWiring('A0').slice(0, 2))
    expect(play(e, half, [{}]).met(e.steps[0].goal)).toBe(false)
    expect(play(e, withWires(e, potWiring('A0')), [{}]).met(e.steps[0].goal)).toBe(true)
  })

  it('sweeping the knob reaches both ends, and 3.0 V is reachable', () => {
    const c = withWires(e, potWiring('A0'))
    expect(play(e, c, [{ knob: { pot: 0 } }, { knob: { pot: 1 } }]).met(e.steps[1].goal)).toBe(true)
    expect(play(e, c, [{ knob: { pot: 0.6 } }]).met(e.steps[2].goal)).toBe(true)
    expect(play(e, c, [{ knob: { pot: 0.5 } }]).met(e.steps[2].goal)).toBe(false)
  })

  it('noise on a floating A0 never counts as a sweep', () => {
    const r = play(e, e.setup, Array.from({ length: 40 }, () => ({})))
    expect(r.h.analogMin.A0).toBeUndefined()
  })

  it('moving the wiper to D2 gives both 0 and 1', () => {
    const c = withWires(e, potWiring('D2'))
    expect(play(e, c, [{ knob: { pot: 0 } }, { knob: { pot: 1 } }]).met(e.steps[3].goal)).toBe(true)
  })
})

describe('Experiment 05: button in, LED out', () => {
  const e = exp('button-code')
  const pulldown = { id: 'r1', kind: 'resistor' as const, x: 0, y: 0, props: { ohms: 10000 } }
  const fixed = withWires(e, [{ id: 'p1', from: 'r1:a', to: 'board:D2' }, { id: 'p2', from: 'r1:b', to: 'board:GND' }], [pulldown])

  it('pressing lights the LED, but without a pull-down release is never a clean LOW', () => {
    const r = play(e, e.setup, [{ pressed: { btn: true } }, { pressed: { btn: false } }])
    expect(r.met(e.steps[0].goal)).toBe(true)
    expect(r.met(e.steps[1].goal)).toBe(false)
  })

  it('a pull-down resistor makes it work properly', () => {
    expect(play(e, fixed, [{ pressed: { btn: true } }, { pressed: { btn: false } }]).met(e.steps[1].goal)).toBe(true)
  })

  it('changing HIGH to LOW in the code inverts the behaviour', () => {
    const r = play(e, fixed, [{ pressed: { btn: true } }, { pressed: { btn: false } }], { when: 'LOW' })
    expect(r.met(e.steps[2].goal)).toBe(true)
  })

  it('a plain wire instead of the resistor shorts the board when pressed', () => {
    const shorted = withWires(e, [{ id: 'p', from: 'board:D2', to: 'board:GND' }])
    expect(play(e, shorted, [{ pressed: { btn: true } }]).frame.sol.powered).toBe(false)
  })
})

describe('Experiment 06: knob-controlled dimmer', () => {
  const e = exp('knob-dimmer')

  it('starts dark because the code writes to the wrong pin', () => {
    expect(play(e, e.setup, [{}]).met(e.steps[0].goal)).toBe(false)
    expect(play(e, e.setup, [{}], { pin: '9' }).met(e.steps[0].goal)).toBe(true)
  })

  it('the knob sweeps the brightness and a quarter turn gives a quarter power', () => {
    expect(play(e, e.setup, [{ knob: { pot: 0 } }, { knob: { pot: 1 } }], { pin: '9' }).met(e.steps[1].goal)).toBe(true)
    expect(play(e, e.setup, [{ knob: { pot: 0.25 } }], { pin: '9' }).met(e.steps[2].goal)).toBe(true)
  })
})

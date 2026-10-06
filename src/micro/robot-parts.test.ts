import { describe, expect, it } from 'vitest'
import { EXPERIMENT_BY_ID } from '../content'
import type { MicroExperiment } from '../content/types'
import { emptyMicroHistory, freshObservations, microGoalMet, updateMicroHistory, type MicroGoal, type MicroHistory } from './goals'
import { defaultSlots } from './programs'
import { emptyMemory, runFrame, type Frame } from './runtime'
import type { MicroCircuit, MicroInputs, MicroPart, MicroWire } from './types'

const exp = (id: string) => EXPERIMENT_BY_ID[id] as MicroExperiment
const rng = () => 0.5
const DT = 0.06

/** Run the bench for `seconds` with fixed hands-on inputs, like the experiment page does. */
function simulate(e: MicroExperiment, circuit: MicroCircuit, opts: { seconds?: number; slots?: Record<string, string>; inputs?: Partial<MicroInputs>; mem?: ReturnType<typeof emptyMemory>; h?: MicroHistory } = {}) {
  const mem = opts.mem ?? emptyMemory()
  const slots = opts.slots ?? defaultSlots(e.setup.program, e.setup.slots)
  const inputs: MicroInputs = { knob: { pot: e.setup.knob ?? 0.5 }, pressed: {}, temp: { tmp: 21 }, ...opts.inputs }
  let h = opts.h ?? emptyMicroHistory()
  let frame: Frame | null = null
  let outputs = {}
  const steps = Math.max(1, Math.round((opts.seconds ?? 0.3) / DT))
  for (let i = 0; i < steps; i++) {
    frame = runFrame(circuit, inputs, e.setup.program, slots, outputs, mem, rng, false, DT)
    outputs = frame.outputs
    h = updateMicroHistory(h, circuit, inputs, frame)
  }
  return { frame: frame!, h, mem, met: (goal: MicroGoal) => microGoalMet(goal, circuit, inputs, frame!, h) }
}

const add = (e: MicroExperiment, wires: MicroWire[], parts: MicroPart[] = [], drop: string[] = []): MicroCircuit => ({
  parts: [...e.setup.parts, ...parts],
  wires: [...e.setup.wires.filter((w) => !drop.includes(w.id)), ...wires],
})

describe('Experiment 07: temperature sensor', () => {
  const e = exp('read-temp')
  const wired = add(e, [
    { id: 'a', from: 'board:5V', to: 'tmp:vs' },
    { id: 'b', from: 'board:A0', to: 'tmp:out' },
    { id: 'c', from: 'board:GND', to: 'tmp:gnd' },
  ])

  it('reads about 0.71 V at room temperature once wired the right way round', () => {
    const r = simulate(e, wired)
    expect(r.met(e.steps[0].goal)).toBe(true)
    expect(r.frame.sol.pinVolts.A0).toBeCloseTo(0.71, 2)
  })

  it('wired backwards, it gets hot and reads nothing useful', () => {
    const backwards = add(e, [
      { id: 'a', from: 'board:GND', to: 'tmp:vs' },
      { id: 'b', from: 'board:A0', to: 'tmp:out' },
      { id: 'c', from: 'board:5V', to: 'tmp:gnd' },
    ])
    const r = simulate(e, backwards)
    expect(r.frame.sol.tmps.tmp.reversed).toBe(true)
    expect(r.met(e.steps[0].goal)).toBe(false)
  })

  it('warming it moves the reading, and only the right formula gives the right temperature', () => {
    const cold = simulate(e, wired)
    const warm = simulate(e, wired, { inputs: { temp: { tmp: 33 } }, h: cold.h })
    expect(warm.met(e.steps[1].goal)).toBe(true)
    expect(warm.met(e.steps[2].goal)).toBe(false)
    expect(simulate(e, wired, { slots: { ...defaultSlots('temp'), offset: '0.5' } }).met(e.steps[2].goal)).toBe(true)
  })

  it('the warning light turns on when warm and off when cool', () => {
    const slots = { ...defaultSlots('temp'), offset: '0.5' }
    const hot = simulate(e, wired, { slots, inputs: { temp: { tmp: 33 } } })
    const cool = simulate(e, wired, { slots, h: hot.h })
    expect(cool.met(e.steps[3].goal)).toBe(true)
  })
})

describe('Experiment 08: servo', () => {
  const e = exp('servo')
  const wired = add(e, [
    { id: 'a', from: 'board:GND', to: 'servo:gnd' },
    { id: 'b', from: 'board:5V', to: 'servo:pwr' },
    { id: 'c', from: 'board:D9', to: 'servo:sig' },
  ])

  it('waits until it has power and a signal', () => {
    expect(simulate(e, e.setup).met(e.steps[0].goal)).toBe(false)
    const r = simulate(e, wired)
    expect(r.met(e.steps[0].goal)).toBe(true)
    expect(Math.abs(r.frame.sol.servos.servo.angle! - 90)).toBeLessThan(2)
  })

  it('the knob sweeps it end to end, and map() can limit it to 90°', () => {
    const a = simulate(e, wired, { inputs: { knob: { pot: 0 } } })
    expect(simulate(e, wired, { inputs: { knob: { pot: 1 } }, h: a.h }).met(e.steps[1].goal)).toBe(true)
    const limited = simulate(e, wired, { slots: { top: '90' }, inputs: { knob: { pot: 1 } } })
    expect(limited.met(e.steps[2].goal)).toBe(true)
    expect(simulate(e, wired, { inputs: { knob: { pot: 1 } } }).met(e.steps[2].goal)).toBe(false)
  })
})

describe('Experiment 09: DC motor', () => {
  const e = exp('dc-motor')
  const parts: MicroPart[] = [
    { id: 'drv', kind: 'driver', x: 0, y: 0, props: {} },
    { id: 'bat', kind: 'battery', x: 0, y: 0, props: { voltage: 6 } },
  ]
  const driverWires: MicroWire[] = [
    { id: 'a', from: 'board:D9', to: 'drv:en' },
    { id: 'b', from: 'board:D13', to: 'drv:dir' },
    { id: 'c', from: 'bat:pos', to: 'drv:vm' },
    { id: 'd', from: 'bat:neg', to: 'board:GND' },
    { id: 'e', from: 'drv:oa', to: 'motor:a' },
    { id: 'f', from: 'drv:ob', to: 'motor:b' },
  ]
  const ground: MicroWire = { id: 'g', from: 'drv:gnd', to: 'board:GND2' }
  const withDriver = add(e, [...driverWires, ground], parts, ['w1', 'w2'])

  it('straight from a pin, the motor barely moves and the pin is overloaded', () => {
    const r = simulate(e, e.setup, { seconds: 2 })
    expect(Math.abs(r.frame.spin.motor)).toBeLessThan(0.1)
    expect(r.frame.sol.pinCurrent.D9!).toBeGreaterThan(0.04)
  })

  it('through a driver it runs at full speed, but only with a common ground', () => {
    expect(simulate(e, withDriver, { seconds: 2 }).met(e.steps[1].goal)).toBe(true)
    const noGround = add(e, driverWires, parts, ['w1', 'w2'])
    const r = simulate(e, noGround, { seconds: 2 })
    expect(r.frame.sol.drivers.drv.grounded).toBe(false)
    expect(r.met(e.steps[1].goal)).toBe(false)
  })

  it('DIR reverses it and half the PWM gives a bit under half speed', () => {
    expect(simulate(e, withDriver, { seconds: 2, slots: { dir: 'HIGH', speed: '255' } }).met(e.steps[2].goal)).toBe(true)
    const half = simulate(e, withDriver, { seconds: 2, slots: { dir: 'HIGH', speed: '128' } })
    expect(half.met(e.steps[3].goal)).toBe(true)
  })
})

describe('Experiment 10: encoder', () => {
  const e = exp('encoder')
  const wired = add(e, [
    { id: 'a', from: 'board:5V', to: 'enc:vcc' },
    { id: 'b', from: 'board:GND', to: 'enc:gnd' },
    { id: 'c', from: 'board:D2', to: 'enc:out' },
  ])

  it('counts nothing until wired, then counts pulses as the wheel turns', () => {
    expect(simulate(e, e.setup, { seconds: 2 }).frame.ticks.D2 ?? 0).toBe(0)
    expect(simulate(e, wired, { seconds: 2 }).met(e.steps[0].goal)).toBe(true)
  })

  const stopAt = (speed: string) => {
    const r = simulate(e, wired, { seconds: 8, slots: { target: '50', speed } })
    return { ticks: r.frame.ticks.D2 ?? 0, r }
  }

  it('full speed overshoots 50, and slowing down near the end stops on the spot', () => {
    const fast = stopAt('200')
    expect(fast.r.met(e.steps[1].goal)).toBe(true)
    expect(fast.r.met(e.steps[2].goal)).toBe(false)
    const smart = stopAt('max(60, 4 * (TARGET - ticks))')
    expect(smart.r.met(e.steps[2].goal), `stopped at ${smart.ticks}`).toBe(true)
    // Simply going slower helps, but not enough on its own.
    const slow = stopAt('90')
    expect(slow.ticks).toBeLessThan(fast.ticks)
    expect(slow.r.met(e.steps[2].goal)).toBe(false)
  })

  it('fresh observations forget old servo and LED history', () => {
    const h = { ...emptyMicroHistory(), servoMax: 170, ledMax: 1 }
    expect(freshObservations(h).servoMax).toBe(0)
  })
})

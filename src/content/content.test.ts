import { describe, expect, it } from 'vitest'
import { emptyHistory, goalMet, updateHistory } from '../sim/goals'
import { RESISTOR_OPTIONS } from '../sim/parts'
import { simulate } from '../sim/solve'
import type { Circuit } from '../sim/types'
import { CATALOG, EXPERIMENT_BY_ID, EXPERIMENTS, LESSON_BY_ID, LEVELS } from './index'
import type { CircuitExperiment } from './types'

const circuitExp = (id: string) => EXPERIMENT_BY_ID[id] as CircuitExperiment

const withOhms = (c: Circuit, id: string, ohms: number): Circuit => ({
  ...c,
  parts: c.parts.map((p) => (p.id === id ? { ...p, props: { ...p.props, ohms } } : p)),
})

describe('content integrity', () => {
  it('every level item points at real content', () => {
    for (const level of LEVELS) {
      for (const item of level.items) {
        if (item.type === 'lesson') expect(LESSON_BY_ID[item.id], item.id).toBeDefined()
        if (item.type === 'experiment') expect(EXPERIMENT_BY_ID[item.id], item.id).toBeDefined()
        if (item.type === 'collect') for (const c of item.componentIds) expect(CATALOG.some((x) => x.id === c), c).toBe(true)
      }
    }
  })

  it('ready experiments have steps and every step has a goal', () => {
    for (const e of EXPERIMENTS.filter((x) => x.status === 'ready')) {
      expect(e.steps.length).toBeGreaterThan(0)
      for (const s of e.steps) expect(s.goal).toBeDefined()
    }
  })

  it('every ready level has playable items, and lessons sit in their own level', () => {
    for (const level of LEVELS.filter((l) => l.status === 'ready')) {
      expect(level.items.length, `level ${level.n}`).toBeGreaterThan(0)
      for (const item of level.items) {
        if (item.type === 'lesson') expect(LESSON_BY_ID[item.id].levelN).toBe(level.n)
        if (item.type === 'experiment') {
          expect(EXPERIMENT_BY_ID[item.id].levelN).toBe(level.n)
          expect(EXPERIMENT_BY_ID[item.id].status).toBe('ready')
        }
      }
    }
  })

  it('experiment numbers are unique and in order', () => {
    expect(EXPERIMENTS.map((e) => e.number)).toEqual(EXPERIMENTS.map((_, i) => i + 1))
  })

  it('levels are ready in order, with no gaps', () => {
    const firstPlanned = LEVELS.findIndex((l) => l.status === 'planned')
    expect(LEVELS.slice(firstPlanned).every((l) => l.status === 'planned')).toBe(true)
    expect(firstPlanned).toBe(5)
  })
})

describe('experiments are solvable', () => {
  it('Experiment 02: exactly one stocked resistor hits each target', () => {
    const exp = circuitExp('change-the-resistor')
    const solvers = (min: number, max: number) =>
      RESISTOR_OPTIONS.filter((ohms) => {
        const c = withOhms(exp.setup, 'r1', ohms)
        return goalMet({ type: 'ledCurrent', minmA: min, maxmA: max }, c, simulate(c), emptyHistory())
      })
    expect(solvers(8, 12)).toEqual([680])
    expect(solvers(15, 25)).toEqual([330])
  })

  it('Experiment 02: trying three values counts only while the LED is lit', () => {
    const exp = circuitExp('change-the-resistor')
    let h = emptyHistory()
    for (const ohms of [4700, 1000, 470]) {
      const c = withOhms(exp.setup, 'r1', ohms)
      h = updateHistory(h, c, simulate(c))
    }
    expect(goalMet({ type: 'resistorsTried', count: 3 }, exp.setup, simulate(exp.setup), h)).toBe(true)
  })

  it('Experiment 01: the straight-up LED overloads, and 470 Ω makes it safe', () => {
    const exp = circuitExp('light-an-led')
    const direct: Circuit = {
      ...exp.setup,
      wires: [
        { id: 'a', from: 'bat:pos', to: 'led:anode' },
        { id: 'b', from: 'led:cathode', to: 'bat:neg' },
      ],
    }
    expect(simulate(direct).parts.led.overload).toBe(true)

    const fixed: Circuit = {
      parts: [...exp.setup.parts, { id: 'r9', kind: 'resistor', x: 0, y: 0, rot: 0, props: { ohms: 470 } }],
      wires: [
        { id: 'a', from: 'bat:pos', to: 'r9:a' },
        { id: 'c', from: 'r9:b', to: 'led:anode' },
        { id: 'b', from: 'led:cathode', to: 'bat:neg' },
      ],
    }
    expect(goalMet(exp.steps[1].goal, fixed, simulate(fixed), emptyHistory())).toBe(true)
  })

  it('Experiment 03: wiring the button in completes the goal', () => {
    const exp = circuitExp('button-led')
    const wired = (closed: boolean): Circuit => ({
      parts: exp.setup.parts.map((p) => (p.id === 'btn' ? { ...p, props: { closed } } : p)),
      wires: [...exp.setup.wires, { id: 'x', from: 'led:cathode', to: 'btn:a' }, { id: 'y', from: 'btn:b', to: 'bat:neg' }],
    })
    let h = emptyHistory()
    for (const closed of [false, true]) {
      const c = wired(closed)
      h = updateHistory(h, c, simulate(c))
    }
    const c = wired(true)
    expect(goalMet(exp.steps[0].goal, c, simulate(c), h)).toBe(true)
  })
})

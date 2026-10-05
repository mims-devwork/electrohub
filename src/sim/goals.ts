import type { Circuit, SimResult } from './types'

/**
 * Declarative experiment goals. Experiments (content) describe *what* the
 * learner should achieve; this module decides *whether* they achieved it.
 */
export type Goal =
  | { type: 'ledBurnt' }
  | { type: 'ledCurrent'; minmA: number; maxmA: number; requireResistor?: boolean }
  | { type: 'resistorsTried'; count: number }
  | { type: 'switchControlsLed' }
  | { type: 'acknowledge' }

export interface GoalHistory {
  /** Resistor values (Ω) that carried current while an LED was lit. */
  resistorsWhileLit: number[]
  /** LED seen lit with every switch closed. */
  litWithSwitchClosed: boolean
  /** LED seen dark because a switch in the loop was open. */
  darkWithSwitchOpen: boolean
  /** Highest LED current seen, in amps (for before/after comparisons). */
  peakLedCurrent: number
  /** Current through a healthy LED the last time we looked. */
  lastLedCurrent: number
}

export const emptyHistory = (): GoalHistory => ({
  resistorsWhileLit: [],
  litWithSwitchClosed: false,
  darkWithSwitchOpen: false,
  peakLedCurrent: 0,
  lastLedCurrent: 0,
})

/** Anything above half a milliamp makes a visible glow. */
const LIT = 0.0005

export function updateHistory(h: GoalHistory, circuit: Circuit, sim: SimResult): GoalHistory {
  const leds = circuit.parts.filter((p) => p.kind === 'led')
  const healthy = leds.filter((l) => !l.props.burnt)
  const lit = healthy.some((l) => sim.parts[l.id]?.current > LIT)
  const switches = circuit.parts.filter((p) => p.kind === 'switch' || p.kind === 'button')

  const next: GoalHistory = { ...h }
  const ledCurrents = healthy.map((l) => sim.parts[l.id]?.current ?? 0)
  const maxNow = Math.max(0, ...ledCurrents, ...leds.map((l) => l.props.burntAt ?? 0))
  next.peakLedCurrent = Math.max(h.peakLedCurrent, maxNow)
  next.lastLedCurrent = Math.max(0, ...ledCurrents)

  if (lit) {
    const values = circuit.parts
      .filter((p) => p.kind === 'resistor' && Math.abs(sim.parts[p.id]?.current ?? 0) > LIT)
      .map((p) => p.props.ohms ?? 0)
    const set = new Set([...h.resistorsWhileLit, ...values])
    if (set.size !== h.resistorsWhileLit.length) next.resistorsWhileLit = [...set]
  }

  if (switches.length > 0 && healthy.length > 0) {
    if (lit && switches.every((s) => s.props.closed)) next.litWithSwitchClosed = true
    const openInLoop = switches.some((s) => !s.props.closed && Math.abs(sim.parts[s.id]?.voltage ?? 0) > 0.3)
    if (!lit && openInLoop) next.darkWithSwitchOpen = true
  }
  return next
}

export function goalMet(goal: Goal, circuit: Circuit, sim: SimResult, h: GoalHistory): boolean {
  switch (goal.type) {
    case 'ledBurnt':
      return circuit.parts.some((p) => p.kind === 'led' && p.props.burnt)
    case 'ledCurrent': {
      if (goal.requireResistor && !circuit.parts.some((p) => p.kind === 'resistor' && Math.abs(sim.parts[p.id]?.current ?? 0) > LIT))
        return false
      return circuit.parts.some((p) => {
        if (p.kind !== 'led' || p.props.burnt) return false
        const mA = (sim.parts[p.id]?.current ?? 0) * 1000
        return mA >= goal.minmA && mA <= goal.maxmA
      })
    }
    case 'resistorsTried':
      return h.resistorsWhileLit.length >= goal.count
    case 'switchControlsLed':
      return h.litWithSwitchClosed && h.darkWithSwitchOpen
    case 'acknowledge':
      return false
  }
}

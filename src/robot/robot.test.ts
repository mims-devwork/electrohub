import { describe, expect, it } from 'vitest'
import { EXPERIMENT_BY_ID } from '../content'
import type { RobotExperiment } from '../content/types'
import { robotGoalMet } from './goals'
import { defaultAvoidSlots, runAvoid, type AvoidSlots } from './program'
import { ARENAS, readSensor, startState, type ArenaId } from './sim'
import { tickRobot } from './useRobot'

const exp = EXPERIMENT_BY_ID['obstacle'] as RobotExperiment

/** Drive the robot for `seconds`; report the best clean distance and the total bumps. */
function drive(arena: ArenaId, slots: AvoidSlots, seconds: number) {
  let state = startState(ARENAS[arena])
  let best = 0
  for (let t = 0; t < seconds; t += 0.06) {
    state = tickRobot(arena, state, slots, true).state
    best = Math.max(best, state.odometer)
  }
  return { state, best, crashes: state.crashes }
}

describe('robot arena', () => {
  it('the sensor reports 0 when the nearest wall is out of range', () => {
    const hall = ARENAS.hall
    expect(readSensor(hall, startState(hall))).toBe(0)
    expect(readSensor(ARENAS.room, startState(ARENAS.room))).toBeGreaterThan(0)
  })

  it('the guard only matters for a reading of 0', () => {
    expect(runAvoid(0, defaultAvoidSlots({ cond: 'cm < 30' })).turning).toBe(true)
    expect(runAvoid(0, defaultAvoidSlots({ cond: 'cm > 0 && cm < 30' })).turning).toBe(false)
    expect(runAvoid(12, defaultAvoidSlots({ cond: 'cm > 0 && cm < 30' })).turning).toBe(true)
  })
})

describe('Experiment 11: obstacle detection', () => {
  it('the starting code crashes', () => {
    const r = drive('room', defaultAvoidSlots(), 20)
    expect(robotGoalMet(exp.steps[0].goal, r.state, 'room')).toBe(true)
  })

  it('turning earlier lets it drive 3 m cleanly in the room', () => {
    for (const cond of ['cm < 30', 'cm < 50']) {
      const r = drive('room', defaultAvoidSlots({ cond }), 60)
      expect(r.best, cond).toBeGreaterThanOrEqual(300)
    }
  })

  it('in the big hall, only ignoring zero readings gets it moving', () => {
    const naive = drive('hall', defaultAvoidSlots({ cond: 'cm < 30' }), 30)
    expect(naive.best).toBeLessThan(50)
    const fixed = drive('hall', defaultAvoidSlots({ cond: 'cm > 0 && cm < 30' }), 60)
    expect(fixed.best).toBeGreaterThanOrEqual(500)
  })
})

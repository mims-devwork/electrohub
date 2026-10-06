import { describe, expect, it } from 'vitest'
import { LESSONS } from '../content'
import { simulateApproach } from './ControlLoop'
import { WIDGETS } from './registry'

describe('lesson widgets', () => {
  it('every widget a lesson uses exists', () => {
    for (const l of LESSONS) for (const s of l.steps) if (s.kind === 'try') expect(WIDGETS[s.widget], `${l.id}: ${s.widget}`).toBeDefined()
  })

  it('control loop: stop-at-the-line overshoots, proportional control parks', () => {
    const onoff = simulateApproach('onoff', 0)
    expect(Math.abs(onoff.final - 20)).toBeGreaterThan(5)
    const parked = [1, 2, 4, 6].filter((g) => {
      const r = simulateApproach('p', g)
      return Math.abs(r.final - 20) <= 1 && Math.abs(r.speed) < 1 && !r.crashed
    })
    expect(parked.length).toBeGreaterThanOrEqual(3)
  })
})

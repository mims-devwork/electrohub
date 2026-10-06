import type { CodeToken } from '../micro/programs'
import { ROBOT } from './sim'

/** The obstacle-avoiding program. Like the board programs, it's shown as Arduino code but runs as TypeScript. */
export const AVOID = {
  name: 'avoid_walls.ino',
  slots: {
    cond: { label: 'When to turn', options: ['cm < 10', 'cm < 30', 'cm < 50', 'cm > 0 && cm < 30'], default: 'cm < 10' },
    speed: { label: 'Driving speed (0–255)', options: ['255', '150'], default: '255' },
  },
  lines: [
    { code: ['void loop() {'] },
    { code: ['  int cm = readDistance();        // ultrasonic sensor, in cm'], tag: 'read' },
    { code: ['  if (', { slot: 'cond' }, ') {'], tag: 'check' },
    { code: ['    turnLeft();                    // spin on the spot'], tag: 'turn' },
    { code: ['  } else {'], tag: 'else' },
    { code: ['    drive(', { slot: 'speed' }, ');                    // straight ahead'], tag: 'drive' },
    { code: ['  }'] },
    { code: ['}'] },
  ] as { code: CodeToken[]; tag?: string }[],
}

export type AvoidSlots = Record<keyof typeof AVOID.slots, string>

export const defaultAvoidSlots = (overrides: Partial<AvoidSlots> = {}): AvoidSlots => ({ cond: AVOID.slots.cond.default, speed: AVOID.slots.speed.default, ...overrides })

export interface AvoidRun {
  turning: boolean
  want: { left: number; right: number }
  active: string[]
}

/** One pass through loop(), given the distance reading. */
export function runAvoid(cm: number, slots: AvoidSlots): AvoidRun {
  const [, guard, limit] = slots.cond.match(/^(cm > 0 && )?cm < (\d+)$/) ?? []
  const close = (!guard || cm > 0) && cm < Number(limit)
  if (close) return { turning: true, want: { left: -ROBOT.turnSpeed, right: ROBOT.turnSpeed }, active: ['read', 'check', 'turn'] }
  const v = (Number(slots.speed) / 255) * ROBOT.topSpeed
  return { turning: false, want: { left: v, right: v }, active: ['read', 'check', 'else', 'drive'] }
}

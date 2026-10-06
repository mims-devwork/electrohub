import type { AvoidSlots } from './program'
import type { ArenaId } from './sim'

export interface RobotSetup {
  arena: ArenaId
  slots?: Partial<AvoidSlots>
}

/** Declarative goals for robot-arena experiments. */
export type RobotGoal =
  /** The robot has bumped into something (with the current code). */
  | { type: 'robotCrashed' }
  /** The robot has driven this far without crashing, in this arena. */
  | { type: 'robotDrove'; cm: number; arena: ArenaId }
  | { type: 'acknowledge' }

import type { ArenaId, RobotState } from './sim'
import type { RobotGoal } from './types'

export function robotGoalMet(goal: RobotGoal, state: RobotState, arena: ArenaId): boolean {
  switch (goal.type) {
    case 'robotCrashed':
      return state.crashes > 0
    case 'robotDrove':
      return arena === goal.arena && state.odometer >= goal.cm
    case 'acknowledge':
      return false
  }
}

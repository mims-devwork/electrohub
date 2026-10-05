// Learning content is plain data. UI components read these shapes; adding a new
// lesson, experiment, component or level means adding data, not new screens.

import type { MicroGoal } from '../micro/goals'
import type { MicroPartKind, MicroSetup } from '../micro/types'
import type { Goal } from '../sim/goals'
import type { Circuit, PartKind } from '../sim/types'

export type HubId = 'electricity' | 'components' | 'circuits' | 'microcontrollers' | 'robotics' | 'pcb' | 'projects'

export interface Hub {
  id: HubId
  name: string
  icon: string
  /** Accent colour used for the hub's station and UI. */
  color: string
  tagline: string
  /** Level number that unlocks this area of the lab. */
  unlockLevel: number
  topics: string[]
  /** Where this hub sits in the big-picture chain (Electricity → … → Robot). */
  chainLabel: string
  /** Is there playable content yet, or only a preview? */
  status: 'open' | 'preview'
}

export type LevelItem =
  | { type: 'lesson'; id: string }
  | { type: 'experiment'; id: string }
  | { type: 'collect'; id: string; title: string; componentIds: string[] }

export interface Level {
  n: number
  title: string
  tagline: string
  hubId: HubId
  /** The new ability the learner unlocks, phrased as "You can now …". */
  ability: string
  topics: string[]
  items: LevelItem[]
  status: 'ready' | 'planned'
}

/** A technical word introduced after its plain-language meaning. */
export interface Term {
  name: string
  plain: string
}

export interface Analogy {
  text: string
  /** Where the analogy stops being accurate. */
  limit: string
}

export type WidgetId =
  | 'flow-loop'
  | 'ac-dc'
  | 'battery-stack'
  | 'ground-probe'
  | 'safety-sort'
  | 'color-bands'
  | 'led-legs'
  | 'signal-scope'
  | 'logic-threshold'
  | 'divider'
  | 'pot-knob'
  | 'pin-finder'
  | 'code-stepper'
  | 'pwm'

export type LessonStep =
  | {
      kind: 'talk'
      title: string
      body: string[]
      analogy?: Analogy
      term?: Term
    }
  | {
      kind: 'try'
      title: string
      prompt: string
      widget: WidgetId
      widgetProps?: Record<string, unknown>
      /** Event the widget must emit before the learner can continue. */
      goal?: { event: string; label: string }
      /** Shown after the goal is reached: the "why". */
      reveal?: string
    }
  | {
      kind: 'check'
      title: string
      question: string
      options: { text: string; correct: boolean; feedback: string }[]
    }

export interface Lesson {
  id: string
  levelN: number
  hubId: HubId
  title: string
  summary: string
  minutes: number
  xp: number
  steps: LessonStep[]
}

export interface ExperimentStep<G = Goal, K = PartKind> {
  id: string
  title: string
  instruction: string
  hint?: string
  goal: G
  /** Parts the learner can add from the tray during this step. */
  tray: K[]
  /** Shown once the goal is met. */
  explain?: { title: string; body: string; term?: Term }
}

interface ExperimentBase {
  id: string
  number: number
  levelN: number
  title: string
  summary: string
  /** Concepts this experiment prepares you for. */
  leadsTo: string
  xp: number
  status: 'ready' | 'planned'
}

/** Runs on the Circuit Lab bench: batteries, resistors, LEDs and switches. */
export interface CircuitExperiment extends ExperimentBase {
  bench?: 'circuit'
  setup: Circuit
  steps: ExperimentStep[]
}

/** Runs on the Microcontroller Lab bench: a board, its pins, and a program. */
export interface MicroExperiment extends ExperimentBase {
  bench: 'micro'
  setup: MicroSetup
  steps: ExperimentStep<MicroGoal, MicroPartKind>[]
}

export type Experiment = CircuitExperiment | MicroExperiment

export interface CatalogComponent {
  id: string
  name: string
  /** Technical name, introduced after the plain one. */
  technical: string
  group: 'power' | 'passive' | 'semiconductor' | 'switching' | 'connection' | 'protection' | 'computing'
  /** What is it? */
  what: string
  /** What does it do? */
  does: string
  /** Why do we need it? */
  why: string
  /** Where is it used? */
  where: string[]
  analogy?: Analogy
  /** Clickable features on the 3D model. */
  hotspots: { id: string; label: string; detail: string; position: [number, number, number] }[]
  /** Level at which this component joins your collection. */
  unlockLevel: number
  /** A playable link, if any. */
  tryIt?: { label: string; to: string }
  symbol:
    | 'battery'
    | 'resistor'
    | 'led'
    | 'capacitor'
    | 'diode'
    | 'npn'
    | 'mosfet'
    | 'relay'
    | 'connector'
    | 'fuse'
    | 'regulator'
    | 'switch'
    | 'button'
    | 'potentiometer'
    | 'mcu'
}

export interface CapstoneStage {
  n: number
  title: string
  question: string
  description: string
  learnedIn: number[]
}

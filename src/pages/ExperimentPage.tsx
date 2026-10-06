import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LabWorkspace } from '../circuit/LabWorkspace'
import { useCircuit } from '../circuit/useCircuit'
import { EXPERIMENT_BY_ID, HUB_BY_ID, LEVEL_BY_N } from '../content'
import type { CircuitExperiment, Experiment, MicroExperiment, RobotExperiment } from '../content/types'
import { emptyMicroHistory, freshObservations, microGoalMet, updateMicroHistory, type MicroHistory } from '../micro/goals'
import { MicroWorkspace } from '../micro/MicroWorkspace'
import { useMicro } from '../micro/useMicro'
import { robotGoalMet } from '../robot/goals'
import { RobotWorkspace } from '../robot/RobotWorkspace'
import { useRobot } from '../robot/useRobot'
import { isLevelComplete, isLevelUnlocked, nextAction } from '../lib/progression'
import { emptyHistory, goalMet, updateHistory, type GoalHistory } from '../sim/goals'
import { formatAmps } from '../sim/parts'
import { useProgress } from '../store/progress'
import { usePeeking } from '../store/peek'
import { PageHeader, useSnapshot } from '../ui/Layout'
import { Button, LinkButton, TermCard } from '../ui/primitives'
import { NotFoundBlock } from './LessonPage'
import { LockedNotice } from './LockedNotice'

export function ExperimentPage() {
  const { id = '' } = useParams()
  const exp = EXPERIMENT_BY_ID[id]
  if (!exp) return <NotFoundBlock what="experiment" />
  if (exp.status !== 'ready') return <PlannedExperiment exp={exp} />
  if (exp.bench === 'micro') return <MicroExperimentRunner key={exp.id} exp={exp} />
  if (exp.bench === 'robot') return <RobotExperimentRunner key={exp.id} exp={exp} />
  return <ExperimentRunner key={exp.id} exp={exp} />
}

const num = (n: number) => String(n).padStart(2, '0')

/** Which lab an experiment's bench belongs to. */
const benchHub = (exp: Experiment) => (exp.bench === 'circuit' || !exp.bench ? HUB_BY_ID.circuits : HUB_BY_ID[LEVEL_BY_N[exp.levelN].hubId])

/** Step bookkeeping shared by every kind of bench. */
function useSteps(exp: Experiment) {
  const complete = useProgress((s) => s.complete)
  const [stepIdx, setStepIdx] = useState(0)
  const finished = stepIdx >= exp.steps.length

  useEffect(() => {
    if (finished) complete(`experiment:${exp.id}`, exp.xp)
  }, [finished, complete, exp])

  return { stepIdx, current: Math.min(stepIdx, exp.steps.length - 1), finished, next: () => setStepIdx((i) => i + 1) }
}

/** Once a step's goal has been reached it stays reached, even if the bench changes afterwards. */
function useStepGoal(stepIdx: number, finished: boolean, metNow: boolean) {
  const [metSteps, setMetSteps] = useState<Set<number>>(new Set())
  const met = metSteps.has(stepIdx) || (!finished && metNow)
  useEffect(() => {
    if (met && !metSteps.has(stepIdx)) setMetSteps((s) => new Set(s).add(stepIdx))
  }, [met, metSteps, stepIdx])
  return met
}

/** Header + lock check around any experiment bench. */
function ExperimentFrame({ exp, finished, children }: { exp: Experiment; finished: boolean; children: ReactNode }) {
  const snap = useSnapshot()
  const [peek, setPeek] = usePeeking(exp.levelN)
  const hub = benchHub(exp)
  const level = LEVEL_BY_N[exp.levelN]
  const header = (
    <PageHeader
      crumbs={[{ label: hub.name, to: `/hub/${hub.id}` }, { label: `Level ${level.n}`, to: '/map' }, { label: `Experiment ${num(exp.number)}` }]}
      title={`Experiment ${num(exp.number)}: ${exp.title}`}
      learning={exp.summary}
      icon={hub.icon}
      accent={hub.color}
      hideNext={!finished}
    />
  )
  if (!isLevelUnlocked(exp.levelN, snap) && !peek) {
    return (
      <>
        {header}
        <LockedNotice levelN={exp.levelN} onPeek={setPeek} />
      </>
    )
  }
  return (
    <div className="pb-16">
      {header}
      <div className="mx-auto max-w-[1400px] px-4 pt-5">{children}</div>
    </div>
  )
}

function FinishedPanel({ exp, freeBuild }: { exp: Experiment; freeBuild: { to: string; label: string } }) {
  const snap = useSnapshot()
  const navigate = useNavigate()
  const level = LEVEL_BY_N[exp.levelN]
  const next = nextAction(snap)
  const levelDone = isLevelComplete(level, snap)
  return (
    <div className="panel-strong rise-in p-5">
      <div className="text-3xl" aria-hidden>
        {levelDone ? '🔓' : '🧪'}
      </div>
      <h3 className="mt-2 text-lg font-semibold text-fog-100">Experiment {num(exp.number)} complete</h3>
      <p className="font-mono text-sm text-volt">+{exp.xp} XP</p>
      <p className="mt-3 text-sm text-fog-300">
        <span className="font-semibold text-fog-100">Why this matters: </span>
        {exp.leadsTo}
      </p>
      {levelDone && (
        <p className="mt-3 text-sm text-fog-200">
          <span className="font-semibold text-ok">New ability: </span>
          {level.ability}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => navigate(next.to)}>
          {next.title} →
        </Button>
        <LinkButton to={freeBuild.to}>{freeBuild.label}</LinkButton>
      </div>
    </div>
  )
}

function StepPanel({
  exp,
  stepIdx,
  met,
  onNext,
  children,
}: {
  exp: Experiment
  stepIdx: number
  met: boolean
  onNext: () => void
  /** Extra step-specific content, shown under the instructions. */
  children?: ReactNode
}) {
  const [showHint, setShowHint] = useState(false)
  const step = exp.steps[stepIdx]
  const isAck = step.goal.type === 'acknowledge'
  const canAdvance = isAck || met
  return (
    <div className="panel-strong p-4">
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-fog-400">
        <span>
          Step {stepIdx + 1} of {exp.steps.length}
        </span>
        <span className="flex gap-1">
          {exp.steps.map((_, i) => (
            <span key={i} className={`h-1.5 w-6 rounded-full ${i < stepIdx || (i === stepIdx && met) ? 'bg-ok' : i === stepIdx ? 'bg-volt' : 'bg-ink-600'}`} />
          ))}
        </span>
      </div>
      <h3 className="mt-2 text-lg font-semibold text-fog-100">{step.title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-fog-200">{step.instruction}</p>
      {step.hint && (
        <div className="mt-2">
          {showHint ? (
            <p className="rounded-lg bg-ink-800 px-3 py-2 text-xs text-fog-300">💡 {step.hint}</p>
          ) : (
            <button className="text-xs text-flow hover:underline" onClick={() => setShowHint(true)}>
              Need a hint?
            </button>
          )}
        </div>
      )}
      {children}
      {!isAck && (
        <div className={`mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${met ? 'border-ok/50 bg-ok/10 text-ok' : 'border-ink-600 text-fog-400'}`}>
          <span aria-hidden>{met ? '✓' : '○'}</span>
          {met ? 'Goal reached' : 'Waiting for you to try it…'}
        </div>
      )}
      {(met || isAck) && step.explain && (
        <div className="rise-in mt-3 space-y-2 rounded-xl border border-volt/30 bg-volt/5 p-3">
          <div className="font-semibold text-volt">{step.explain.title}</div>
          <p className="text-sm text-fog-200">{step.explain.body}</p>
          {step.explain.term && <TermCard term={step.explain.term} />}
        </div>
      )}
      <div className="mt-4 flex justify-end">
        <Button
          variant="primary"
          disabled={!canAdvance}
          onClick={() => {
            setShowHint(false)
            onNext()
          }}
        >
          {stepIdx === exp.steps.length - 1 ? 'Finish experiment' : 'Next step'} →
        </Button>
      </div>
    </div>
  )
}

function ExperimentRunner({ exp }: { exp: CircuitExperiment }) {
  const api = useCircuit(exp.setup)
  const { stepIdx, current, finished, next } = useSteps(exp)
  const [history, setHistory] = useState<GoalHistory>(emptyHistory)
  const step = exp.steps[current]

  useEffect(() => {
    setHistory((h) => updateHistory(h, api.circuit, api.sim))
  }, [api.circuit, api.sim])

  const met = useStepGoal(stepIdx, finished, goalMet(step.goal, api.circuit, api.sim, history))

  const side = finished ? (
    <FinishedPanel exp={exp} freeBuild={{ to: '/lab/sandbox', label: 'Free build' }} />
  ) : (
    <StepPanel key={stepIdx} exp={exp} stepIdx={stepIdx} met={met} onNext={next}>
      {step.id === 'compare' && history.peakLedCurrent > 0 && <BeforeAfter before={history.peakLedCurrent} after={history.lastLedCurrent} />}
    </StepPanel>
  )

  return (
    <ExperimentFrame exp={exp} finished={finished}>
      <LabWorkspace api={api} tray={finished ? ['resistor', 'led', 'switch', 'button'] : step.tray} side={side} onReset={() => api.reset(exp.setup)} />
    </ExperimentFrame>
  )
}

function MicroExperimentRunner({ exp }: { exp: MicroExperiment }) {
  const api = useMicro(exp.setup)
  const { stepIdx, current, finished, next } = useSteps(exp)
  const [history, setHistory] = useState<MicroHistory>(emptyMicroHistory)
  const step = exp.steps[current]

  useEffect(() => {
    setHistory((h) => updateMicroHistory(h, api.circuit, api.inputs, api.frame))
  }, [api.circuit, api.inputs, api.frame])

  // What the LED did with old code, or in an earlier step, doesn't count as evidence now.
  useEffect(() => {
    setHistory(freshObservations)
  }, [api.uploads, stepIdx])

  const met = useStepGoal(stepIdx, finished, microGoalMet(step.goal, api.circuit, api.inputs, api.frame, history))

  const side = finished ? (
    <FinishedPanel exp={exp} freeBuild={{ to: `/hub/${LEVEL_BY_N[exp.levelN].hubId}`, label: 'Free play' }} />
  ) : (
    <StepPanel key={stepIdx} exp={exp} stepIdx={stepIdx} met={met} onNext={next} />
  )

  return (
    <ExperimentFrame exp={exp} finished={finished}>
      <MicroWorkspace
        api={api}
        tray={finished ? ['resistor'] : step.tray}
        side={side}
        onReset={() => {
          api.reset()
          setHistory(emptyMicroHistory())
        }}
      />
    </ExperimentFrame>
  )
}

function RobotExperimentRunner({ exp }: { exp: RobotExperiment }) {
  const api = useRobot(exp.setup)
  const { stepIdx, current, finished, next } = useSteps(exp)
  const step = exp.steps[current]
  const met = useStepGoal(stepIdx, finished, robotGoalMet(step.goal, api.tick.state, api.arena.id))

  const side = finished ? (
    <FinishedPanel exp={exp} freeBuild={{ to: `/hub/${LEVEL_BY_N[exp.levelN].hubId}`, label: 'Free play' }} />
  ) : (
    <StepPanel key={stepIdx} exp={exp} stepIdx={stepIdx} met={met} onNext={next} />
  )

  return (
    <ExperimentFrame exp={exp} finished={finished}>
      <RobotWorkspace api={api} side={side} onReset={api.reset} />
    </ExperimentFrame>
  )
}

function BeforeAfter({ before, after }: { before: number; after: number }) {
  const max = Math.max(before, after, 0.001)
  const rows = [
    { label: 'No resistor', value: before, color: 'var(--color-danger)' },
    { label: 'With resistor', value: after, color: 'var(--color-ok)' },
  ]
  return (
    <div className="mt-3 rounded-xl border border-ink-600 bg-ink-900 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-fog-400">LED current: before vs. after</div>
      <div className="mt-2 space-y-2">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex justify-between text-xs text-fog-300">
              <span>{r.label}</span>
              <span className="font-mono">{formatAmps(r.value)}</span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-ink-700">
              <div className="h-full rounded-full" style={{ width: `${Math.max(1.5, (r.value / max) * 100)}%`, background: r.color }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-fog-400">The safe zone for an LED is about 5–20 mA, a tiny sliver of that top bar.</p>
    </div>
  )
}

function PlannedExperiment({ exp }: { exp: Experiment }) {
  const level = LEVEL_BY_N[exp.levelN]
  const hub = HUB_BY_ID[level.hubId]
  return (
    <>
      <PageHeader crumbs={[{ label: hub.name, to: `/hub/${hub.id}` }, { label: `Experiment ${num(exp.number)}` }]} title={`Experiment ${num(exp.number)}: ${exp.title}`} learning={exp.summary} icon="🚧" />
      <div className="mx-auto max-w-lg px-4 py-14 text-center">
        <p className="text-fog-200">This experiment is part of Level {level.n}: {level.title}, which is still being built.</p>
        <p className="mt-2 text-sm text-fog-400">It will teach you: {exp.leadsTo}</p>
        <div className="mt-6">
          <LinkButton to={`/hub/${hub.id}`} variant="primary">
            Preview the {hub.name}
          </LinkButton>
        </div>
      </div>
    </>
  )
}

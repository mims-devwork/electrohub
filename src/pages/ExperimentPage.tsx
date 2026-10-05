import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LabWorkspace } from '../circuit/LabWorkspace'
import { useCircuit } from '../circuit/useCircuit'
import { EXPERIMENT_BY_ID, HUB_BY_ID, LEVEL_BY_N } from '../content'
import type { Experiment } from '../content/types'
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
  return <ExperimentRunner key={exp.id} exp={exp} />
}

const num = (n: number) => String(n).padStart(2, '0')

function ExperimentRunner({ exp }: { exp: Experiment }) {
  const snap = useSnapshot()
  const complete = useProgress((s) => s.complete)
  const navigate = useNavigate()
  const api = useCircuit(exp.setup)
  const [stepIdx, setStepIdx] = useState(0)
  const [metSteps, setMetSteps] = useState<Set<number>>(new Set())
  const [history, setHistory] = useState<GoalHistory>(emptyHistory)
  const [showHint, setShowHint] = useState(false)
  const [peek, setPeek] = usePeeking(exp.levelN)
  const hub = HUB_BY_ID.circuits
  const level = LEVEL_BY_N[exp.levelN]
  const finished = stepIdx >= exp.steps.length
  const step = exp.steps[Math.min(stepIdx, exp.steps.length - 1)]

  useEffect(() => {
    setHistory((h) => updateHistory(h, api.circuit, api.sim))
  }, [api.circuit, api.sim])

  const met = metSteps.has(stepIdx) || (!finished && goalMet(step.goal, api.circuit, api.sim, history))
  useEffect(() => {
    if (met && !metSteps.has(stepIdx)) setMetSteps((s) => new Set(s).add(stepIdx))
  }, [met, metSteps, stepIdx])

  useEffect(() => {
    if (finished) complete(`experiment:${exp.id}`, exp.xp)
  }, [finished, complete, exp])

  const header = (
    <PageHeader
      crumbs={[{ label: hub.name, to: '/hub/circuits' }, { label: `Level ${level.n}`, to: '/map' }, { label: `Experiment ${num(exp.number)}` }]}
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

  const isAck = step.goal.type === 'acknowledge'
  const canAdvance = isAck || met
  const next = nextAction(snap)
  const levelDone = isLevelComplete(level, snap)

  const side = finished ? (
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
        <LinkButton to="/lab/sandbox">Free build</LinkButton>
      </div>
    </div>
  ) : (
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
      {step.id === 'compare' && history.peakLedCurrent > 0 && <BeforeAfter before={history.peakLedCurrent} after={history.lastLedCurrent} />}
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
            setStepIdx((i) => i + 1)
          }}
        >
          {stepIdx === exp.steps.length - 1 ? 'Finish experiment' : 'Next step'} →
        </Button>
      </div>
    </div>
  )

  return (
    <div className="pb-16">
      {header}
      <div className="mx-auto max-w-[1400px] px-4 pt-5">
        <LabWorkspace api={api} tray={finished ? ['resistor', 'led', 'switch', 'button'] : step.tray} side={side} onReset={() => api.reset(exp.setup)} />
      </div>
    </div>
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

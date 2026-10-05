import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { HUB_BY_ID, LESSON_BY_ID, LEVEL_BY_N } from '../content'
import type { Lesson, LessonStep } from '../content/types'
import { isLevelComplete, isLevelUnlocked, nextAction } from '../lib/progression'
import { useProgress } from '../store/progress'
import { usePeeking } from '../store/peek'
import { PageHeader, useSnapshot } from '../ui/Layout'
import { AnalogyCard, Button, LinkButton, TermCard } from '../ui/primitives'
import { WIDGETS } from '../widgets/registry'
import { LockedNotice } from './LockedNotice'

export function LessonPage() {
  const { id = '' } = useParams()
  const lesson = LESSON_BY_ID[id]
  if (!lesson) return <NotFoundBlock what="lesson" />
  return <LessonPlayer key={lesson.id} lesson={lesson} />
}

function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const snap = useSnapshot()
  const complete = useProgress((s) => s.complete)
  const level = LEVEL_BY_N[lesson.levelN]
  const hub = HUB_BY_ID[lesson.hubId]
  const [stepIdx, setStepIdx] = useState(0)
  const [peek, setPeek] = usePeeking(lesson.levelN)
  const done = stepIdx >= lesson.steps.length
  const alreadyDone = snap.completed.includes(`lesson:${lesson.id}`)

  useEffect(() => {
    if (done) complete(`lesson:${lesson.id}`, lesson.xp)
  }, [done, complete, lesson])

  const unlocked = isLevelUnlocked(lesson.levelN, snap)
  const header = (
    <PageHeader
      crumbs={[{ label: hub.name, to: `/hub/${hub.id}` }, { label: `Level ${level.n}`, to: '/map' }, { label: lesson.title }]}
      title={lesson.title}
      learning={lesson.summary}
      icon={hub.icon}
      accent={hub.color}
      hideNext={!done}
    />
  )

  if (!unlocked && !peek) {
    return (
      <>
        {header}
        <LockedNotice levelN={lesson.levelN} onPeek={setPeek} />
      </>
    )
  }

  const step = lesson.steps[stepIdx]
  const wide = step?.kind === 'try'

  return (
    <div className="pb-16">
      {header}
      <div className={`mx-auto px-4 pt-6 ${wide ? 'max-w-5xl' : 'max-w-3xl'}`}>
        <StepDots total={lesson.steps.length} current={stepIdx} onJump={(i) => (i < stepIdx || alreadyDone) && setStepIdx(i)} />
        {done ? (
          <LessonComplete lesson={lesson} />
        ) : (
          <StepView key={stepIdx} step={step} onNext={() => setStepIdx((i) => i + 1)} onBack={stepIdx > 0 ? () => setStepIdx((i) => i - 1) : undefined} />
        )}
      </div>
    </div>
  )
}

function StepDots({ total, current, onJump }: { total: number; current: number; onJump: (i: number) => void }) {
  return (
    <div className="mb-5 flex items-center gap-1.5" aria-label={`Step ${Math.min(current + 1, total)} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          onClick={() => onJump(i)}
          className={`h-1.5 flex-1 rounded-full transition-colors ${i < current ? 'bg-volt' : i === current ? 'bg-volt/60' : 'bg-ink-700'}`}
          aria-label={`Step ${i + 1}`}
        />
      ))}
    </div>
  )
}

function StepView({ step, onNext, onBack }: { step: LessonStep; onNext: () => void; onBack?: () => void }) {
  const [goalMet, setGoalMet] = useState(false)
  const [picked, setPicked] = useState<number | null>(null)

  const goalEvent = step.kind === 'try' ? step.goal?.event : undefined
  const onEvent = useCallback(
    (e: string) => {
      if (goalEvent && e === goalEvent) setGoalMet(true)
    },
    [goalEvent],
  )

  const canContinue = step.kind === 'talk' || (step.kind === 'try' && (!step.goal || goalMet)) || (step.kind === 'check' && picked !== null && step.options[picked].correct)

  return (
    <div className="rise-in space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight text-fog-100">{step.title}</h2>

      {step.kind === 'talk' && (
        <>
          <div className="space-y-3 text-[15px] leading-relaxed text-fog-200">
            {step.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          {step.analogy && <AnalogyCard analogy={step.analogy} />}
          {step.term && <TermCard term={step.term} />}
        </>
      )}

      {step.kind === 'try' &&
        (() => {
          const Widget = WIDGETS[step.widget]
          return (
            <>
              <p className="text-[15px] text-fog-200">{step.prompt}</p>
              <Widget onEvent={onEvent} props={step.widgetProps} />
              {step.goal && (
                <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${goalMet ? 'border-ok/50 bg-ok/10 text-ok' : 'border-ink-600 text-fog-300'}`}>
                  <span aria-hidden>{goalMet ? '✓' : '○'}</span>
                  {step.goal.label}
                </div>
              )}
              {goalMet && step.reveal && (
                <div className="rise-in rounded-xl border border-volt/30 bg-volt/5 px-4 py-3 text-[15px] text-fog-100">
                  <span className="font-semibold text-volt">What just happened: </span>
                  {step.reveal}
                </div>
              )}
            </>
          )
        })()}

      {step.kind === 'check' && (
        <>
          <p className="text-[15px] text-fog-200">{step.question}</p>
          <div className="space-y-2">
            {step.options.map((o, i) => {
              const chosen = picked === i
              return (
                <button
                  key={i}
                  onClick={() => setPicked(i)}
                  className={`block w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                    chosen ? (o.correct ? 'border-ok bg-ok/10 text-fog-100' : 'border-danger bg-danger/10 text-fog-100 shake') : 'border-ink-600 bg-ink-900 text-fog-200 hover:border-fog-400'
                  }`}
                >
                  {o.text}
                  {chosen && <div className={`mt-1.5 text-xs ${o.correct ? 'text-ok' : 'text-rose-200'}`}>{o.feedback}</div>}
                </button>
              )
            })}
          </div>
        </>
      )}

      <div className="flex items-center justify-between pt-2">
        {onBack ? (
          <Button variant="ghost" onClick={onBack}>
            ← Back
          </Button>
        ) : (
          <span />
        )}
        <Button variant="primary" onClick={onNext} disabled={!canContinue}>
          Continue →
        </Button>
      </div>
    </div>
  )
}

function LessonComplete({ lesson }: { lesson: Lesson }) {
  const snap = useSnapshot()
  const navigate = useNavigate()
  const level = LEVEL_BY_N[lesson.levelN]
  const levelDone = isLevelComplete(level, snap)
  const next = nextAction(snap)
  return (
    <div className="rise-in panel-strong p-6 text-center">
      <div className="text-4xl" aria-hidden>
        {levelDone ? '🔓' : '✓'}
      </div>
      <h2 className="mt-2 text-2xl font-semibold text-fog-100">{levelDone ? `Level ${level.n} complete!` : 'Lesson complete'}</h2>
      <p className="mt-1 font-mono text-sm text-volt">+{lesson.xp} XP</p>
      {levelDone && (
        <p className="mx-auto mt-3 max-w-md text-fog-200">
          <span className="font-semibold text-fog-100">New ability: </span>
          {level.ability}
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button variant="primary" onClick={() => navigate(next.to)}>
          Next: {next.title} →
        </Button>
        <LinkButton to="/map">Learning map</LinkButton>
      </div>
    </div>
  )
}

export function NotFoundBlock({ what }: { what: string }) {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="text-fog-300">That {what} doesn’t exist (yet).</p>
      <Link to="/map" className="mt-3 inline-block text-flow hover:underline">
        Back to the learning map
      </Link>
    </div>
  )
}

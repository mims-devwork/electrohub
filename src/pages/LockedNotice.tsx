import { LEVEL_BY_N } from '../content'
import { nextAction } from '../lib/progression'
import { useSnapshot } from '../ui/Layout'
import { Button, LinkButton } from '../ui/primitives'

export function LockedNotice({ levelN, onPeek }: { levelN: number; onPeek?: () => void }) {
  const snap = useSnapshot()
  const prev = LEVEL_BY_N[levelN - 1]
  const next = nextAction(snap)
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="text-4xl" aria-hidden>
        🔒
      </div>
      <h2 className="mt-3 text-xl font-semibold text-fog-100">This unlocks at Level {levelN}</h2>
      <p className="mt-2 text-fog-300">
        It builds on ideas from Level {prev?.n}: <span className="text-fog-100">{prev?.title}</span>. Finish that first and this opens up.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <LinkButton to={next.to} variant="primary">
          Continue: {next.title}
        </LinkButton>
        {onPeek && (
          <Button variant="ghost" onClick={onPeek}>
            Peek anyway
          </Button>
        )}
      </div>
    </div>
  )
}
